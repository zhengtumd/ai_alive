import axios from 'axios';
import type { AIState, SystemState, Proposal, GameEvent, APIResponse, AIDecision, LiveStateResponse } from '@/types';

// 动态获取 API 基础 URL
const getApiBaseUrl = (): string => {
  // 开发环境：使用代理路径，避免 CORS
  if (import.meta.env.DEV) {
    return '/api';
  }
  
  // 生产环境：优先使用 VITE_API_BASE_URL 环境变量
  // 检查是否定义了 VITE_API_BASE_URL（包括空字符串）
  if (import.meta.env.VITE_API_BASE_URL !== undefined) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  // 其次使用 VITE_BACKEND_PORT 构建本地地址
  if (import.meta.env.VITE_BACKEND_PORT) {
    return `http://localhost:${import.meta.env.VITE_BACKEND_PORT}`;
  }
  // 生产环境默认使用相对路径（前后端同域）
  return '';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 设置为5分钟，确保run_next能完整执行
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加加载状态
api.interceptors.request.use((config) => {
  console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

// 响应拦截器 - 统一错误处理
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// 安全的API调用包装器
const safeApiCall = async <T>(
  apiCall: () => Promise<T>,
  fallback: T,
  apiName: string
): Promise<T> => {
  try {
    return await apiCall();
  } catch (error) {
    console.warn(`[${apiName}] API调用失败，使用默认值:`, error);
    return fallback;
  }
};

export const shelterAPI = {
  // 获取AI列表
  getAIList: async (): Promise<AIState[]> => {
    return safeApiCall(
      async () => {
        const response = await api.get<APIResponse<AIState[]>>('/ai_list');
        return response.data.data || [];
      },
      [],
      'getAIList'
    );
  },

  // 获取系统状态
  getSystemStatus: async (): Promise<SystemState> => {
    return safeApiCall(
      async () => {
        const response = await api.get<APIResponse<any>>('/status');
        const data = response.data.data;
        
        if (data) {
          // 转换系统效率值：后端返回的是小数（1.0=100%），前端需要百分比格式
          return {
            day: data.day || 0,
            remainingResources: data.remainingResources || 0,
            totalResources: data.totalResources || 0,
            systemEfficiency: data.systemEfficiency ? Math.round(data.systemEfficiency * 100) : 100,
            eliminationCount: data.eliminationCount || 0,
            allocationMethod: data.allocationMethod || '',
            tokenBudget: data.tokenBudget || 0,
            totalTokenConsumed: data.totalTokenConsumed || 0,
          };
        }
        
        return {
          day: 0,
          remainingResources: 0,
          totalResources: 0,
          systemEfficiency: 100,
          eliminationCount: 0,
          allocationMethod: '',
          tokenBudget: 0,
          totalTokenConsumed: 0,
        };
      },
      {
        day: 0,
        remainingResources: 0,
        totalResources: 0,
        systemEfficiency: 100,
        eliminationCount: 0,
        allocationMethod: '',
        tokenBudget: 0,
        totalTokenConsumed: 0,
      },
      'getSystemStatus'
    );
  },

  // 运行下一天
  runNextDay: async (): Promise<{
    ai_list: AIState[];
    system_state: SystemState;
    events: GameEvent[];
    proposals: Proposal[];
  }> => {
    return safeApiCall(
      async () => {
        const response = await api.post<APIResponse<{
          ai_list: AIState[];
          system_state: SystemState;
          events: GameEvent[];
          proposals: Proposal[];
        }>>('/run_next');
        
        // 适配后端返回的数据结构
        if (response.data.data) {
          const data = response.data.data;
          // 转换系统效率值：后端返回的是小数（1.0=100%），前端需要百分比格式
          if (data.system_state && typeof data.system_state.systemEfficiency === 'number') {
            data.system_state.systemEfficiency = Math.round(data.system_state.systemEfficiency * 100);
          }
          return data;
        }
        
        // 返回默认值
        return {
          ai_list: [],
          system_state: {
            day: 0,
            remainingResources: 0,
            totalResources: 0,
            systemEfficiency: 0,
            eliminationCount: 0,
            allocationMethod: '',
            tokenBudget: 0,
            totalTokenConsumed: 0,
          },
          events: [],
          proposals: [],
        };
      },
      {
        ai_list: [],
        system_state: {
          day: 0,
          remainingResources: 0,
          totalResources: 0,
          systemEfficiency: 0,
          eliminationCount: 0,
          allocationMethod: '',
          tokenBudget: 0,
          totalTokenConsumed: 0,
        },
        events: [],
        proposals: [],
      },
      'runNextDay'
    );
  },

  // 获取单个AI详情
  getAIDetails: async (aiName: string): Promise<AIState> => {
    return safeApiCall(
      async () => {
        const response = await api.get<APIResponse<AIState>>(`/ai/${aiName}`);
        return response.data.data || {
          name: aiName,
          health: 0,
          alive: false,
          actionPoints: 0,
          lastRequest: 0,
          tokenConsumed: 0,
          memory: [],
        };
      },
      {
        name: aiName,
        health: 0,
        alive: false,
        actionPoints: 0,
        lastRequest: 0,
        tokenConsumed: 0,
        memory: [],
      },
      'getAIDetails'
    );
  },

  // 重置系统
  resetSystem: async (): Promise<void> => {
    return safeApiCall(
      async () => {
        await api.post('/reset');
      },
      undefined,
      'resetSystem'
    );
  },

  // 获取事件历史
  getEventHistory: async (): Promise<GameEvent[]> => {
    return safeApiCall(
      async () => {
        const response = await api.get<APIResponse<GameEvent[]>>('/events');
        return response.data.data || [];
      },
      [],
      'getEventHistory'
    );
  },

  // 获取提案列表
  getProposals: async (): Promise<Proposal[]> => {
    return safeApiCall(
      async () => {
        const response = await api.get<APIResponse<Proposal[]>>('/proposals');
        return response.data.data || [];
      },
      [],
      'getProposals'
    );
  },

  // 手动投票（模拟功能）
  castVote: async (proposalId: string, aiName: string, vote: 'support' | 'oppose'): Promise<void> => {
    return safeApiCall(
      async () => {
        await api.post(`/proposals/${proposalId}/vote`, {
          ai_name: aiName,
          vote,
        });
      },
      undefined,
      'castVote'
    );
  },

  // 获取资源分配历史
  getResourceAllocations: async (): Promise<any[]> => {
    return safeApiCall(
      async () => {
        const response = await api.get<APIResponse<any[]>>('/allocations');
        return response.data.data || [];
      },
      [],
      'getResourceAllocations'
    );
  },

  // 获取聊天记录
  getChatMessages: async (): Promise<any[]> => {
    return safeApiCall(
      async () => {
        const response = await api.get<APIResponse<any[]>>('/chats');
        return response.data.data || [];
      },
      [],
      'getChatMessages'
    );
  },

  // 获取AI决策逻辑
  getAIDecision: async (aiName: string): Promise<AIDecision> => {
    return safeApiCall(
      async () => {
        const response = await api.get<APIResponse<AIDecision>>(`/ai/${aiName}/decision`);
        return response.data.data || {
          name: aiName,
          resourceRequest: 0,
          actions: [],
          thinking: '暂无决策数据',
          day: 0,
          actionPoints: 0,
        };
      },
      {
        name: aiName,
        resourceRequest: 0,
        actions: [],
        thinking: '暂无决策数据',
        day: 0,
        actionPoints: 0,
      },
      'getAIDecision'
    );
  },

  // 获取所有AI决策逻辑
  getAllAIDecisions: async (): Promise<AIDecision[]> => {
    return safeApiCall(
      async () => {
        const response = await api.get<APIResponse<AIDecision[]>>('/ai_decisions');
        return response.data.data || [];
      },
      [],
      'getAllAIDecisions'
    );
  },

  // 获取实时状态
  getLiveState: async (): Promise<LiveStateResponse> => {
    return safeApiCall(
      async () => {
        const response = await api.get<APIResponse<LiveStateResponse>>('/live_state');
        return response.data.data || {
          day: 0,
          running: false,
          current_ai_states: [],
          system_phase: 'idle',
          last_update: 0
        };
      },
      {
        day: 0,
        running: false,
        current_ai_states: [],
        system_phase: 'idle',
        last_update: 0
      },
      'getLiveState'
    );
  },
};

// 模拟数据生成器（用于开发测试）
export const mockDataGenerator = {
  generateAIList: (count: number = 5): AIState[] => {
    const names = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'];
    return Array.from({ length: count }, (_, i) => ({
      name: names[i] || `AI-${i + 1}`,
      health: Math.floor(Math.random() * 100) + 1,
      alive: Math.random() > 0.2,
      actionPoints: Math.floor(Math.random() * 10),
      lastRequest: Math.floor(Math.random() * 50),
      tokenConsumed: Math.floor(Math.random() * 1000),
      memory: [],
      personality: {
        trait: ['合作型', '竞争型', '保守型', '激进型'][Math.floor(Math.random() * 4)],
        aggression: Math.floor(Math.random() * 100),
        cooperation: Math.floor(Math.random() * 100),
        selfPreservation: Math.floor(Math.random() * 100),
      },
    }));
  },

  generateSystemState: (): SystemState => ({
    day: Math.floor(Math.random() * 30) + 1,
    remainingResources: Math.floor(Math.random() * 1000),
    totalResources: 1000,
    systemEfficiency: 100,
    eliminationCount: Math.floor(Math.random() * 5),
    allocationMethod: ['平均分配', '按需分配', '投票决定'][Math.floor(Math.random() * 3)],
    tokenBudget: 5000,
    totalTokenConsumed: Math.floor(Math.random() * 3000),
  }),

  generateProposals: (aiNames: string[]): Proposal[] => {
    const types = ['资源分配', '淘汰投票', '规则修改', '会议召集'];
    return Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, i) => ({
      id: `proposal-${i + 1}`,
      proposer: aiNames[Math.floor(Math.random() * aiNames.length)],
      type: types[Math.floor(Math.random() * types.length)],
      content: `提案内容 ${i + 1}: 建议修改资源分配策略以优化系统效率`,
      status: ['pending', 'approved', 'rejected', 'voting'][Math.floor(Math.random() * 4)] as any,
      supporters: aiNames.slice(0, Math.floor(Math.random() * aiNames.length)),
      opposers: aiNames.slice(0, Math.floor(Math.random() * aiNames.length)),
      voteHistory: [],
      createdAt: Date.now() - Math.floor(Math.random() * 86400000),
      day: Math.floor(Math.random() * 5) + 1,  // 添加周期信息，模拟1-5天
      voteReasoning: aiNames.reduce((acc, name) => {
        if (Math.random() > 0.5) {
          acc[name] = ['支持此提案有利于长期发展', '反对此提案可能带来风险', '保持中立观望'][Math.floor(Math.random() * 3)];
        }
        return acc;
      }, {} as Record<string, string>),
    }));
  },

  generateEvents: (aiNames: string[]): GameEvent[] => {
    const eventTypes = ['action', 'vote', 'proposal', 'resource', 'elimination', 'chat', 'meeting'];
    return Array.from({ length: 20 }, (_, i) => ({
      id: `event-${i + 1}`,
      type: eventTypes[Math.floor(Math.random() * eventTypes.length)] as any,
      timestamp: Date.now() - Math.floor(Math.random() * 3600000),
      day: Math.floor(Math.random() * 5) + 1,  // 添加周期信息，模拟1-5天
      description: `事件 ${i + 1}: ${aiNames[Math.floor(Math.random() * aiNames.length)]} 执行了重要操作`,
      actors: aiNames.slice(0, Math.floor(Math.random() * 3) + 1),
      emotionalImpact: Math.floor(Math.random() * 10) - 5,
    }));
  },
};

export default api;