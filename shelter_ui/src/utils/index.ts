// 工具函数集合
import type { GameEvent, Proposal } from '@/types';

// 格式化数字
export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

// 格式化时间戳
export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// 格式化日期
export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

// 获取健康状态颜色
export const getHealthColor = (health: number): string => {
  if (health >= 80) return 'text-green-400';
  if (health >= 60) return 'text-yellow-400';
  if (health >= 40) return 'text-orange-400';
  if (health >= 20) return 'text-red-400';
  return 'text-red-600';
};

// 获取健康状态图标
export const getHealthIcon = (health: number): string => {
  if (health >= 80) return '🟢';
  if (health >= 60) return '🟡';
  if (health >= 40) return '🟠';
  if (health >= 20) return '🔴';
  return '💀';
};

// 计算进度条宽度
export const getProgressWidth = (current: number, total: number): string => {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  return `${Math.min(percentage, 100)}%`;
};

// 生成随机颜色（用于AI头像）
export const generateColor = (seed: string): string => {
  const colors = [
    'bg-cyan-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500',
    'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500',
    'bg-teal-500', 'bg-indigo-500', 'bg-rose-500', 'bg-amber-500',
  ];
  
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// 获取AI头像缩写
export const getAIAvatar = (name: string): string => {
  return name.slice(0, 2).toUpperCase();
};

// 获取提案状态颜色
export const getProposalStatusColor = (status: string): string => {
  switch (status) {
    case 'pending': return 'text-yellow-400';
    case 'voting': return 'text-blue-400';
    case 'approved': return 'text-green-400';
    case 'rejected': return 'text-red-400';
    default: return 'text-gray-400';
  }
};

// 获取事件类型图标
export const getEventIcon = (type: string): string => {
  const icons: Record<string, string> = {
    action: '⚡',
    vote: '🗳️',
    proposal: '📋',
    resource: '📦',
    elimination: '💀',
    chat: '💬',
    meeting: '👥',
  };
  return icons[type] || '🔹';
};

// 获取情感影响颜色
export const getEmotionalColor = (impact: number): string => {
  if (impact > 0) return 'text-green-400';
  if (impact < 0) return 'text-red-400';
  return 'text-gray-400';
};

// 截断长文本
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

// 生成投票分析描述
export const getVoteAnalysisDescription = (analysis: any): string => {
  const { supportPercentage, controversyScore, totalVotes } = analysis;
  
  if (totalVotes === 0) return '暂无投票';
  
  if (supportPercentage > 80) return '强烈支持';
  if (supportPercentage > 60) return '多数支持';
  if (supportPercentage > 40) return '意见分歧';
  if (supportPercentage > 20) return '多数反对';
  return '强烈反对';
};

// 计算AI行为评分
export const calculateBehaviorScore = (stats: any): number => {
  const { totalActions, votesCast, proposalsMade, cooperationScore } = stats;
  return Math.round((totalActions * 0.3 + votesCast * 0.2 + proposalsMade * 0.2 + cooperationScore * 0.3) / 10);
};

// 生成社交网络关系描述
export const getRelationshipDescription = (value: number): string => {
  if (value > 0.7) return '紧密盟友';
  if (value > 0.4) return '合作关系';
  if (value > 0.1) return '普通关系';
  if (value > -0.1) return '中立关系';
  if (value > -0.4) return '轻微对立';
  if (value > -0.7) return '明显对立';
  return '严重对立';
};

// 模拟AI个性描述
export const getPersonalityDescription = (personality: any): string => {
  const { trait, aggression, cooperation, selfPreservation } = personality;
  
  const descriptions: Record<string, string> = {
    合作型: '倾向于团队合作，优先考虑集体利益',
    竞争型: '追求个人优势，善于在竞争中脱颖而出',
    保守型: '谨慎行事，注重风险控制和稳定发展',
    激进型: '勇于冒险，追求快速发展和突破',
  };
  
  return descriptions[trait] || '个性特征复杂多变';
};

// 生成趣味性事件描述
export const generateFunEventDescription = (event: any): string => {
  const { type, actors, details } = event;
  const actor = actors[0] || '未知AI';
  
  const descriptions: Record<string, string> = {
    action: `${actor} 执行了神秘操作`,
    vote: `${actor} 投下了关键一票`,
    proposal: `${actor} 提出了大胆建议`,
    resource: `${actor} 获得了宝贵资源`,
    elimination: `${actor} 面临生存危机`,
    chat: `${actor} 发表了重要言论`,
    meeting: `${actor} 召集了紧急会议`,
  };
  
  return descriptions[type] || '发生了未知事件';
};

// 计算系统效率趋势
export const calculateEfficiencyTrend = (current: number, previous: number): 'up' | 'down' | 'stable' => {
  const diff = current - previous;
  if (diff > 5) return 'up';
  if (diff < -5) return 'down';
  return 'stable';
};

// 生成资源分配建议
export const generateResourceAdvice = (systemState: any): string => {
  const { remainingResources, totalResources, systemEfficiency } = systemState;
  const usageRate = (totalResources - remainingResources) / totalResources * 100;
  
  if (usageRate > 90) return '资源紧张，需要谨慎分配';
  if (usageRate > 70) return '资源使用合理，保持现状';
  if (usageRate > 50) return '资源充足，可适当放宽限制';
  return '资源充裕，可支持更多发展';
};

// 从事件中提取周期信息（如果事件有day属性）
export const getDayFromEvent = (event: any): number => {
  // 如果事件有day属性，直接使用
  if (event.day !== undefined) {
    return event.day;
  }
  
  // 否则使用时间戳计算周期
  return Math.floor(event.timestamp / 86400000);
};

// 从提案中提取周期信息
export const getDayFromProposal = (proposal: any): number => {
  // 如果提案有day属性，直接使用
  if (proposal.day !== undefined) {
    return proposal.day;
  }
  
  // 否则使用时间戳计算周期
  return Math.floor(proposal.createdAt / 86400000);
};

// 按周期分组事件
export const groupEventsByDay = (events: GameEvent[]): Record<number, GameEvent[]> => {
  const grouped: Record<number, GameEvent[]> = {};
  
  events.forEach(event => {
    const day = getDayFromEvent(event);
    if (!grouped[day]) {
      grouped[day] = [];
    }
    grouped[day].push(event);
  });
  
  return grouped;
};

// 按周期分组提案
export const groupProposalsByDay = (proposals: Proposal[]): Record<number, Proposal[]> => {
  const grouped: Record<number, Proposal[]> = {};
  
  proposals.forEach(proposal => {
    const day = getDayFromProposal(proposal);
    if (!grouped[day]) {
      grouped[day] = [];
    }
    grouped[day].push(proposal);
  });
  
  return grouped;
};

// 格式化周期显示
export const formatDayDisplay = (day: number): string => {
  return `第 ${day} 周期`;
};

// 获取使用率颜色
export const getUsageColor = (usage: number): string => {
  if (usage >= 90) return 'text-red-500';
  if (usage >= 70) return 'text-yellow-500';
  return 'text-green-500';
};