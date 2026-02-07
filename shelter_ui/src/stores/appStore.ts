import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { AppState, ControlState, AIState, SystemState, Proposal, GameEvent, ChatMessage, ResourceAllocation, VoteAnalysis, AIBehaviorStats, SocialNetwork, LiveStateResponse, AIRealTimeDecision } from '@/types';
import { shelterAPI, mockDataGenerator } from '@/services/api';

interface AppStore extends AppState {
  controlState: ControlState;
  liveState: LiveStateResponse;
  lastRunningState: boolean; // 记录上一次的运行状态
  history: Record<number, {
    proposals: Proposal[];
    events: GameEvent[];
    voteAnalyses: VoteAnalysis[];
  }>;
  // AI决策历史记录，按AI名称存储
  aiDecisionHistory: Record<string, Array<{
    day: number;
    thinking: string;
    actions: any[];
    resourceRequest: number;
    actionPoints: number;
    timestamp: number;
  }>>;
  
  // 动作方法
  fetchData: () => Promise<void>;
  runNextDay: () => Promise<void>;
  resetSystem: () => Promise<void>;
  castVote: (proposalId: string, aiName: string, vote: 'support' | 'oppose') => Promise<void>;
  setAutoRun: (autoRun: boolean) => void;
  setSpeed: (speed: 'slow' | 'normal' | 'fast') => void;
  
  // 实时状态方法
  pollLiveState: () => Promise<void>;
  startLivePolling: () => void;
  stopLivePolling: () => void;
  
  // 工具方法
  analyzeVotingPatterns: () => void;
  calculateBehaviorStats: () => void;
  buildSocialNetwork: () => void;
  
  // 本地存储管理
  resetLocalStorage: () => void;
  
  // 模拟数据方法（开发用）
  loadMockData: () => void;
  
  // 历史数据管理
  saveCurrentDayToHistory: () => void;
  saveAIDecisionToHistory: (aiName: string, decision: any, day?: number) => void;
  getAllProposals: () => Proposal[];
  getAllEvents: () => GameEvent[];
  getAllVoteAnalyses: () => VoteAnalysis[];
}

const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始状态 - 资源初始为100%满（5000/5000）
        aiList: [],
        systemState: {
          day: 0,
          remainingResources: 5000,
          totalResources: 5000,
          systemEfficiency: 100,
          eliminationCount: 0,
          allocationMethod: '',
          tokenBudget: 0,
          totalTokenConsumed: 0,
        },
        proposals: [],
        events: [],
        chatMessages: [],
        resourceAllocations: [],
        voteAnalyses: [],
        behaviorStats: [],
        socialNetwork: { nodes: [], edges: [] },
        loading: false,
        error: null,
        
        controlState: {
          autoRun: false,
          speed: 'normal',
          lastUpdate: 0,
          updateInterval: 5000,
        },
        
        liveState: {
          day: 0,
          running: false,
          current_acting_ai: null,
          current_ai_states: [],
          system_phase: 'idle',
          last_update: 0
        },
        lastRunningState: false, // 记录上一次的运行状态
        history: {}, // 历史数据记录，按周期保存
        aiDecisionHistory: {}, // AI决策历史记录，按AI名称存储

      // 获取所有数据 - 独立处理每个API，避免单个失败影响整体
      fetchData: async () => {
        set({ loading: true, error: null });
        
        // 独立获取每个数据源，单个失败不影响其他
        const fetchAIList = async () => {
          try {
            const aiList = await shelterAPI.getAIList();
            set(state => ({ aiList }));
            console.log('✓ AI列表获取成功');
          } catch (error) {
            console.warn('⚠ AI列表获取失败，使用默认值');
            set(state => ({ aiList: [] }));
          }
        };

        const fetchSystemState = async () => {
          try {
            const systemState = await shelterAPI.getSystemStatus();
            set(state => ({ systemState }));
            console.log('✓ 系统状态获取成功');
          } catch (error) {
            console.warn('⚠ 系统状态获取失败，使用默认值');
            set(state => ({ 
              systemState: {
                day: 0,
                remainingResources: 0,
                totalResources: 0,
                systemEfficiency: 100,
                eliminationCount: 0,
                allocationMethod: '',
                tokenBudget: 0,
                totalTokenConsumed: 0,
              }
            }));
          }
        };

        const fetchProposals = async () => {
          try {
            const proposals = await shelterAPI.getProposals();
            set(state => ({ proposals }));
            console.log('✓ 提案列表获取成功');
          } catch (error) {
            console.warn('⚠ 提案列表获取失败，使用默认值');
            set(state => ({ proposals: [] }));
          }
        };

        const fetchEvents = async () => {
          try {
            const events = await shelterAPI.getEventHistory();
            set(state => ({ events }));
            console.log('✓ 事件历史获取成功');
          } catch (error) {
            console.warn('⚠ 事件历史获取失败，使用默认值');
            set(state => ({ events: [] }));
          }
        };

        // 并行但独立执行所有数据获取
        await Promise.allSettled([
          fetchAIList(),
          fetchSystemState(),
          fetchProposals(),
          fetchEvents(),
        ]);

        set({ loading: false });

        // 分析数据（即使部分数据获取失败也继续分析）
        get().analyzeVotingPatterns();
        get().calculateBehaviorStats();
        get().buildSocialNetwork();
      },

      // 运行下一天
      runNextDay: async () => {
        // 保存当前周期数据到历史记录
        get().saveCurrentDayToHistory();

        // 开始时设置loading为true
        set({ loading: true });

        try {
          // 阻塞等待后端返回，不设置超时（已在axios配置中设置5分钟超时）
          const result = await shelterAPI.runNextDay();

          // 使用后端返回的信息设置当前AI状态等
          set(state => ({
            aiList: result?.ai_list || [],
            systemState: result?.system_state || {
              day: state.systemState.day + 1,
              remainingResources: state.systemState.remainingResources,
              totalResources: state.systemState.totalResources,
              systemEfficiency: state.systemState.systemEfficiency,
              eliminationCount: state.systemState.eliminationCount,
              allocationMethod: state.systemState.allocationMethod,
              tokenBudget: state.systemState.tokenBudget,
              totalTokenConsumed: state.systemState.totalTokenConsumed,
            },
            events: result?.events || [],
            proposals: result?.proposals || [],
            loading: false,  // 请求完成后停止loading
            // 注意：不要手动设置liveState.running为false
            // 实时状态轮询会自动更新运行状态
          }));

          // 保存新周期的数据到历史记录
          get().saveCurrentDayToHistory();

          // 更新分析数据
          get().analyzeVotingPatterns();
          get().calculateBehaviorStats();
          get().buildSocialNetwork();

          // 强制刷新一次liveState，确保前端能及时获取最新状态
          await get().pollLiveState();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '运行失败',
            loading: false  // 出错也要停止loading
          });
        }
      },

      // 重置系统
      resetSystem: async () => {
        set({ loading: true });
        try {
          // 先调用后端重置
          await shelterAPI.resetSystem();
          
          // 清空localStorage中的持久化数据
          localStorage.removeItem('ai-shelter-store');
          
          // 重置所有前端状态到初始值
          set({
            aiList: [],
            systemState: {
              day: 0,
              remainingResources: 5000,
              totalResources: 5000,
              systemEfficiency: 100,
              eliminationCount: 0,
              allocationMethod: '',
              tokenBudget: 0,
              totalTokenConsumed: 0,
            },
            proposals: [],
            events: [],
            chatMessages: [],
            resourceAllocations: [],
            voteAnalyses: [],
            behaviorStats: [],
            socialNetwork: { nodes: [], edges: [] },
            controlState: {
              autoRun: false,
              speed: 'normal',
              lastUpdate: 0,
              updateInterval: 5000,
            },
            liveState: {
              day: 0,
              running: false,
              current_ai_states: [],
              system_phase: 'idle',
              last_update: 0,
              current_acting_ai: null,
            },
            lastRunningState: false,
            history: {}, // 清空所有历史周期数据
            aiDecisionHistory: {}, // 清空所有AI决策历史
            loading: false,
            error: null,
          });
          
          // 重新从后端获取初始数据
          await get().fetchData();
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '重置失败',
            loading: false 
          });
        }
      },

      // 投票
      castVote: async (proposalId: string, aiName: string, vote: 'support' | 'oppose') => {
        try {
          await shelterAPI.castVote(proposalId, aiName, vote);
          
          // 更新本地状态
          set(state => ({
            proposals: state.proposals.map(proposal => 
              proposal.id === proposalId 
                ? {
                    ...proposal,
                    supporters: vote === 'support' 
                      ? [...proposal.supporters, aiName]
                      : proposal.supporters.filter(name => name !== aiName),
                    opposers: vote === 'oppose' 
                      ? [...proposal.opposers, aiName]
                      : proposal.opposers.filter(name => name !== aiName),
                    voteHistory: [
                      ...proposal.voteHistory,
                      {
                        aiName,
                        vote,
                        timestamp: Date.now(),
                        reasoning: '用户手动投票',
                      },
                    ],
                  }
                : proposal
            ),
          }));

          get().analyzeVotingPatterns();
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '投票失败' });
        }
      },

      // 控制面板设置
      setAutoRun: (autoRun: boolean) => {
        set(state => ({
          controlState: { ...state.controlState, autoRun }
        }));
      },

      setSpeed: (speed: 'slow' | 'normal' | 'fast') => {
        const intervals = { slow: 10000, normal: 5000, fast: 2000 };
        set(state => ({
          controlState: { 
            ...state.controlState, 
            speed, 
            updateInterval: intervals[speed] 
          }
        }));
      },

      // 实时状态轮询
      pollLiveState: async () => {
        try {
          const liveState = await shelterAPI.getLiveState();
          set(state => ({
            lastRunningState: state.liveState.running, // 先保存上一次的running状态
            liveState
          }));

          // 不再根据running自动停止loading
          // loading会在runNextDay的await结束后自动重置

          console.log('✓ 实时状态更新成功', liveState.running ? '运行中' : '已结束');
        } catch (error) {
          console.warn('⚠ 实时状态更新失败');
        }
      },

      startLivePolling: () => {
        // 清除之前的轮询
        if ((window as any).liveStatePollingInterval) {
          clearInterval((window as any).liveStatePollingInterval);
        }
        
        // 开始新的轮询（每2秒一次）
        (window as any).liveStatePollingInterval = setInterval(() => {
          get().pollLiveState();
        }, 2000);
        
        // 立即执行一次
        get().pollLiveState();
      },

      stopLivePolling: () => {
        if ((window as any).liveStatePollingInterval) {
          clearInterval((window as any).liveStatePollingInterval);
          (window as any).liveStatePollingInterval = null;
        }
      },

      // 分析投票模式
      analyzeVotingPatterns: () => {
        const { proposals, aiList } = get();
        
        const voteAnalyses = proposals.map(proposal => {
          const totalVotes = proposal.supporters.length + proposal.opposers.length;
          const supportPercentage = totalVotes > 0 ? (proposal.supporters.length / totalVotes) * 100 : 0;
          
          // 分析投票模式
          const votingPatterns: any[] = [];
          
          // 计算争议分数（投票分布越均匀，争议越大）
          const controversyScore = Math.abs(supportPercentage - 50) / 50 * 100;
          
          return {
            proposalId: proposal.id,
            totalVotes,
            supportPercentage,
            oppositionPercentage: 100 - supportPercentage,
            votingPatterns,
            keyInfluencers: [...proposal.supporters, ...proposal.opposers].slice(0, 3),
            controversyScore: 100 - controversyScore, // 反转计算，越接近50%争议越大
          };
        });

        set({ voteAnalyses });
      },

      // 计算行为统计
      calculateBehaviorStats: () => {
        const { aiList, events, proposals, chatMessages } = get();
        
        const behaviorStats = aiList.map(ai => {
          const aiEvents = events.filter(event => event.actors.includes(ai.name));
          const aiProposals = proposals.filter(proposal => proposal.proposer === ai.name);
          
          return {
            aiName: ai.name,
            totalActions: aiEvents.length,
            votesCast: events.filter(event => 
              event.type === 'vote' && event.actors.includes(ai.name)
            ).length,
            proposalsMade: aiProposals.length,
            resourcesRequested: events.filter(event => 
              event.type === 'resource' && event.actors.includes(ai.name)
            ).length,
            chatMessages: events.filter(event => 
              event.type === 'chat' && event.actors.includes(ai.name)
            ).length,
            cooperationScore: Math.floor(Math.random() * 100), // 基于实际数据计算
            aggressionScore: Math.floor(Math.random() * 100),
            survivalInstinct: Math.floor(Math.random() * 100),
          };
        });

        set({ behaviorStats });
      },

      // 构建社交网络
      buildSocialNetwork: () => {
        const { aiList, events, proposals } = get();
        
        const nodes = aiList.map(ai => ({
          id: ai.name,
          label: ai.name,
          group: ai.alive ? 'alive' : 'dead',
          size: ai.health / 10 + 5,
        }));

        const edges: any[] = [];
        
        // 基于投票关系构建边
        proposals.forEach(proposal => {
          proposal.supporters.forEach(supporter => {
            proposal.opposers.forEach(opposer => {
              edges.push({
                from: supporter,
                to: opposer,
                value: -1, // 对立关系
                label: '对立',
              });
            });
          });
        });

        set({
          socialNetwork: { nodes, edges: edges.slice(0, 20) } // 限制边数量
        });
      },

      // 加载模拟数据（开发用）
      loadMockData: () => {
        const aiList = mockDataGenerator.generateAIList(6);
        const systemState = mockDataGenerator.generateSystemState();
        const proposals = mockDataGenerator.generateProposals(aiList.map(ai => ai.name));
        const events = mockDataGenerator.generateEvents(aiList.map(ai => ai.name));
        
        set({
          aiList,
          systemState,
          proposals,
          events,
          history: {}, // 清空历史记录
          aiDecisionHistory: {}, // 清空AI决策历史
          loading: false,
          error: null,
        });

        get().analyzeVotingPatterns();
        get().calculateBehaviorStats();
        get().buildSocialNetwork();
      },

      // 重置本地存储数据
      resetLocalStorage: () => {
        // 清空localStorage中的数据
        localStorage.removeItem('ai-shelter-store');
        // 重置状态到初始值
        set({
          aiList: [],
          systemState: {
            day: 0,
            remainingResources: 5000,
            totalResources: 5000,
            systemEfficiency: 100,
            eliminationCount: 0,
            allocationMethod: '',
            tokenBudget: 0,
            totalTokenConsumed: 0,
          },
          proposals: [],
          events: [],
          chatMessages: [],
          resourceAllocations: [],
          voteAnalyses: [],
          behaviorStats: [],
          socialNetwork: { nodes: [], edges: [] },
          controlState: {
            autoRun: false,
            speed: 'normal',
            lastUpdate: 0,
            updateInterval: 5000,
          },
          liveState: {
            day: 0,
            running: false,
            current_ai_states: [],
            system_phase: 'idle',
            last_update: 0
          },
          lastRunningState: false,
          history: {}, // 清空历史记录
          aiDecisionHistory: {}, // 清空AI决策历史
          loading: false,
          error: null,
        });
        
        // 重新从后端获取最新数据
        get().fetchData();
      },

      // 保存当前周期数据到历史记录
      saveCurrentDayToHistory: () => {
        const state = get();
        const currentDay = state.systemState.day;
        
        // 如果当前周期为0（初始状态），则不保存
        if (currentDay === 0) {
          console.debug(`📚 第 ${currentDay} 周期为初始状态，跳过保存`);
          return;
        }
        
        // 检查当前周期是否已经保存过
        if (state.history[currentDay]) {
          console.debug(`📚 第 ${currentDay} 周期数据已存在，跳过保存`);
          return;
        }
        
        // 保存当前数据到历史记录
        set((state) => ({
          history: {
            ...state.history,
            [currentDay]: {
              proposals: [...state.proposals],
              events: [...state.events],
              voteAnalyses: [...state.voteAnalyses],
            },
          },
        }));
        
        console.debug(`📚 第 ${currentDay} 周期数据已保存到历史记录`, {
          提案数量: state.proposals.length,
          事件数量: state.events.length,
          投票分析数量: state.voteAnalyses.length,
          历史记录总周期数: Object.keys(state.history).length + 1
        });
      },

      // 保存AI决策到历史记录
      saveAIDecisionToHistory: (aiName: string, decision: any, day?: number) => {
        const state = get();
        // 如果传入了day参数则使用，否则使用当前systemState.day
        // 注意：stepSimulation完成后day已经+1，所以保存上一周期数据时需要传入day-1
        const currentDay = day !== undefined ? day : state.systemState.day;
        
        // 如果当前周期为0（初始状态），则不保存
        if (currentDay === 0) {
          return;
        }
        
        set((state) => {
          const aiHistory = state.aiDecisionHistory[aiName] || [];
          
          // 检查是否已存在相同周期的记录，如果存在则更新
          const existingIndex = aiHistory.findIndex(h => h.day === currentDay);
          const newRecord = {
            day: currentDay,
            thinking: decision.thinking || '',
            actions: decision.actions || [],
            resourceRequest: decision.resourceRequest || 0,
            actionPoints: decision.actionPoints || 0,
            timestamp: Date.now()
          };
          
          let updatedHistory;
          if (existingIndex >= 0) {
            // 更新已有记录
            updatedHistory = [...aiHistory];
            updatedHistory[existingIndex] = newRecord;
          } else {
            // 添加新记录
            updatedHistory = [newRecord, ...aiHistory];
          }
          
          // 只保留最近10条记录
          if (updatedHistory.length > 10) {
            updatedHistory = updatedHistory.slice(0, 10);
          }
          
          return {
            aiDecisionHistory: {
              ...state.aiDecisionHistory,
              [aiName]: updatedHistory
            }
          };
        });
        
        console.debug(`🤖 ${aiName} 的决策已保存到历史记录`, {
          周期: currentDay,
          行动数: decision.actions?.length || 0
        });
      },

      // 获取所有历史周期的提案
      getAllProposals: () => {
        const state = get();
        const currentDay = state.systemState.day;
        
        console.debug('📊 getAllProposals 调用', {
          当前周期: currentDay,
          历史记录周期数: Object.keys(state.history).length,
          当前周期提案数量: state.proposals.length,
          历史记录总提案数量: Object.values(state.history).reduce((sum, dayData) => sum + dayData.proposals.length, 0)
        });
        
        // 使用映射来合并提案，当前周期的数据优先
        const proposalMap = new Map<string, Proposal>();
        
        // 首先添加历史记录中的所有提案
        Object.values(state.history).forEach((dayData) => {
          dayData.proposals.forEach((proposal) => {
            proposalMap.set(proposal.id, proposal);
          });
        });
        
        // 然后用当前周期的提案覆盖（确保最新数据）
        state.proposals.forEach((proposal) => {
          proposalMap.set(proposal.id, proposal);
        });
        
        const allProposals = Array.from(proposalMap.values());
        
        // 按创建时间排序（最新的在前）
        const sortedProposals = allProposals.sort((a, b) => b.createdAt - a.createdAt);
        
        console.debug('📊 getAllProposals 返回', {
          合并后提案数量: sortedProposals.length,
          去重前总数: state.proposals.length + Object.values(state.history).reduce((sum, dayData) => sum + dayData.proposals.length, 0)
        });
        
        return sortedProposals;
      },

      // 获取所有历史周期的事件
      getAllEvents: () => {
        const state = get();
        const currentDay = state.systemState.day;
        
        console.debug('📊 getAllEvents 调用', {
          当前周期: currentDay,
          历史记录周期数: Object.keys(state.history).length,
          当前周期事件数量: state.events.length,
          历史记录总事件数量: Object.values(state.history).reduce((sum, dayData) => sum + dayData.events.length, 0)
        });
        
        // 使用映射来合并事件，当前周期的数据优先
        const eventMap = new Map<string, GameEvent>();
        
        // 首先添加历史记录中的所有事件
        Object.values(state.history).forEach((dayData) => {
          dayData.events.forEach((event) => {
            eventMap.set(event.id, event);
          });
        });
        
        // 然后用当前周期的事件覆盖（确保最新数据）
        state.events.forEach((event) => {
          eventMap.set(event.id, event);
        });
        
        const allEvents = Array.from(eventMap.values());
        
        // 按时间戳排序（最新的在前）
        const sortedEvents = allEvents.sort((a, b) => b.timestamp - a.timestamp);
        
        console.debug('📊 getAllEvents 返回', {
          合并后事件数量: sortedEvents.length,
          去重前总数: state.events.length + Object.values(state.history).reduce((sum, dayData) => sum + dayData.events.length, 0)
        });
        
        return sortedEvents;
      },

      // 获取所有历史周期的投票分析
      getAllVoteAnalyses: () => {
        const state = get();
        const currentDay = state.systemState.day;
        
        console.debug('📊 getAllVoteAnalyses 调用', {
          当前周期: currentDay,
          历史记录周期数: Object.keys(state.history).length,
          当前周期投票分析数量: state.voteAnalyses.length,
          历史记录总投票分析数量: Object.values(state.history).reduce((sum, dayData) => sum + dayData.voteAnalyses.length, 0)
        });
        
        // 使用映射来合并投票分析，当前周期的数据优先
        const voteAnalysisMap = new Map<string, VoteAnalysis>();
        
        // 首先添加历史记录中的所有投票分析
        Object.values(state.history).forEach((dayData) => {
          dayData.voteAnalyses.forEach((analysis) => {
            voteAnalysisMap.set(analysis.id, analysis);
          });
        });
        
        // 然后用当前周期的投票分析覆盖（确保最新数据）
        state.voteAnalyses.forEach((analysis) => {
          voteAnalysisMap.set(analysis.id, analysis);
        });
        
        const allVoteAnalyses = Array.from(voteAnalysisMap.values());
        
        console.debug('📊 getAllVoteAnalyses 返回', {
          合并后投票分析数量: allVoteAnalyses.length,
          去重前总数: state.voteAnalyses.length + Object.values(state.history).reduce((sum, dayData) => sum + dayData.voteAnalyses.length, 0)
        });
        
        return allVoteAnalyses;
      },
    }),
    {
      name: 'ai-shelter-store',
      // 持久化配置
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        },
      },
      // 只持久化关键状态，排除loading、error等临时状态
      partialize: (state) => ({
        aiList: state.aiList,
        systemState: state.systemState,
        proposals: state.proposals,
        events: state.events,
        chatMessages: state.chatMessages,
        resourceAllocations: state.resourceAllocations,
        voteAnalyses: state.voteAnalyses,
        behaviorStats: state.behaviorStats,
        socialNetwork: state.socialNetwork,
        controlState: state.controlState,
        lastRunningState: state.lastRunningState,
        aiDecisionHistory: state.aiDecisionHistory,
      }) as any,
    }
    )
  )
);

export default useAppStore;