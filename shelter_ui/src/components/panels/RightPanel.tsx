import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { 
  formatTime, 
  getProposalStatusColor, 
  truncateText,
  getEventIcon,
  getEmotionalColor,
  groupEventsByDay,
  groupProposalsByDay,
  formatDayDisplay
} from '@/utils';
import type { Proposal, VoteAnalysis, GameEvent, VoteRecord } from '@/types';

interface RightPanelProps {
  proposals: Proposal[];
  voteAnalyses: VoteAnalysis[];
  events: GameEvent[];
  onVote?: (proposalId: string, vote: 'support' | 'oppose') => void;
  onEventSelect?: (event: GameEvent) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  proposals,
  voteAnalyses,
  events,
  onVote,
  onEventSelect,
}) => {
  const [activeTab, setActiveTab] = useState<'proposals' | 'events'>('proposals');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<{ type: 'proposal' | 'event', data: any } | null>(null);

  const getVotePercentage = (proposal: Proposal, type: 'support' | 'oppose'): number => {
    const total = proposal.supporters.length + proposal.opposers.length;
    if (total === 0) return 0;
    
    return type === 'support' 
      ? (proposal.supporters.length / total) * 100
      : (proposal.opposers.length / total) * 100;
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'pending': return '⏳';
      case 'voting': return '🗳️';
      case 'approved': return '✅';
      case 'rejected': return '❌';
      default: return '🔹';
    }
  };

  const handleViewProposalDetail = (proposal: Proposal) => {
    setModalContent({ type: 'proposal', data: proposal });
    setModalOpen(true);
  };

  const handleViewEventDetail = (event: GameEvent) => {
    setModalContent({ type: 'event', data: event });
    setModalOpen(true);
    onEventSelect?.(event);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setModalContent(null);
  };

  // 按周期分组数据
  const groupedEvents = groupEventsByDay(events as GameEvent[]);
  const groupedProposals = groupProposalsByDay(proposals);

  // 获取当前周期（从事件和提案中找出最大周期）
  const currentDay = Math.max(
    ...Object.keys(groupedEvents).map(Number),
    ...Object.keys(groupedProposals).map(Number),
    1
  );

  // 生成从1到当前周期的所有周期数组，并按降序排列
  const allDays = Array.from({length: currentDay}, (_, i) => i + 1).sort((a, b) => b - a);

  // 获取有数据的周期
  const daysWithProposals = Object.keys(groupedProposals).map(Number).sort((a, b) => b - a);
  const daysWithEvents = Object.keys(groupedEvents).map(Number).sort((a, b) => b - a);

  const getEmotionalIcon = (impact: number): string => {
    if (impact > 2) return '😄';
    if (impact > 0) return '🙂';
    if (impact === 0) return '😐';
    if (impact > -2) return '😕';
    return '😠';
  };

  // 格式化事件展示
  const formatEventDisplay = (event: GameEvent) => {
    try {
      const { type, description, actors = [] } = event;

      // 私聊事件
      if (type === 'chat') {
        if (description.includes('私聊')) {
          return {
            title: '💬 私聊沟通',
            content: description,
            icon: '💬'
          };
        }
      }
      
      // 投票事件
      if (type === 'vote') {
        if (description.includes('支持') || description.includes('反对')) {
          return {
            title: '🗳️ 投票表决',
            content: description,
            icon: '🗳️'
          };
        }
      }
      
      // 提案事件
      if (type === 'proposal') {
        return {
          title: '📝 提出提案',
          content: description,
          icon: '📝'
        };
      }
      
      // 资源分配事件
      if (type === 'resource') {
        return {
          title: '💎 资源分配',
          content: description,
          icon: '💎'
        };
      }
      
      // 默认事件
      return {
        title: `${type.toUpperCase()} 事件`,
        content: description,
        icon: getEventIcon(type)
      };
    } catch (error) {
      console.error('Error formatting event:', error, event);
      return {
        title: '事件',
        content: event.description || '未知事件',
        icon: '📋'
      };
    }
  };

  // 检查数据是否为空或无效
  const hasValidProposals = proposals && Array.isArray(proposals) && proposals.length > 0;
  const hasValidEvents = events && Array.isArray(events) && events.length > 0;

  // 检查是否有有效的分组数据
  const hasGroupedProposals = Object.keys(groupedProposals).length > 0;
  const hasGroupedEvents = Object.keys(groupedEvents).length > 0;

  return (
    <>
      <Card 
        title={activeTab === 'proposals' ? '智能体决议' : '运行记录'} 
        subtitle={
          <div className="space-y-2">
            {/* Tab切换 */}
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('proposals')}
                className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-all ${
                  activeTab === 'proposals'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                📋 决议
              </button>
              <button
                onClick={() => setActiveTab('events')}
                className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-all ${
                  activeTab === 'events'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                📜 日志
              </button>
            </div>

            {/* 统计信息 */}
            {activeTab === 'proposals' ? (
              <div className="pt-2 border-t border-cyan-500/20">
                <div className="text-gray-300 text-sm">
                  {hasValidProposals ? `${proposals.length} 项提案` : '暂无提案数据'}
                  {hasValidProposals && proposals.filter(p => p.status === 'voting').length > 0 && 
                    ` - ${proposals.filter(p => p.status === 'voting').length} 项表决中`
                  }
                </div>
                <div className="text-gray-400 text-xs mt-1">
                  共 {allDays.length} 个周期，{proposals.length} 项提案
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-cyan-500/20">
                <div className="text-gray-300 text-sm">
                  {hasValidEvents ? `${events.length} 条日志` : '暂无事件数据'} - 追踪AI动态
                </div>
                <div className="text-gray-400 text-xs mt-1">
                  共 {daysWithEvents.length} 个周期，{events.length} 条日志
                </div>
              </div>
            )}
          </div>
        }
        collapsible={false}
        glow
        className="h-full flex flex-col overflow-hidden"
      >
        {/* 内容区域 - Card已经提供滚动容器 */}
        <div className="flex-1 min-h-0">
          {activeTab === 'proposals' ? (
            <>
              {/* 提案列表 */}
              <div className="flex-1 min-h-0">
                {!hasValidProposals || !hasGroupedProposals ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-3xl mb-2">📋</div>
                    <div className="text-sm">暂无提案数据</div>
                    <div className="text-xs mt-2 text-gray-600">请点击"运行下一天"生成决议数据</div>
                  </div>
                ) : (
                  daysWithProposals.map((day) => {
                    const dayProposals = groupedProposals[day] || [];
                    
                    return (
                      <div key={day} className="mb-6 space-y-3">
                        {/* 周期标题 */}
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-1 h-6 bg-cyan-500 rounded-full"></div>
                          <h3 className="font-tech text-cyan-300 text-lg">
                            {formatDayDisplay(day)}
                          </h3>
                          <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                            {dayProposals.length} 项提案
                          </span>
                        </div>
                        
                        {/* 该周期内的提案 */}
                        {dayProposals.length === 0 ? (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            该周期暂无提案
                          </div>
                        ) : (
                          dayProposals.sort((a, b) => b.createdAt - a.createdAt).map((proposal) => (
                            <div
                              key={proposal.id}
                              className="cyber-border rounded-lg p-4 transition-all duration-300 hover:border-cyan-400/50 cursor-pointer overflow-hidden"
                              onClick={() => handleViewProposalDetail(proposal)}
                            >
                              {/* 提案头部 */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-3 mb-2 flex-wrap">
                                    <span className="text-2xl flex-shrink-0">{getStatusIcon(proposal.status)}</span>
                                    <h4 className="font-tech text-lg text-cyan-300">
                                      {proposal.type} - {proposal.proposer}
                                    </h4>
                                    <span className={`text-sm px-2 py-1 rounded flex-shrink-0 ${
                                      getProposalStatusColor(proposal.status)
                                    } bg-opacity-20`}>
                                      {proposal.status === 'pending' ? '等待中' :
                                       proposal.status === 'voting' ? '投票中' :
                                       proposal.status === 'approved' ? '已通过' : '已拒绝'}
                                    </span>
                                  </div>
                                  
                                  <div className="min-w-0">
                                    <p className="text-gray-300 text-sm leading-relaxed break-words whitespace-pre-wrap overflow-hidden max-h-12 max-w-full line-clamp-2">
                                      {truncateText(proposal.content, 120)}
                                    </p>
                                  </div>
                                  
                                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                                    <span>第{proposal.proposalDay || 1}周期发起</span>
                                    <span>投票数: {proposal.supporters.length + proposal.opposers.length}</span>
                                  </div>
                                </div>
                                
                                <div className="text-gray-400 text-sm ml-2">
                                  查看详情 →
                                </div>
                              </div>

                              {/* 投票进度（仅投票中） */}
                              {proposal.status === 'voting' && (
                                <div className="mt-3">
                                  <div className="flex justify-between text-xs text-gray-400 mb-2">
                                    <span>投票进度</span>
                                    <span>{getVotePercentage(proposal, 'support').toFixed(1)}% 支持</span>
                                  </div>
                                  <div className="w-full bg-gray-700 rounded-full h-2">
                                    <div className="flex h-2">
                                      <div 
                                        className="bg-green-500 transition-all duration-500"
                                        style={{ width: `${getVotePercentage(proposal, 'support')}%` }}
                                      ></div>
                                      <div 
                                        className="bg-red-500 transition-all duration-500"
                                        style={{ width: `${getVotePercentage(proposal, 'oppose')}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <>
              {/* 事件列表 */}
              <div className="flex-1 min-h-0">
                {!hasValidEvents || !hasGroupedEvents ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-3xl mb-2">📜</div>
                    <div className="text-sm">暂无事件数据</div>
                    <div className="text-xs mt-2 text-gray-600">请点击"运行下一天"生成日志数据</div>
                  </div>
                ) : (
                  daysWithEvents.map((day) => {
                    const dayEvents = groupedEvents[day] || [];
                    
                    return (
                      <div key={day} className="mb-6 space-y-3">
                        {/* 周期标题 */}
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-1 h-6 bg-cyan-500 rounded-full"></div>
                          <h3 className="font-tech text-cyan-300 text-lg">
                            {formatDayDisplay(day)}
                          </h3>
                          <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                            {dayEvents.length} 条日志
                          </span>
                        </div>
                        
                        {/* 该周期内的事件 */}
                        {dayEvents.length === 0 ? (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            该周期暂无日志
                          </div>
                        ) : (
                          dayEvents.sort((a, b) => b.timestamp - a.timestamp).map((event) => (
                            <div
                              key={event.id}
                              className="cyber-border rounded-lg p-4 transition-all duration-300 hover:border-cyan-400/50 cursor-pointer overflow-hidden"
                              onClick={() => handleViewEventDetail(event)}
                            >
                              {(() => {
                                const formatted = formatEventDisplay(event);
                                return (
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                                      <span className="text-2xl flex-shrink-0">{formatted.icon}</span>
                                      <div className="flex-1 min-w-0">
                                        <h5 className="font-tech text-cyan-300 text-base mb-1 truncate">
                                          {formatted.title}
                                        </h5>
                                        <div className="min-w-0">
                                          <p className="text-gray-300 text-sm leading-relaxed break-words whitespace-pre-wrap overflow-hidden max-h-12 max-w-full line-clamp-2">
                                            {truncateText(formatted.content, 120)}
                                          </p>
                                        </div>
                                        {event.actors && event.actors.length > 0 && (
                                          <div className="mt-2 flex flex-wrap gap-1">
                                            {event.actors.map((actor: string, idx: number) => (
                                              <span key={idx} className="px-2 py-0.5 bg-cyan-900/30 text-cyan-300 rounded text-xs truncate max-w-20">
                                                {actor}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                        <div className="flex items-center space-x-3 mt-2 text-xs text-gray-400">
                                          <span>{formatTime(event.timestamp)}</span>
                                          {event.emotionalImpact !== undefined && (
                                            <span className={`flex items-center ${getEmotionalColor(event.emotionalImpact)}`}>
                                              {getEmotionalIcon(event.emotionalImpact)} {event.emotionalImpact > 0 ? '+' : ''}{event.emotionalImpact}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="text-gray-400 text-sm ml-2 flex-shrink-0">
                                      查看详情 →
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </Card>

      {/* 详情弹窗 */}
      <Modal
        isOpen={modalOpen && !!modalContent}
        onClose={handleCloseModal}
        title={modalContent?.type === 'proposal' ? modalContent.data.type + ' - ' + modalContent.data.proposer : modalContent?.data.type.toUpperCase() + ' 事件'}
        subtitle={modalContent?.type === 'proposal' ? '提案详情' : '事件详情'}
        size="lg"
      >
        {modalContent?.type === 'proposal' && (
          <div className="space-y-4">
            <div className="cyber-border rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-tech text-cyan-300 text-sm">📝 提案信息</h4>
                <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                  第{modalContent.data.proposalDay || 1}周期发起
                </span>
              </div>
              <div className="text-gray-300 leading-relaxed">{modalContent.data.content}</div>
            </div>

            {/* 投票进度 */}
            {modalContent.data.status === 'voting' && (
              <div className="cyber-border rounded-lg p-4">
                <h4 className="font-tech text-cyan-300 text-sm mb-3">📊 投票进度</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-400">支持: {modalContent.data.supporters.length}</span>
                    <span className="text-red-400">反对: {modalContent.data.opposers.length}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="flex h-2">
                      <div
                        className="bg-green-500"
                        style={{ width: `${getVotePercentage(modalContent.data, 'support')}%` }}
                      ></div>
                      <div
                        className="bg-red-500"
                        style={{ width: `${getVotePercentage(modalContent.data, 'oppose')}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 投票记录 */}
            {modalContent.data.voteHistory && modalContent.data.voteHistory.length > 0 && (
              <div className="cyber-border rounded-lg p-4">
                <h4 className="font-tech text-cyan-300 text-sm mb-3">🗳️ 投票记录</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {modalContent.data.voteHistory.map((vote: VoteRecord, index: number) => (
                    <div 
                      key={index}
                      className="flex items-start justify-between p-2 rounded bg-gray-800/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-cyan-300">{vote.aiName}</span>
                          <span className={`text-sm px-2 py-0.5 rounded ${
                            vote.vote === 'support' 
                              ? 'bg-green-900/50 text-green-400' 
                              : 'bg-red-900/50 text-red-400'
                          }`}>
                            {vote.vote === 'support' ? '👍 支持' : '👎 反对'}
                          </span>
                        </div>
                        {vote.reasoning && (
                          <div className="text-xs text-gray-400 mt-1">{vote.reasoning}</div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 ml-2">
                        {formatTime(vote.timestamp)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 投票操作 */}
            {modalContent.data.status === 'voting' && (
              <div className="flex space-x-3 justify-end">
                <Button
                  variant="success"
                  onClick={() => onVote?.(modalContent.data.id, 'support')}
                >
                  👍 支持提案
                </Button>
                <Button
                  variant="danger"
                  onClick={() => onVote?.(modalContent.data.id, 'oppose')}
                >
                  👎 反对提案
                </Button>
              </div>
            )}
          </div>
        )}

        {modalContent?.type === 'event' && (
          <div className="space-y-4">
            <div className="text-gray-300 leading-relaxed">{modalContent.data.description}</div>
            
            {/* 参与者 */}
            {modalContent.data.actors?.length > 0 && (
              <div>
                <h4 className="font-tech text-cyan-300 text-sm mb-2">参与者</h4>
                <div className="flex flex-wrap gap-2">
                  {modalContent.data.actors.map((actor: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-cyan-900/30 text-cyan-300 rounded text-sm">
                      {actor}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 详细信息 */}
            {modalContent.data.details && Object.keys(modalContent.data.details).length > 0 && (
              <div className="cyber-border rounded-lg p-4">
                <h4 className="font-tech text-cyan-300 text-sm mb-2">📋 详细信息</h4>
                <div className="space-y-2 text-sm">
                  {Object.entries(modalContent.data.details).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-400">{key}:</span>
                      <span>{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};
