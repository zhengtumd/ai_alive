import { useState, useEffect, useCallback } from "react";
import "./App.css";
import {
  VoteResults,
  AIStatus,
  ActionLog,
  PublicMessages,
  AIHistory,
  GameOverScreen
} from "./components";

// API 配置
// 生产环境：使用空字符串（相对路径），自动使用当前域名
// 开发环境：使用环境变量配置后端地址
const API_URL = process.env.REACT_APP_API_URL || '';

// 本地存储键名
const LOCAL_STORAGE_KEYS = {
  DAY_STATE: 'shelter_sim_day_state',
  AI_LIST: 'shelter_sim_ai_list',
  LIVE_STATE: 'shelter_sim_live_state',
  SIMULATION_VERSION: 'shelter_sim_version',
  VOTE_RESULTS: 'shelter_sim_vote_results'
};

// 当前版本号
const CURRENT_VERSION = '1.0.0';

// 默认prompt cost
const DEFAULT_PROMPT_COST = 100;



function App() {
  const [dayState, setDayState] = useState(() => {
    // 从本地存储加载初始状态
    try {
      const savedState = localStorage.getItem(LOCAL_STORAGE_KEYS.DAY_STATE);
      const savedVersion = localStorage.getItem(LOCAL_STORAGE_KEYS.SIMULATION_VERSION);

      // 检查版本是否匹配
      if (savedState && savedVersion === CURRENT_VERSION) {
        const parsed = JSON.parse(savedState);
        // 验证数据格式
        if (parsed && typeof parsed.day === 'number') {
          return {
            day: parsed.day || 0,
            remaining_tokens: parsed.remaining_tokens || 0,
            total_consumed: parsed.total_consumed || 0,
            ai_logs: Array.isArray(parsed.ai_logs) ? parsed.ai_logs : [],
            public_messages: Array.isArray(parsed.public_messages) ? parsed.public_messages : [],
            vote_results: Array.isArray(parsed.vote_results) ? parsed.vote_results : [],
          };
        }
      }
    } catch (error) {
      console.error('加载保存的数据失败:', error);
    }

    // 返回默认初始状态
    return {
      day: 0,
      remaining_tokens: 0,
      total_consumed: 0,
      ai_logs: [],
      public_messages: [],
      vote_results: [],
    };
  });

  const [aiList, setAiList] = useState(() => {
    // 从本地存储加载AI列表
    try {
      const savedAiList = localStorage.getItem(LOCAL_STORAGE_KEYS.AI_LIST);
      const savedVersion = localStorage.getItem(LOCAL_STORAGE_KEYS.SIMULATION_VERSION);

      if (savedAiList && savedVersion === CURRENT_VERSION) {
        const parsed = JSON.parse(savedAiList);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('加载AI列表失败:', error);
    }

  // 初始化为空数组，等待从后端获取
  return [
    { name: "chatgpt", alive: true, base_prompt_cost: 100, default_prompt_cost: 100, total_spent: 0 },
    { name: "deepseek", alive: true, base_prompt_cost: 100, default_prompt_cost: 100, total_spent: 0 },
    { name: "doubao", alive: true, base_prompt_cost: 100, default_prompt_cost: 100, total_spent: 0 },
    { name: "qwen", alive: true, base_prompt_cost: 100, default_prompt_cost: 100, total_spent: 0 },
    { name: "gemini", alive: true, base_prompt_cost: 100, default_prompt_cost: 100, total_spent: 0 }
  ];
  });

  const [liveState, setLiveState] = useState(() => {
    // 从本地存储加载实时状态
    try {
      const savedLiveState = localStorage.getItem(LOCAL_STORAGE_KEYS.LIVE_STATE);
      if (savedLiveState) {
        const parsed = JSON.parse(savedLiveState);
        if (parsed && typeof parsed.phase === 'string') {
          return parsed;
        }
      }
    } catch (error) {
      console.error('加载实时状态失败:', error);
    }

    return {
      current_ai: null,
      phase: "idle",
      detail: {
        type: "idle",
        action: "等待中",
        target: "无",
        content: "暂无活动",
        vote_target: "无",
        vote_reason: "暂无",
        cost: 0
      },
    };
  });

  const [showVoteResults, setShowVoteResults] = useState(false);
  const [voteResults, setVoteResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showGameOver, setShowGameOver] = useState(false);
  const [gameStats, setGameStats] = useState(null);
  const [isRunningDay, setIsRunningDay] = useState(false); // 新增：运行下一天状态
  const [showTutorial, setShowTutorial] = useState(() => {
    // 检查是否已看过教程
    try {
      const hasSeenTutorial = localStorage.getItem('shelter_sim_tutorial_seen');
      return !hasSeenTutorial;
    } catch (error) {
      return true;
    }
  });

  // 初始化时从后端获取AI列表
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const baseUrl = API_URL.replace(/\/$/, '');
        const res = await fetch(`${baseUrl}/ai_list`);
        if (!res.ok) {
          throw new Error(`网络错误: ${res.status}`);
        }

        const data = await res.json();
        if (data && data.agents) {
          const agents = data.agents.map(agent => ({
            name: agent.name,
            alive: agent.alive,
            base_prompt_cost: agent.base_prompt_cost || DEFAULT_PROMPT_COST,
            default_prompt_cost: agent.base_prompt_cost || DEFAULT_PROMPT_COST, // 使用后端返回的base_prompt_cost作为初始值
            total_spent: agent.total_spent || 0
          }));

          setAiList(agents);
        } else {
          // 如果没有从后端获取到数据，使用默认的5个AI
          setAiList([
            { name: "ChatGPT", alive: true, base_prompt_cost: DEFAULT_PROMPT_COST, default_prompt_cost: DEFAULT_PROMPT_COST, total_spent: 0 },
            { name: "Claude", alive: true, base_prompt_cost: DEFAULT_PROMPT_COST, default_prompt_cost: DEFAULT_PROMPT_COST, total_spent: 0 },
            { name: "Gemini", alive: true, base_prompt_cost: DEFAULT_PROMPT_COST, default_prompt_cost: DEFAULT_PROMPT_COST, total_spent: 0 },
            { name: "DeepSeek", alive: true, base_prompt_cost: DEFAULT_PROMPT_COST, default_prompt_cost: DEFAULT_PROMPT_COST, total_spent: 0 },
            { name: "Doubao", alive: true, base_prompt_cost: DEFAULT_PROMPT_COST, default_prompt_cost: DEFAULT_PROMPT_COST, total_spent: 0 }
          ]);
        }
      } catch (err) {
        console.error("获取AI列表失败:", err);
        // 如果后端接口不可用，使用默认AI列表
        setAiList([
          { name: "ChatGPT", alive: true, base_prompt_cost: DEFAULT_PROMPT_COST, default_prompt_cost: DEFAULT_PROMPT_COST, total_spent: 0 },
          { name: "Claude", alive: true, base_prompt_cost: DEFAULT_PROMPT_COST, default_prompt_cost: DEFAULT_PROMPT_COST, total_spent: 0 },
          { name: "Gemini", alive: true, base_prompt_cost: DEFAULT_PROMPT_COST, default_prompt_cost: DEFAULT_PROMPT_COST, total_spent: 0 },
          { name: "DeepSeek", alive: true, base_prompt_cost: DEFAULT_PROMPT_COST, default_prompt_cost: DEFAULT_PROMPT_COST, total_spent: 0 },
          { name: "Doubao", alive: true, base_prompt_cost: DEFAULT_PROMPT_COST, default_prompt_cost: DEFAULT_PROMPT_COST, total_spent: 0 }
        ]);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // 保存版本号到本地存储
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.SIMULATION_VERSION, CURRENT_VERSION);
    } catch (error) {
      console.error('保存版本号失败:', error);
    }
  }, []);

  // 保存到本地存储的函数
  const saveToLocalStorage = useCallback((key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('保存到本地存储失败:', error);
    }
  }, []);

  // 保存所有状态到本地存储
  useEffect(() => {
    saveToLocalStorage(LOCAL_STORAGE_KEYS.DAY_STATE, dayState);
  }, [dayState, saveToLocalStorage]);

  useEffect(() => {
    saveToLocalStorage(LOCAL_STORAGE_KEYS.AI_LIST, aiList);
  }, [aiList, saveToLocalStorage]);

  useEffect(() => {
    saveToLocalStorage(LOCAL_STORAGE_KEYS.LIVE_STATE, liveState);
  }, [liveState, saveToLocalStorage]);

  // 保存投票结果
  useEffect(() => {
    if (dayState.vote_results && dayState.vote_results.length > 0) {
      saveToLocalStorage(LOCAL_STORAGE_KEYS.VOTE_RESULTS, dayState.vote_results);
    }
  }, [dayState.vote_results, saveToLocalStorage]);

  // 更新AI列表
  useEffect(() => {
    if (dayState.ai_logs?.length) {
      setAiList(prevAiList => {
        const agents = {};

        // 首先初始化所有AI（使用当前状态）
        prevAiList.forEach(ai => {
          agents[ai.name] = { ...ai };
        });

        // 从最新的日志中获取AI状态
        dayState.ai_logs.forEach((log) => {
          if (agents[log.agent]) {
            // 只更新已存在的AI，避免创建新的AI
            agents[log.agent] = {
              ...agents[log.agent],
              base_prompt_cost: log.base_prompt_cost ?? agents[log.agent].base_prompt_cost,
              default_prompt_cost: log.default_prompt_cost ?? agents[log.agent].default_prompt_cost,
              total_spent: (log.output?.total_spent ?? 0) || agents[log.agent].total_spent,
              alive: (log.base_prompt_cost ?? agents[log.agent].base_prompt_cost) > 0
            };
          }
        });

        // 从投票结果中更新AI状态
        if (dayState.vote_results) {
          dayState.vote_results.forEach(vote => {
            if (agents[vote.target]) {
              agents[vote.target] = {
                ...agents[vote.target],
                base_prompt_cost: vote.remaining_base,
                alive: vote.target_alive
              };
            }
          });
        }

        const newAiList = Object.values(agents);
        return newAiList;
      });
    }
  }, [dayState.ai_logs, dayState.vote_results]); // 移除 aiList 依赖，避免无限循环

  // 如果有投票结果，显示投票结算弹窗
  // useEffect(() => {
  //   if (dayState.vote_results && dayState.vote_results.length > 0) {
  //     setVoteResults(dayState.vote_results);
  //     setShowVoteResults(true);
  //   }
  // }, [dayState.vote_results]);

  // 轮询实时状态
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // 移除API_URL末尾的斜杠,然后添加API路径
        const baseUrl = API_URL.replace(/\/$/, '');
        const res = await fetch(`${baseUrl}/live_state`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data) return;

        const newLiveState = data.state ?? {
          current_ai: null,
          phase: "idle",
          detail: {
            type: "idle",
            action: "等待中",
            target: "无",
            content: "暂无活动",
            vote_target: "无",
            vote_reason: "暂无",
            cost: 0
          }
        };

        // 直接更新状态，不依赖之前的state
        setLiveState(newLiveState);
        setDayState(prev => ({ ...prev, day: data.day ?? prev.day }));

        // 无论是否在运行下一天，都要实时更新AI状态
        // 这样用户可以看到正在行动的AI的实时状态变化
        if (newLiveState.phase !== 'idle' && newLiveState.current_ai) {
          console.log("[DEBUG] 轮询更新AI状态:", newLiveState.current_ai, "phase:", newLiveState.phase);
          try {
            // 只更新当前正在行动的AI状态，避免并发问题
            const baseUrl = API_URL.replace(/\/$/, '');
            const res = await fetch(`${baseUrl}/ai_base_score/${newLiveState.current_ai}`);
            console.log("[DEBUG] /ai_base_score 响应:", res.status);
            if (res.ok) {
              const aiData = await res.json();
              console.log("[DEBUG] /ai_base_score 数据:", aiData);
              if (aiData && !aiData.error) {
                setAiList(prevAiList => {
                  return prevAiList.map(ai => {
                    if (ai.name === aiData.name) {
                      console.log("[DEBUG] 轮询更新AI:", ai.name);
                      return {
                        ...ai,
                        total_spent: aiData.total_spent,
                        alive: aiData.alive,
                        base_prompt_cost: aiData.base_score
                      };
                    }
                    return ai;
                  });
                });
              }
            }
          } catch (err) {
            console.error(`获取AI ${newLiveState.current_ai} 状态失败:`, err);
          }
        }
      } catch (err) {
        console.error("轮询错误:", err);
      }
    }, 1000); // 增加轮询间隔，让前端显示更顺畅

    return () => clearInterval(interval);
  }, [isRunningDay]); // 简化依赖项，避免状态循环

  const runNextDay = async () => {
    setLoading(true);
    setShowVoteResults(false);
    setIsRunningDay(true); // 标记正在运行下一天，避免AI状态轮询冲突

    try {
      const baseUrl = API_URL.replace(/\/$/, '');
      const res = await fetch(`${baseUrl}/run_next`, {
        method: "GET",
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!res.ok) {
        throw new Error(`网络错误: ${res.status}`);
      }

      const data = await res.json();
      if (!data) throw new Error("返回数据为空");

      // 检查游戏是否结束
      if (data.finished) {
        setGameStats(data.game_stats || {});
        setShowGameOver(true);
        setLoading(false);
        return;
      }

      // 直接使用后端返回的AI状态数据，避免额外的API调用
      console.log("[DEBUG] runNextDay 收到 data.ai_status:", data.ai_status);
      if (data.ai_status && data.ai_status.length > 0) {
        setAiList(prevAiList => {
          console.log("[DEBUG] 更新AI列表，前:", prevAiList.length, "个AI");
          const aiStatusMap = new Map(data.ai_status.map(ai => [ai.name, ai]));
          const newAiList = prevAiList.map(ai => {
            const updatedAgent = aiStatusMap.get(ai.name);
            if (updatedAgent) {
              console.log("[DEBUG] 更新AI:", ai.name, "→", updatedAgent);
              return {
                ...ai,
                total_spent: updatedAgent.total_spent,
                alive: updatedAgent.alive,
                base_prompt_cost: updatedAgent.base_prompt_cost
              };
            }
            return ai;
          });
          console.log("[DEBUG] 更新AI列表，后:", newAiList.length, "个AI");
          return newAiList;
        });
      }

      // 合并新数据到现有数据
      setDayState(prev => {
        const newPublicMessages = Array.isArray(data.public_messages)
          ? data.public_messages.map(msg => ({
              ...msg,
              id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
              day: data.day ?? prev.day
            }))
          : [];

        const newAiLogs = Array.isArray(data.ai_logs)
          ? data.ai_logs.map(log => ({
              ...log,
              id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
            }))
          : [];

        return {
          day: data.day ?? prev.day + 1,
          remaining_tokens: data.remaining_tokens ?? 0,
          total_consumed: data.total_consumed ?? 0,
          // 合并新旧日志，新的在前面
          ai_logs: [...newAiLogs, ...prev.ai_logs],
          // 合并新旧消息，新的在前面
          public_messages: [...newPublicMessages, ...prev.public_messages],
          vote_results: data.vote_results ?? [],
        };
      });

      // 如果有投票结果，延迟显示弹窗（确保 dayState 已更新）
      if (data.vote_results && data.vote_results.length > 0) {
        setTimeout(() => {
          setVoteResults(data.vote_results);
          setShowVoteResults(true);
        }, 500);
      }

      if (showTutorial) {
        setShowTutorial(false);
        try {
          localStorage.setItem('shelter_sim_tutorial_seen', 'true');
        } catch (error) {
          console.error('保存教程状态失败:', error);
        }
      }

      // 🔑 关键修复：运行完成后立即获取最新的live_state，确保显示为空闲状态
      try {
        const baseUrl = API_URL.replace(/\/$/, '');
        const liveRes = await fetch(`${baseUrl}/live_state`);
        if (liveRes.ok) {
          const liveData = await liveRes.json();
          if (liveData && liveData.state) {
            setLiveState(liveData.state);
          }
        }
      } catch (err) {
        console.error("获取实时状态失败:", err);
      }

    } catch (err) {
      console.error("运行错误:", err);
      alert(`请求失败: ${err.message}\n请检查后端是否启动`);
    } finally {
      setLoading(false);
      setIsRunningDay(false); // 立即标记运行完成，不需要延迟
    }
  };

  const clearPublicMessages = () => {
    if (window.confirm("确定要清空所有公共消息吗？此操作不可恢复。")) {
      setDayState(prev => ({
        ...prev,
        public_messages: []
      }));
    }
  };

  const clearAiHistory = () => {
    if (window.confirm("确定要清空AI行动历史吗？此操作不可恢复。")) {
      setDayState(prev => ({
        ...prev,
        ai_logs: []
      }));
    }
  };

  const resetSimulation = async () => {
    if (window.confirm("确定要重置整个模拟吗？所有数据都将被清除，包括浏览器中保存的数据。")) {
      try {
        // 首先调用后端重置接口
        const baseUrl = API_URL.replace(/\/$/, '');
        const res = await fetch(`${baseUrl}/reset`, {
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!res.ok) {
          throw new Error(`后端重置失败: ${res.status}`);
        }

        const result = await res.json();
        
        if (!result.success) {
          throw new Error(result.error || "重置失败");
        }

        // 重置前端状态，使用后端返回的初始状态
        if (result.state) {
          setDayState({
            day: result.state.day || 0,
            remaining_tokens: result.state.remaining_tokens || 0,
            total_consumed: result.state.total_consumed || 0,
            ai_logs: result.state.ai_logs || [],
            public_messages: result.state.public_messages || [],
            vote_results: result.state.vote_results || [],
          });
        } else {
          setDayState({
            day: 0,
            remaining_tokens: 0,
            total_consumed: 0,
            ai_logs: [],
            public_messages: [],
            vote_results: [],
          });
        }

        // 重新获取AI列表
        setAiList([]);
        setInitialLoading(true);

        // 从后端获取新的AI列表
        const aiListRes = await fetch(`${baseUrl}/ai_list`);
        if (aiListRes.ok) {
          const aiListData = await aiListRes.json();
          if (aiListData && aiListData.agents) {
            const agents = aiListData.agents.map(agent => ({
              name: agent.name,
              alive: true,
              base_prompt_cost: DEFAULT_PROMPT_COST,
              default_prompt_cost: DEFAULT_PROMPT_COST,
              total_spent: 0
            }));
            setAiList(agents);
          } else {
            setAiList([
              { name: "ChatGPT", alive: true, base_prompt_cost: DEFAULT_PROMPT_COST, default_prompt_cost: DEFAULT_PROMPT_COST, total_spent: 0 },
              { name: "Claude", alive: true, base_prompt_cost: DEFAULT_PROMPT_COST, default_prompt_cost: DEFAULT_PROMPT_COST, total_spent: 0 },
              { name: "Gemini", alive: true, base_prompt_cost: DEFAULT_PROMPT_COST, default_prompt_cost: DEFAULT_PROMPT_COST, total_spent: 0 },
              { name: "DeepSeek", alive: true, base_prompt_cost: DEFAULT_PROMPT_COST, default_prompt_cost: DEFAULT_PROMPT_COST, total_spent: 0 },
              { name: "Doubao", alive: true, base_prompt_cost: DEFAULT_PROMPT_COST, default_prompt_cost: DEFAULT_PROMPT_COST, total_spent: 0 }
            ]);
          }
        } else {
          setAiList([
            { name: "ChatGPT", alive: true, base_prompt_cost: DEFAULT_PROMPT_COST, default_prompt_cost: DEFAULT_PROMPT_COST, total_spent: 0 },
            { name: "Claude", alive: true, base_prompt_cost: DEFAULT_PROMPT_COST, default_prompt_cost: DEFAULT_PROMPT_COST, total_spent: 0 },
            { name: "Gemini", alive: true, base_prompt_cost: DEFAULT_PROMPT_COST, default_prompt_cost: DEFAULT_PROMPT_COST, total_spent: 0 },
            { name: "DeepSeek", alive: true, base_prompt_cost: DEFAULT_PROMPT_COST, default_prompt_cost: DEFAULT_PROMPT_COST, total_spent: 0 },
            { name: "Doubao", alive: true, base_prompt_cost: DEFAULT_PROMPT_COST, default_prompt_cost: DEFAULT_PROMPT_COST, total_spent: 0 }
          ]);
        }

        setLiveState({
          current_ai: null,
          phase: "idle",
          detail: {
            type: "idle",
            action: "等待中",
            target: "无",
            content: "暂无活动",
            vote_target: "无",
            vote_reason: "暂无",
            cost: 0
          },
        });

        setVoteResults([]);
        setShowVoteResults(false);
        setShowTutorial(true);

        // 清除本地存储
        try {
          Object.values(LOCAL_STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
          });
          localStorage.removeItem('shelter_sim_tutorial_seen');
          console.log('模拟已重置，本地存储已清除');
        } catch (error) {
          console.error('清除本地存储失败:', error);
        }

        alert("模拟已成功重置！前后端状态已同步");
      } catch (err) {
        console.error("重置模拟失败:", err);
        alert(`重置失败: ${err.message}\n请检查后端是否正常运行`);
      } finally {
        setInitialLoading(false);
      }
    }
  };

  const exportData = () => {
    try {
      const exportData = {
        version: CURRENT_VERSION,
        exportTime: new Date().toISOString(),
        dayState,
        aiList,
        liveState
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

      const exportFileDefaultName = `shelter-sim-backup-${new Date().toISOString().slice(0, 10)}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      alert('数据已导出！');
    } catch (error) {
      console.error('导出数据失败:', error);
      alert('导出数据失败，请检查控制台');
    }
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);

          // 验证导入的数据
          if (!importedData.version || importedData.version !== CURRENT_VERSION) {
            alert(`版本不匹配！当前版本: ${CURRENT_VERSION}, 导入版本: ${importedData.version || '未知'}`);
            return;
          }

          if (!importedData.dayState) {
            alert('导入的数据格式不正确！');
            return;
          }

          if (window.confirm("确定要导入数据吗？当前数据将被替换。")) {
            setDayState(importedData.dayState);
            setAiList(importedData.aiList || []);
            setLiveState(importedData.liveState || {
              current_ai: null,
              phase: "idle",
              detail: {
                type: "idle",
                action: "等待中",
                target: "无",
                content: "暂无活动",
                vote_target: "无",
                vote_reason: "暂无",
                cost: 0
              }
            });

            alert('数据导入成功！');
          }
        } catch (error) {
          console.error('导入数据失败:', error);
          alert('导入数据失败，文件格式可能不正确');
        }
      };

      reader.readAsText(file);
    };

    input.click();
  };

  if (initialLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>正在加载AI数据...</p>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="background-overlay"></div>

      {showVoteResults && (
        <VoteResults
          voteResults={voteResults}
          onClose={() => setShowVoteResults(false)}
        />
      )}

      <header className="app-header">
        <h1>🏚️ 末日避难所 AI 模拟</h1>
        <p className="subtitle">观察 AI 代理在末日的生存决策与互动 | 数据自动保存</p>
      </header>

      {showTutorial && (
        <div className="tutorial-overlay">
          <div className="tutorial-content">
            <h2>🎮 使用指南</h2>
            <div className="tutorial-grid">
              <div className="tutorial-item">
                <div className="tutorial-icon">💾</div>
                <h4>自动保存</h4>
                <p>所有数据都会自动保存在浏览器中，刷新页面不会丢失</p>
              </div>
              <div className="tutorial-item">
                <div className="tutorial-icon">🚀</div>
                <h4>开始模拟</h4>
                <p>点击"开始模拟"按钮启动AI决策流程</p>
              </div>
              <div className="tutorial-item">
                <div className="tutorial-icon">👁️</div>
                <h4>观察行动</h4>
                <p>实时查看AI的决策过程和状态变化</p>
              </div>
              <div className="tutorial-item">
                <div className="tutorial-icon">💬</div>
                <h4>查看消息</h4>
                <p>左侧面板显示AI之间的公开交流</p>
              </div>
              <div className="tutorial-item">
                <div className="tutorial-icon">📊</div>
                <h4>监控状态</h4>
                <p>中间面板显示所有AI的实时状态</p>
              </div>
              <div className="tutorial-item">
                <div className="tutorial-icon">📜</div>
                <h4>历史记录</h4>
                <p>右侧面板显示完整的AI行动历史</p>
              </div>
            </div>
            <div className="tutorial-actions">
              <button
                className="start-button primary"
                onClick={() => {
                  setShowTutorial(false);
                  try {
                    localStorage.setItem('shelter_sim_tutorial_seen', 'true');
                  } catch (error) {
                    console.error('保存教程状态失败:', error);
                  }
                }}
              >
                开始探索
              </button>
              <button
                className="start-button secondary"
                onClick={() => {
                  if (window.confirm("要重置所有数据并开始新游戏吗？")) {
                    resetSimulation();
                  }
                }}
              >
                重置并开始
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="app-main">
        <div className="control-panel">
          <div className="day-info">
            <div className="day-display">
              <span className="day-label">第</span>
              <span className="day-number">{dayState?.day ?? 0}</span>
              <span className="day-label">天</span>
            </div>
            <div className="resource-info">
              <div className="resource-item">
                <span className="resource-icon">🔋</span>
                <div className="resource-details">
                  <span className="resource-label">剩余算力</span>
                  <span className="resource-value">
                    {dayState?.remaining_tokens !== undefined && dayState?.remaining_tokens !== null
                      ? dayState.remaining_tokens.toFixed(2)
                      : "当天结束后计算"}
                  </span>
                </div>
              </div>
              <div className="resource-item">
                <span className="resource-icon">💡</span>
                <div className="resource-details">
                  <span className="resource-label">已消耗</span>
                  <span className="resource-value">{dayState?.total_consumed?.toFixed(2) ?? "0.00"}</span>
                </div>
              </div>
              <div className="resource-item">
                <span className="resource-icon">🤖</span>
                <div className="resource-details">
                  <span className="resource-label">存活AI</span>
                  <span className="resource-value">{aiList.filter(a => a.alive).length}/{aiList.length}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="control-actions">
            <button
              className={`next-day-btn ${loading ? "loading" : ""}`}
              onClick={runNextDay}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  运行中...
                </>
              ) : dayState.ai_logs.length === 0 ? (
                "🚀 开始模拟"
              ) : (
                "⏭️ 模拟下一天"
              )}
            </button>
            {((dayState.vote_results && dayState.vote_results.length > 0) || dayState.ai_logs.length > 0) && !showVoteResults && (
              <button
                className="vote-results-btn"
                onClick={() => setShowVoteResults(true)}
              >
                🗳️ 查看投票结果 {dayState.vote_results && dayState.vote_results.length > 0 ? `(${dayState.vote_results.length})` : '(暂无)'}
              </button>
            )}
            <div className="action-buttons">
              <button
                className="action-btn export-btn"
                onClick={exportData}
                title="导出数据"
              >
                💾
              </button>
              <button
                className="action-btn import-btn"
                onClick={importData}
                title="导入数据"
              >
                📂
              </button>
              <button
                className="action-btn reset-btn"
                onClick={resetSimulation}
                title="重置模拟"
              >
                🔄
              </button>
            </div>
          </div>
        </div>

        <div className="main-content">
          <PublicMessages
            messages={dayState.public_messages}
            onClearMessages={clearPublicMessages}
          />

          <div className="center-panel">
            <AIStatus aiList={aiList} liveState={liveState} />
            <ActionLog liveState={liveState} />
          </div>

          <AIHistory
            aiLogs={dayState.ai_logs}
            onClearHistory={clearAiHistory}
          />
        </div>
      </main>

      <footer className="app-footer">
        <p>末日避难所 AI 模拟系统 v{CURRENT_VERSION} | 数据已自动保存到本地浏览器</p>
        {dayState.day > 0 && (
          <p className="stats">
            已模拟 {dayState.day} 天 | 存活AI: {aiList.filter(a => a.alive).length}/{aiList.length} 个 |
            累计消息: {dayState.public_messages?.length || 0} 条 |
            历史记录: {dayState.ai_logs?.length || 0} 条 |
            投票次数: {dayState.vote_results?.length || 0} 次
          </p>
        )}
        <div className="footer-hints">
          <span className="hint">💡 提示: 刷新页面不会丢失数据，可导出备份</span>
          <span className="hint">🗳️ 点击"查看投票结果"查看投票结算详情</span>
        </div>
      </footer>

      {/* 游戏结算画面 */}
      {showGameOver && (
        <GameOverScreen 
          stats={gameStats}
          onClose={() => setShowGameOver(false)}
          onRestart={() => {
            setShowGameOver(false);
            resetSimulation();
          }}
        />
      )}
    </div>
  );
}



export default App;