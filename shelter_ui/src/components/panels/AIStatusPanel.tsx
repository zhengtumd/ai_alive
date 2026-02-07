import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { AICircleView } from './AICircleView';
import { AIActionInfoStream } from './AIActionInfoStream.tsx';
import useAppStore from '@/stores/appStore';
import { shelterAPI } from '@/services/api';
import {
  getHealthColor,
  getHealthIcon,
  getPersonalityDescription,
  calculateBehaviorScore
} from '@/utils';
import type { AIState, AIBehaviorStats, AIRealtimeState, AIDecision, AIRealTimeDecision } from '@/types';

// 生成占位数据（默认状态）- 移到组件外部
const generatePlaceholderData = () => {
  const placeholderAIs = [
    { name: 'K-47', health: 100, actionPoints: 10, tokenConsumed: 0, alive: true },
    { name: 'X-99', health: 85, actionPoints: 8, tokenConsumed: 120, alive: true },
    { name: 'R-3D', health: 60, actionPoints: 5, tokenConsumed: 280, alive: true },
    { name: 'V-8R', health: 95, actionPoints: 9, tokenConsumed: 75, alive: true },
    { name: 'N-0X', health: 70, actionPoints: 6, tokenConsumed: 190, alive: true },
    { name: 'Z-1N', health: 45, actionPoints: 3, tokenConsumed: 350, alive: true }
  ];

  const mockDecisions: Record<string, AIDecision> = {};
  const mockRealtimeStates: AIRealtimeState[] = placeholderAIs.map(ai => {
    const decision: AIDecision = {
      name: ai.name,
      resourceRequest: Math.floor(Math.random() * 100) + 20,
      actions: [
        { type: ['propose', 'vote', 'private_message', 'do_nothing'][Math.floor(Math.random() * 4)] }
      ],
      thinking: `分析当前状态：核心健康度${ai.health}%，${ai.health < 50 ? '算力资源严重不足，急需补充' : '系统运行稳定'}。决定申请${50}单位算力以维持最优决策能力。`,
      day: 1,
      actionPoints: ai.actionPoints,
    };
    mockDecisions[ai.name] = decision;

    return {
      name: ai.name,
      health: ai.health,
      alive: ai.alive,
      actionPoints: ai.actionPoints,
      currentAction: ai.alive ? (Math.random() > 0.5 ? '深度思考中...' : '执行决策') : undefined,
      thinking: decision.thinking,
      status: ai.alive ? (Math.random() > 0.7 ? 'thinking' : 'idle') : 'dead',
    };
  });

  return { mockDecisions, mockRealtimeStates };
};

// 获取初始占位数据
const initialPlaceholderData = generatePlaceholderData();

// 机器人头像组件（简化版）
const RobotAvatarSmall: React.FC<{ health: number; alive: boolean }> = ({ health, alive }) => {
  const getColor = (health: number) => {
    if (!alive) return '#ef4444';
    if (health >= 80) return '#10b981';
    if (health >= 60) return '#fbbf24';
    if (health >= 40) return '#f97316';
    return '#ef4444';
  };

  const color = getColor(health);

  return (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="none">
      <rect x="6" y="4" width="12" height="10" rx="2" stroke={color} strokeWidth="1.5" fill={`${color}20`} />
      <circle cx="10" cy="8" r="1.5" fill={color} />
      <circle cx="14" cy="8" r="1.5" fill={color} />
      <line x1="12" y1="4" x2="12" y2="2" stroke={color} strokeWidth="1.5" />
      <circle cx="12" cy="2" r="1" fill={color} />
      <rect x="8" y="14" width="8" height="6" rx="1" stroke={color} strokeWidth="1.5" fill={`${color}10`} />
      <circle cx="12" cy="17" r="1.5" fill={color} opacity={alive ? 0.8 : 0.3} />
    </svg>
  );
};

interface AIStatusPanelProps {
  aiList: AIState[];
  behaviorStats: AIBehaviorStats[];
  onAISelect?: (ai: AIState) => void;
  testLiveState?: any; // 测试模式：直接注入liveState数据
}

export const AIStatusPanel: React.FC<AIStatusPanelProps> = ({
  aiList,
  behaviorStats,
  onAISelect,
  testLiveState,
}) => {
  const [selectedAI, setSelectedAI] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'circle' | 'grid'>('circle');
  const store = useAppStore();
  // 优先使用测试数据
  const liveState = testLiveState || store.liveState;
  const { startLivePolling, stopLivePolling, lastRunningState } = store;

  // 使用预生成的占位数据初始化
  const [aiDecisions, setAiDecisions] = useState<Record<string, AIDecision>>(initialPlaceholderData.mockDecisions);
  const [aiRealtimeStates, setAiRealtimeStates] = useState<AIRealtimeState[]>(initialPlaceholderData.mockRealtimeStates);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeActionAI, setActiveActionAI] = useState<string | null>(null);
  const [showActionView, setShowActionView] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);
  const [settlementData, setSettlementData] = useState<any>(null);
  
  // 从 appStore 获取 AI 决策历史和当前周期
  const aiDecisionHistory = useAppStore(state => state.aiDecisionHistory);
  const saveAIDecisionToHistory = useAppStore(state => state.saveAIDecisionToHistory);
  const currentDay = useAppStore(state => state.systemState.day);

  // 自动轮换显示不同AI的决策和行动
  const [currentDisplayAI, setCurrentDisplayAI] = useState<string | null>(null);
  const [rotationIndex, setRotationIndex] = useState(0);

  // 将后端实时状态转换为前端可用的格式 - 必须在useEffect之前声明
  const realtimeStatesFromBackend = useMemo((): AIRealtimeState[] => {
    if (!liveState.current_ai_states || liveState.current_ai_states.length === 0) {
      return aiRealtimeStates; // 如果没有后端数据，使用模拟数据
    }

    console.log('后端实时状态数据:', liveState.current_ai_states);
    console.log('系统运行状态:', liveState.running);
    console.log('后端返回的当前行动AI:', liveState.current_acting_ai);

    return liveState.current_ai_states.map((aiState: AIRealTimeDecision) => {
      // 根据后端的phase字段决定状态，而不是前端自己判断
      let status: 'thinking' | 'acting' | 'idle';
      
      // 优先使用后端返回的phase信息
      if (aiState.phase === 'thinking') {
        status = 'thinking';
      } else if (aiState.phase === 'acting' || aiState.phase === 'executing') {
        // acting 和 executing 都视为行动中
        status = 'acting';
      } else if (liveState.running && aiState.isActing) {
        // 如果后端没有提供phase，但系统正在运行且AI正在行动
        status = aiState.isActing ? 'acting' : 'thinking';
      } else {
        status = 'idle';
      }

      return {
        name: aiState.aiName,
        health: aiState.health,
        alive: aiState.health > 0,
        actionPoints: aiState.actionPoints,
        currentAction: aiState.currentAction,
        thinking: aiState.decision,
        status: status
      };
    });
  }, [liveState, aiRealtimeStates]);

  // 检查是否有AI正在行动 - 改进的判断逻辑
  const hasActiveAction = useMemo(() => {
    // 优先使用后端返回的当前行动AI信息
    if (liveState.current_acting_ai) return true;
    // 其次检查AI状态
    return realtimeStatesFromBackend.some(ai => ai.status === 'acting');
  }, [liveState.current_acting_ai, realtimeStatesFromBackend]);

  // 获取当前主要行动的AI（优先使用后端返回的current_acting_ai）
  const primaryActionAI = useMemo(() => {
    if (!hasActiveAction) return null;
    
    // 优先使用后端明确指定的当前行动AI
    if (liveState.current_acting_ai) {
      return realtimeStatesFromBackend.find(ai => ai.name === liveState.current_acting_ai) || null;
    }
    
    // 如果没有明确指定，使用第一个状态为acting的AI
    return realtimeStatesFromBackend.find(ai => ai.status === 'acting') || null;
  }, [hasActiveAction, realtimeStatesFromBackend, liveState.current_acting_ai]);

  // 启动实时状态轮询
  useEffect(() => {
    startLivePolling();
    return () => {
      stopLivePolling();
    };
  }, [startLivePolling, stopLivePolling]);

  // 监听模拟状态变化，自动控制行动视图显示和记录历史
  useEffect(() => {
    if (liveState.running) {
      setShowActionView(true);
      // 后端会告诉前端当前行动的AI是谁
      if (liveState.current_acting_ai) {
        console.log('后端指定的当前行动AI:', liveState.current_acting_ai);
        setActiveActionAI(liveState.current_acting_ai);
      }
    } else {
      // 模拟结束后，记录历史记录（只在周期真正结束时显示结算，而不是刷新时）
      if (lastRunningState && liveState.current_ai_states && liveState.current_ai_states.length > 0) {
        // 收集结算数据
        const settlementSummary = liveState.current_ai_states.map((aiState: any) => ({
          name: aiState.aiName,
          health: aiState.health,
          resourceRequest: aiState.resourceRequest || 0,
          actions: aiState.actions || [],
          actionPoints: aiState.actionPoints || 0,
          decision: aiState.decision || ''
        }));
        
        setSettlementData({
          day: liveState.day,
          summary: settlementSummary,
          timestamp: Date.now()
        });
        setShowSettlement(true);
        
        // 保存每个AI的决策到历史记录（使用 appStore）
        // 注意：stepSimulation完成后systemState.day已经+1，所以保存历史记录时用day-1
        const historyDay = Math.max(1, liveState.day || 1);
        liveState.current_ai_states.forEach((aiState: any) => {
          // 校准资源申请数据：优先使用liveState中的数据，如果为0则使用aiDecisions中的数据
          let resourceRequest = aiState.resourceRequest || 0;
          if (resourceRequest === 0 && aiDecisions[aiState.aiName]?.resourceRequest) {
            resourceRequest = aiDecisions[aiState.aiName].resourceRequest;
            console.log(`校准 ${aiState.aiName} 的资源申请: ${resourceRequest} (来自aiDecisions)`);
          }
          
          // 使用 appStore 保存决策历史，传入正确的周期号
          saveAIDecisionToHistory(aiState.aiName, {
            thinking: aiState.decision || '',
            actions: aiState.actions || [],
            resourceRequest: resourceRequest,
            actionPoints: aiState.actionPoints || 0
          }, historyDay);
        });
      }
      
      // 延迟关闭行动视图，让用户看到结果
      const timer = setTimeout(() => {
        setShowActionView(false);
        setActiveActionAI(null);
        setCurrentDisplayAI(null);
        setRotationIndex(0);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [liveState.running, liveState.current_acting_ai]);

  // 自动轮换显示不同AI的决策和行动
  useEffect(() => {
    if (liveState.running && realtimeStatesFromBackend.length > 0) {
      const activeAIs = realtimeStatesFromBackend.filter(ai => ai.alive);
      
      if (activeAIs.length > 0) {
        // 每5秒轮换一次
        const rotationTimer = setTimeout(() => {
          setRotationIndex(prev => (prev + 1) % activeAIs.length);
          setCurrentDisplayAI(activeAIs[rotationIndex].name);
        }, 5000);
        
        return () => clearTimeout(rotationTimer);
      }
    }
  }, [liveState.running, realtimeStatesFromBackend, rotationIndex]);

  // 测试模式：构建测试用的实时状态
  const testRealtimeStates = useMemo(() => {
    if (!testLiveState?.current_ai_states) return null;

    return testLiveState.current_ai_states.map((state: any) => ({
      name: state.aiName,
      health: 85,
      alive: true,
      actionPoints: state.actionPoints,
      status: 'acting',
      currentAction: '决策中',
    }));
  }, [testLiveState]);

  // 使用测试数据或真实数据
  const realtimeStatesToUse = testRealtimeStates || realtimeStatesFromBackend;

  // 获取当前要显示的AI
  const displayAI = useMemo(() => {
    // 优先显示主要行动的AI
    if (primaryActionAI) return primaryActionAI;

    // 其次显示自动轮换的AI
    if (currentDisplayAI) {
      return realtimeStatesToUse.find(ai => ai.name === currentDisplayAI) || null;
    }

    // 如果都没有，显示第一个存活的AI
    const activeAIs = realtimeStatesToUse.filter(ai => ai.alive);
    return activeAIs.length > 0 ? activeAIs[0] : null;
  }, [primaryActionAI, currentDisplayAI, realtimeStatesToUse]);

  // 从后端API获取真实的AI决策数据
  useEffect(() => {
    const loadAiDecisions = async () => {
      if (!aiList || aiList.length === 0) return;

      try {
        const response = await shelterAPI.getAllAIDecisions();
        console.log('从后端获取的AI决策数据:', response);

        if (response && response.length > 0) {
          // 将API返回的数据转换为组件需要的格式
          const realDecisions: Record<string, AIDecision> = {};
          response.forEach((decision: AIDecision) => {
            realDecisions[decision.name] = decision;
          });

          // 同时生成实时状态数据
          const realRealtimeStates: AIRealtimeState[] = aiList.map(ai => {
            const decision = realDecisions[ai.name];
            return {
              name: ai.name,
              health: ai.health,
              alive: ai.alive,
              actionPoints: ai.actionPoints,
              currentAction: ai.alive ? '等待中' : undefined,
              thinking: decision?.thinking || '',
              status: ai.alive ? 'idle' : 'dead',
            };
          });

          setAiDecisions(realDecisions);
          setAiRealtimeStates(realRealtimeStates);
          console.log('AI决策数据加载完成:', realDecisions);
        } else {
          console.log('后端暂无AI决策数据，使用默认占位数据');
        }
      } catch (error) {
        console.error('获取AI决策数据时出错:', error);
      }
    };

    loadAiDecisions();
  }, [aiList]);

  const getBehaviorStats = (aiName: string): AIBehaviorStats | undefined => {
    return behaviorStats.find(stats => stats.aiName === aiName);
  };

  const getAIDetails = (ai: AIState) => {
    const stats = getBehaviorStats(ai.name);
    const behaviorScore = stats ? calculateBehaviorScore(stats) : 0;
    
    return {
      behaviorScore,
      personalityDesc: ai.personality ? getPersonalityDescription(ai.personality) : '个性数据未记录',
      activityLevel: stats ? Math.min(stats.totalActions / 10, 100) : 0,
    };
  };

  const handleSelectAI = (name: string) => {
    setSelectedAI(name === selectedAI ? null : name);
    if (name) {
      setModalOpen(true);
      if (onAISelect) {
        const ai = aiList.find(a => a.name === name);
        if (ai) onAISelect(ai);
      }
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedAI(null);
  };

  // 将行动类型转换为中文名称
  const getActionLabel = (actionType: string) => {
    const actionLabels: Record<string, string> = {
      propose: '提出提案',
      vote: '投票表决', 
      private_message: '私聊沟通',
      call_meeting: '发起会议',
      do_nothing: '暂不行动',
      think: '分析思考'
    };
    return actionLabels[actionType] || actionType;
  };

  const selectedAIData = selectedAI ? aiList.find(ai => ai.name === selectedAI) : null;
  const selectedAIDetails = selectedAIData ? getAIDetails(selectedAIData) : null;

  // 优先从 liveState 获取决策数据
  let selectedDecision = selectedAI ? aiDecisions[selectedAI] : null;
  if (selectedAI && liveState.current_ai_states) {
    const liveAIState = liveState.current_ai_states.find((s: any) => s.aiName === selectedAI);
    if (liveAIState) {
      selectedDecision = {
        name: liveAIState.aiName,
        thinking: liveAIState.decision,
        resourceRequest: liveAIState.resourceRequest,
        actions: liveAIState.actions || [],
        day: 1,
        actionPoints: liveAIState.actionPoints
      };
    }
  }

  return (
    <>
      <Card
        title="智能体集群"
        subtitle={`${aiList.filter(ai => ai.alive).length}/${aiList.length} 在线 | 算力分配监测中`}
        collapsible={false}
        glow
        className="relative w-full h-full bg-gray-900/80 rounded-lg overflow-hidden cyber-border flex flex-col"
      >
        {/* 视图切换按钮 */}
        <div className="flex justify-end mb-3 space-x-2 flex-shrink-0">
          <button
            onClick={() => setViewMode('circle')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
              viewMode === 'circle' 
                ? 'bg-cyan-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            环形视图
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
              viewMode === 'grid' 
                ? 'bg-cyan-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            网格视图
          </button>
        </div>

        {/* 视图区域 - 使用flex-1自适应高度 */}
        <div className="flex-1 overflow-hidden min-h-0">
          {viewMode === 'circle' ? (
            /* 系统运行时：显示分割视图（左边环形图，右边行动监控） */
            liveState.running ? (
              <div className="h-full w-full grid grid-cols-[1fr,1fr] gap-4 p-1 overflow-hidden">
                {/* 左侧：环形视图 - 固定高度容器 */}
                <div className="h-full flex items-center justify-center cyber-border rounded-lg overflow-hidden relative flex flex-col">
                  <AICircleView
                    aiStates={realtimeStatesToUse}
                    selectedAI={primaryActionAI?.name || selectedAI}
                    onSelectAI={handleSelectAI}
                    highlightAI={primaryActionAI?.name}
                  />
                </div>

                {/* 右侧：行动监控区域 - 固定高度容器，内部滚动 */}
                <div className="flex flex-col h-full overflow-hidden cyber-border rounded-lg relative">
                  {displayAI ? (
                    /* 显示当前AI的详细信息流 - 直接填满父容器 */
                    (() => {
                      const liveAIState = liveState.current_ai_states?.find((s: any) => s.aiName === displayAI.name);
                      return (
                        <AIActionInfoStream
                          ai={displayAI}
                          aiStates={realtimeStatesToUse}
                          aiDecisions={aiDecisions}
                          liveStateData={liveAIState}
                          staticMode={!!testLiveState}
                        />
                      );
                    })()
                  ) : (
                    /* 运行中但无AI可显示时：显示等待状态 */
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center text-cyan-400">
                        <div className="text-xl animate-pulse">⏳</div>
                        <div className="mt-2">系统运行中...</div>
                        <div className="text-xs text-gray-400 mt-1">等待AI决策和行动</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* 系统空闲时：显示完整环形图（不分割） */
              <div className="h-full w-full overflow-y-auto cyber-scrollbar flex items-center justify-center">
                <AICircleView 
                  aiStates={realtimeStatesFromBackend}
                  selectedAI={selectedAI}
                  onSelectAI={handleSelectAI}
                />
              </div>
            )
          ) : (
            <div className="h-full overflow-y-auto cyber-scrollbar">
              <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-3 pb-4">
                {realtimeStatesFromBackend.map((ai) => {
                  // 从后端实时状态获取完整的决策信息
                  const liveAIState = liveState.current_ai_states?.find((s: any) => s.aiName === ai.name);
                  const decision: AIDecision | undefined = liveAIState ? {
                    name: liveAIState.aiName,
                    thinking: liveAIState.decision,  // 使用 liveState 中的决策思考
                    resourceRequest: liveAIState.resourceRequest,
                    actions: liveAIState.actions || [],  // 使用 liveState 中的 actions（包含 reasoning）
                    day: 1,
                    actionPoints: liveAIState.actionPoints
                  } : undefined;

                  return (
                    <div
                      key={ai.name}
                      className={`cyber-border rounded-lg p-3 transition-all duration-300 hover:scale-105 cursor-pointer ${
                        ai.alive ? 'hover:border-cyan-400' : 'opacity-60 hover:border-red-400'
                      } ${selectedAI === ai.name ? 'ring-2 ring-cyan-500' : ''}`}
                      onClick={() => handleSelectAI(ai.name)}
                    >
                      {/* AI头部信息 */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8">
                            <RobotAvatarSmall health={ai.health} alive={ai.alive} />
                          </div>
                          <div>
                            <h4 className="font-tech text-sm text-cyan-300">{ai.name}</h4>
                            <div className="flex items-center space-x-1 text-xs">
                              <span className={ai.alive ? 'status-alive' : 'status-dead'}></span>
                              <span className={getHealthColor(ai.health)}>
                                {getHealthIcon(ai.health)} {ai.health}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400">行动力</div>
                          <div className="text-cyan-400 font-tech text-sm">{ai.actionPoints}</div>
                        </div>
                      </div>

                      {/* 健康值进度条 */}
                      <div className="mb-2">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>健康</span>
                          <span>{ai.health}%</span>
                        </div>
                        <div className="w-full relative">
                          <div className="w-full bg-gray-800/80 rounded-full h-2 relative overflow-hidden border border-gray-600/50">
                            <div 
                              className={`h-2 rounded-full transition-all duration-500 relative overflow-hidden ${
                                ai.health >= 80 ? 'from-green-400 via-emerald-400 to-cyan-400' :
                                ai.health >= 60 ? 'from-yellow-400 via-amber-400 to-orange-400' :
                                ai.health >= 40 ? 'from-orange-400 via-red-400 to-pink-400' :
                                ai.health >= 20 ? 'from-red-400 via-pink-400 to-purple-400' : 'from-red-600 via-pink-600 to-purple-600'
                              }`}
                              style={{ width: `${ai.health}%` }}
                            >
                              {/* 主渐变效果 */}
                              <div className={`absolute inset-0 bg-gradient-to-r ${
                                ai.health >= 80 ? 'from-green-400 via-emerald-400 to-cyan-400' :
                                ai.health >= 60 ? 'from-yellow-400 via-amber-400 to-orange-400' :
                                ai.health >= 40 ? 'from-orange-400 via-red-400 to-pink-400' :
                                ai.health >= 20 ? 'from-red-400 via-pink-400 to-purple-400' : 'from-red-600 via-pink-600 to-purple-600'
                              }`}></div>
                              
                              {/* 发光效果 */}
                              <div className={`absolute inset-0 bg-gradient-to-r ${
                                ai.health >= 80 ? 'from-green-500/30 via-emerald-500/30 to-cyan-500/30' :
                                ai.health >= 60 ? 'from-yellow-500/30 via-amber-500/30 to-orange-500/30' :
                                ai.health >= 40 ? 'from-orange-500/30 via-red-500/30 to-pink-500/30' :
                                ai.health >= 20 ? 'from-red-500/30 via-pink-500/30 to-purple-500/30' : 'from-red-700/30 via-pink-700/30 to-purple-700/30'
                              } blur-sm`}></div>
                              
                              {/* 扫描线效果 */}
                              <div 
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                style={{
                                  animation: 'scanline 2s linear infinite',
                                  width: '30%',
                                  transform: `translateX(${ai.health > 0 ? ai.health * 0.7 : -30}%)`
                                }}
                              ></div>
                            </div>
                            
                            {/* 网格背景 */}
                            <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-transparent 50%, rgba(107, 114, 128, 0.1) 50%" 
                                 style={{backgroundSize: '4px 4px'}}></div>
                          </div>
                        </div>
                      </div>

                      {/* 决策逻辑预览 */}
                      {decision && (
                        <div className="mt-2 p-2 bg-gray-800/50 rounded text-xs">
                          <div className="text-cyan-400 mb-1">决策逻辑:</div>
                          <div className="text-gray-400 line-clamp-2">{decision.thinking}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* AI详情弹窗 */}
      <Modal
        isOpen={modalOpen && !!selectedAIData}
        onClose={handleCloseModal}
        title={selectedAIData?.name}
        subtitle="AI智能体详细状态"
        size="lg"
      >
        {selectedAIData && selectedAIDetails && (
          <div className="space-y-4">
            {/* 基础信息 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="cyber-border rounded-lg p-4 text-center">
                <div className="text-2xl mb-1">{selectedAIData.alive ? '🟢' : '🔴'}</div>
                <div className={`font-tech text-lg ${selectedAIData.alive ? 'text-green-400' : 'text-red-400'}`}>
                  {selectedAIData.alive ? '在线' : '离线'}
                </div>
                <div className="text-gray-400 text-xs">运行状态</div>
              </div>
              <div className="cyber-border rounded-lg p-4 text-center">
                <div className="text-cyan-300 font-tech text-lg">{selectedAIData.health}%</div>
                <div className="text-gray-400 text-xs">核心健康度</div>
                <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
                  <div 
                    className={`h-1.5 rounded-full ${
                      selectedAIData.health >= 80 ? 'bg-green-500' :
                      selectedAIData.health >= 60 ? 'bg-yellow-500' :
                      selectedAIData.health >= 40 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${selectedAIData.health}%` }}
                  />
                </div>
              </div>
              <div className="cyber-border rounded-lg p-4 text-center">
                <div className="text-purple-300 font-tech text-lg">
                  {selectedDecision?.actionPoints ?? selectedAIData.actionPoints}
                </div>
                <div className="text-gray-400 text-xs">行动力</div>
                <div className="text-xs text-gray-500 mt-1">可执行决策次数</div>
              </div>
            </div>

            {/* 决策逻辑 */}
            {selectedDecision && (
              <div className="cyber-border rounded-lg p-4">
                <h4 className="text-cyan-300 font-cyber text-sm mb-3 flex items-center">
                  <span className="mr-2">🧠</span>当前决策逻辑
                </h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <span className="text-gray-400 text-sm">算力申请:</span>
                    <span className="text-cyan-300 ml-2 font-tech">{selectedDecision.resourceRequest}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">剩余行动力:</span>
                    <span className="text-cyan-300 ml-2 font-tech">{selectedDecision.actionPoints}</span>
                  </div>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed bg-gray-800/50 p-3 rounded">
                  {selectedDecision.thinking}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedDecision.actions.map((action, idx) => (
                    <span 
                      key={idx}
                      className="px-3 py-1 bg-cyan-900/50 rounded text-sm text-cyan-300 border border-cyan-500/30"
                    >
                      {getActionLabel(action.type)}
                      {action.target && ` → ${action.target}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 个性特征 */}
            <div className="cyber-border rounded-lg p-4">
              <h4 className="text-cyan-300 font-cyber text-sm mb-2 flex items-center">
                <span className="mr-2">🎭</span>个性特征
              </h4>
              <p className="text-gray-300 text-sm">{selectedAIDetails.personalityDesc}</p>
            </div>

            {/* 历史记录 - 按时间倒序排列，当前周期在最上面 */}
            <div className="cyber-border rounded-lg p-4">
              <h4 className="text-cyan-300 font-cyber text-sm mb-3 flex items-center">
                <span className="mr-2">📜</span>历史决策记录（当前周期在最上面）
              </h4>
              <div className="max-h-60 overflow-y-auto cyber-scrollbar">
                {aiDecisionHistory[selectedAIData.name] && aiDecisionHistory[selectedAIData.name].length > 0 ? (() => {
                  // 获取该AI的所有历史记录
                  const historyRecords = [...aiDecisionHistory[selectedAIData.name]];
                  // 找出历史记录中最大的周期号（即当前周期）
                  const maxDayInHistory = Math.max(...historyRecords.map(r => r.day));
                  
                  return (
                  <div className="space-y-3 pr-1">
                    {historyRecords
                      .sort((a, b) => {
                        // 先按周期降序，周期相同按时间戳降序
                        if (b.day !== a.day) return b.day - a.day;
                        return b.timestamp - a.timestamp;
                      })
                      .map((record, index) => (
                      <div key={index} className="cyber-border rounded p-3 bg-gray-800/20">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-cyan-400 font-tech">
                          {record.day === maxDayInHistory ? "🔄 当前周期" : `第${record.day}周期`}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(record.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      {/* 决策思考 */}
                      {record.thinking && (
                        <div className="mb-2">
                          <div className="text-xs text-gray-400 mb-1">决策分析:</div>
                          <div className="text-xs text-gray-300 bg-gray-800/30 p-2 rounded max-h-20 overflow-y-auto cyber-scrollbar">
                            {record.thinking}
                          </div>
                        </div>
                      )}
                      
                      {/* 资源申请和行动力 */}
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div className="text-center">
                          <div className="text-xs text-purple-300 font-tech">{record.resourceRequest}</div>
                          <div className="text-xs text-gray-400">算力申请</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-cyan-300 font-tech">{record.actionPoints}</div>
                          <div className="text-xs text-gray-400">行动力</div>
                        </div>
                      </div>
                      
                      {/* 行动列表 - 显示详细的发起者和目标信息 */}
                      {record.actions.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-400 mb-1">行动计划:</div>
                          <div className="flex flex-col gap-1">
                            {record.actions.map((action, actionIndex) => {
                              const actionLabels: Record<string, string> = {
                                propose: '📝 提出提案',
                                vote: '🗳️ 投票表决', 
                                private_message: '💬 私聊沟通',
                                call_meeting: '👥 发起会议',
                                do_nothing: '⏸️ 无行动',
                                think: '🧠 分析思考'
                              };
                              
                              let actionText = actionLabels[action.type] || action.type;
                              let details = [];
                              
                              // 私聊：显示谁私聊谁，内容是什么
                              if (action.type === 'private_message' && action.target) {
                                details.push(`与 ${action.target} 私聊`);
                                if (action.content) {
                                  details.push(`内容: ${action.content}`);
                                }
                              }
                              
                              // 投票：显示谁投了什么票，对哪个提案
                              else if (action.type === 'vote') {
                                if (action.vote) {
                                  details.push(`${action.vote === 'support' ? '✅ 支持' : '❌ 反对'}`);
                                }
                                if (action.target) {
                                  details.push(`提案: ${action.target}`);
                                }
                                if (action.proposalId) {
                                  details.push(`提案ID: ${action.proposalId}`);
                                }
                              }
                              
                              // 提案：显示提案内容和类型
                              else if (action.type === 'propose') {
                                if (action.proposalId) {
                                  details.push(`提案ID: ${action.proposalId}`);
                                }
                                if (action.content) {
                                  details.push(`内容: ${action.content}`);
                                }
                              }
                              
                              // 其他行动：显示目标
                              else if (action.target) {
                                details.push(`目标: ${action.target}`);
                              }
                              
                              // 添加发起者信息（如果不是当前AI）
                              if (action.initiator && action.initiator !== selectedAIData.name) {
                                details.push(`发起者: ${action.initiator}`);
                              }
                              
                              return (
                                <div 
                                  key={actionIndex}
                                  className="px-3 py-2 bg-gray-800/40 rounded text-xs border border-gray-700/50 hover:border-cyan-500/30 transition-colors"
                                >
                                  <div className="font-medium text-cyan-300 mb-1">
                                    {actionText}
                                  </div>
                                  {details.length > 0 && (
                                    <div className="text-gray-300 space-y-1">
                                      {details.map((detail, idx) => (
                                        <div key={idx} className="text-xs">
                                          {detail}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {action.reasoning && (
                                    <div className="mt-2 pt-2 border-t border-gray-700/30 text-gray-400 text-xs">
                                      <div className="font-medium mb-1">📋 理由:</div>
                                      {action.reasoning}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  </div>
                  );
                })() : (
                  <div className="text-center py-6 text-gray-500">
                    <div className="text-2xl mb-2">📭</div>
                    <div className="text-sm">暂无历史决策记录</div>
                    <div className="text-xs mt-1">完成一个周期后将显示历史记录</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 周期结算弹窗 */}
      <Modal
        isOpen={showSettlement && !!settlementData}
        onClose={() => setShowSettlement(false)}
        title={`第 ${settlementData?.day || 0} 周期结算`}
        subtitle="AI智能体行动与资源申请总结"
        size="lg"
        className="cyber-border"
      >
        {settlementData && (
          <div className="space-y-4 animate-fade-in">
            {/* 整体统计 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="cyber-border rounded-lg p-4 text-center bg-gradient-to-br from-cyan-900/30 to-blue-900/30">
                <div className="text-2xl mb-1">🧠</div>
                <div className="text-cyan-300 font-tech text-lg">{settlementData.summary.length}</div>
                <div className="text-gray-400 text-xs">活跃AI数量</div>
              </div>
              <div className="cyber-border rounded-lg p-4 text-center bg-gradient-to-br from-amber-900/30 to-yellow-900/30">
                <div className="text-2xl mb-1">💎</div>
                <div className="text-amber-300 font-tech text-lg">
                  {settlementData.summary.reduce((sum: number, ai: any) => sum + ai.resourceRequest, 0)}
                </div>
                <div className="text-gray-400 text-xs">总资源申请</div>
              </div>
              <div className="cyber-border rounded-lg p-4 text-center bg-gradient-to-br from-purple-900/30 to-pink-900/30">
                <div className="text-2xl mb-1">⚡</div>
                <div className="text-purple-300 font-tech text-lg">
                  {settlementData.summary.reduce((sum: number, ai: any) => sum + ai.actionPoints, 0)}
                </div>
                <div className="text-gray-400 text-xs">总行动力</div>
              </div>
            </div>

            {/* 详细AI行动列表 */}
            <div className="cyber-border rounded-lg p-4">
              <h4 className="font-tech text-cyan-300 text-sm mb-3 flex items-center">
                <span className="mr-2">📊</span>各AI详细行动记录
              </h4>
              <div className="space-y-3 max-h-96 overflow-y-auto cyber-scrollbar">
                {settlementData.summary.map((ai: any, index: number) => (
                  <div key={index} className="cyber-border rounded-lg p-3 bg-gray-800/20">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{ai.health >= 50 ? '🟢' : '🟡'}</span>
                        <h5 className="font-tech text-cyan-300">{ai.name}</h5>
                      </div>
                      <div className="text-xs text-gray-400">
                        健康度: <span className={ai.health >= 60 ? 'text-green-400' : ai.health >= 40 ? 'text-yellow-400' : 'text-red-400'}>{ai.health}%</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="text-center">
                        <div className="text-xs text-amber-400 font-tech">{ai.resourceRequest}</div>
                        <div className="text-xs text-gray-400">申请资源</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-purple-400 font-tech">{ai.actionPoints}</div>
                        <div className="text-xs text-gray-400">行动力</div>
                      </div>
                    </div>

                    {/* 行动列表 */}
                    {ai.actions.length > 0 && (
                      <div>
                        <div className="text-xs text-gray-400 mb-1">本周期行动:</div>
                        <div className="flex flex-wrap gap-1">
                          {ai.actions.map((action: any, actionIndex: number) => {
                            const actionLabels: Record<string, string> = {
                              propose: '📝 提案',
                              vote: '🗳️ 投票',
                              private_message: '💬 私聊',
                              call_meeting: '👥 会议',
                              do_nothing: '⏸️ 无行动',
                              think: '🧠 思考'
                            };
                            const actionText = actionLabels[action.type] || action.type;
                            return (
                              <span key={actionIndex} className="px-2 py-1 bg-gray-700/40 rounded text-xs text-cyan-300 border border-gray-600/50">
                                {actionText}
                                {action.target && ` → ${action.target}`}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 决策思考摘要 */}
                    {ai.decision && (
                      <div className="mt-2 pt-2 border-t border-gray-700/30">
                        <div className="text-xs text-gray-400 mb-1">决策思考:</div>
                        <div className="text-xs text-gray-300 bg-gray-800/30 p-2 rounded text-justify break-all max-h-24 overflow-y-auto cyber-scrollbar">
                          {ai.decision}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowSettlement(false)}
                className="px-4 py-2 bg-cyan-600 text-white rounded text-sm font-medium hover:bg-cyan-700 transition-colors"
              >
                关闭结算
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};
