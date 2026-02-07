// AI个体状态接口
export interface AIState {
  name: string;
  health: number;
  alive: boolean;
  actionPoints: number;
  lastRequest: number;
  tokenConsumed: number;
  memory: Event[];
  personality?: {
    trait: string;
    aggression: number;
    cooperation: number;
    selfPreservation: number;
  };
  relationships?: Record<string, number>; // 与其他AI的关系值
}

// 系统状态接口
export interface SystemState {
  day: number;
  remainingResources: number;
  totalResources: number;
  systemEfficiency: number;
  eliminationCount: number;
  allocationMethod: string;
  tokenBudget: number;
  totalTokenConsumed: number;
}

// 提案状态接口
export interface Proposal {
  id: string;
  proposer: string;
  type: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected' | 'voting';
  supporters: string[];
  opposers: string[];
  proposalDay?: number; // 提案发起的周期
  voteHistory: VoteRecord[];
  createdAt: number;
  votingEndsAt?: number;
  voteReasoning?: Record<string, string>; // AI投票理由
}

// 投票记录
export interface VoteRecord {
  aiName: string;
  vote: 'support' | 'oppose';
  timestamp: number;
  reasoning?: string;
}

// 事件类型
export interface GameEvent {
  id: string;
  type: 'action' | 'vote' | 'proposal' | 'resource' | 'elimination' | 'chat' | 'meeting';
  timestamp: number;
  day?: number;
  description: string;
  actors: string[];
  details?: Record<string, any>; // 详细信息
  emotionalImpact?: number; // 情感影响值
}

// 聊天消息
export interface ChatMessage {
  id: string;
  sender: string;
  receiver: string;
  content: string;
  timestamp: number;
  type: 'private' | 'public';
  emotionalTone?: 'positive' | 'negative' | 'neutral' | 'threatening';
}

// 资源分配详情
export interface ResourceAllocation {
  aiName: string;
  requested: number;
  allocated: number;
  reason: string;
  timestamp: number;
}

// 投票分析数据
export interface VoteAnalysis {
  proposalId: string;
  totalVotes: number;
  supportPercentage: number;
  oppositionPercentage: number;
  votingPatterns: VotingPattern[];
  keyInfluencers: string[];
  controversyScore: number;
}

// 投票模式
export interface VotingPattern {
  pattern: string;
  count: number;
  ais: string[];
}

// AI行为统计
export interface AIBehaviorStats {
  aiName: string;
  totalActions: number;
  votesCast: number;
  proposalsMade: number;
  resourcesRequested: number;
  chatMessages: number;
  cooperationScore: number;
  aggressionScore: number;
  survivalInstinct: number;
}

// 社会关系网络
export interface SocialNetwork {
  nodes: SocialNode[];
  edges: SocialEdge[];
}

export interface SocialNode {
  id: string;
  label: string;
  group: 'alive' | 'dead';
  size: number;
}

export interface SocialEdge {
  from: string;
  to: string;
  value: number;
  label: string;
}

// API响应类型
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 全局状态类型
export interface AppState {
  aiList: AIState[];
  systemState: SystemState;
  proposals: Proposal[];
  events: GameEvent[];
  chatMessages: ChatMessage[];
  resourceAllocations: ResourceAllocation[];
  voteAnalyses: VoteAnalysis[];
  behaviorStats: AIBehaviorStats[];
  socialNetwork: SocialNetwork;
  loading: boolean;
  error: string | null;
}

// 控制面板状态
export interface ControlState {
  autoRun: boolean;
  speed: 'slow' | 'normal' | 'fast';
  lastUpdate: number;
  updateInterval: number;
}

// AI行动
export interface AIAction {
  type: string;
  target?: string;
  content?: string;    // 通用内容字段（提案内容、私聊消息等）
  message?: string;    // 消息内容字段（私聊、会议等）
  proposalId?: string;
  vote?: 'support' | 'oppose';
  reasoning?: string;  // 执行此动作的具体理由
  initiator?: string;  // 行动发起者
}

// AI决策逻辑
export interface AIDecision {
  name: string;
  resourceRequest: number;
  actions: AIAction[];
  thinking: string;
  rawResponse?: string;
  day: number;
  actionPoints: number;
}

// AI实时状态（用于环形展示）
export interface AIRealtimeState {
  name: string;
  health: number;
  alive: boolean;
  actionPoints: number;
  currentAction?: string;
  target?: string;
  thinking: string;
  status: 'idle' | 'thinking' | 'acting' | 'dead';
}

// AI实时决策状态（来自后端）
export interface AIRealTimeDecision {
  aiName: string;
  health: number;
  actionPoints: number;
  decision: string;  // AI的思考内容（thinking）
  currentAction: string;  // 当前正在执行的动作描述
  resourceRequest: number;
  lastAllocated: number;
  phase: string;
  isActing: boolean;  // 是否正在行动（thinking或acting阶段）
  actions?: AIAction[];  // AI的行动计划列表
  timestamp: number;
}

// 实时状态轮询响应
export interface LiveStateResponse {
  day: number;
  running: boolean;
  current_acting_ai?: string | null; // 新增：当前主要行动AI
  current_ai_states: AIRealTimeDecision[];
  system_phase: string;
  last_update: number;
}

// AI避难所面板Props接口
export interface AIHavenPanelProps {
  systemState: SystemState;
  controlState: ControlState;
  loading: boolean;
  isRunning?: boolean; // 系统是否正在运行中
  onRunNextDay: () => void;
  onResetSystem: () => void;
  onSetAutoRun: (autoRun: boolean) => void;
  onSetSpeed: (speed: 'slow' | 'normal' | 'fast') => void;
  onLoadMockData?: () => void;
}