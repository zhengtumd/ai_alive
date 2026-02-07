import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { 
  formatTime, 
  getEventIcon, 
  getEmotionalColor,
  generateFunEventDescription,
  truncateText 
} from '@/utils';
import type { GameEvent } from '@/types';

interface ActionLogPanelProps {
  events: GameEvent[];
  onEventSelect?: (event: GameEvent) => void;
}

export const ActionLogPanel: React.FC<ActionLogPanelProps> = ({
  events,
  onEventSelect,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const eventTypes = [
    { value: 'all', label: '全部', icon: '🔍' },
    { value: 'action', label: '行动', icon: '⚡' },
    { value: 'vote', label: '投票', icon: '🗳️' },
    { value: 'proposal', label: '提案', icon: '📋' },
    { value: 'resource', label: '资源', icon: '🔑' },
    { value: 'elimination', label: '淘汰', icon: '💀' },
    { value: 'chat', label: '交流', icon: '💬' },
    { value: 'meeting', label: '会议', icon: '👥' },
  ];

  const filteredEvents = events.filter(event => 
    filterType === 'all' || event.type === filterType
  ).sort((a, b) => b.timestamp - a.timestamp);

  const getEventColor = (type: string): string => {
    const colors: Record<string, string> = {
      action: 'border-cyan-500/30',
      vote: 'border-blue-500/30',
      proposal: 'border-purple-500/30',
      resource: 'border-green-500/30',
      elimination: 'border-red-500/30',
      chat: 'border-yellow-500/30',
      meeting: 'border-orange-500/30',
    };
    return colors[type] || 'border-gray-500/30';
  };

  const getEmotionalIcon = (impact: number): string => {
    if (impact > 2) return '😄';
    if (impact > 0) return '🙂';
    if (impact === 0) return '😐';
    if (impact > -2) return '😕';
    return '😠';
  };

  const renderEventDetails = (event: GameEvent) => {
    return (
      <div className="mt-3 space-y-2">
        {/* 参与者信息 */}
        {event.actors.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-gray-400 text-xs">参与者:</span>
            <div className="flex flex-wrap gap-1">
              {event.actors.map((actor, index) => (
                <span key={index} className="px-2 py-1 bg-cyan-900/30 text-cyan-300 rounded text-xs">
                  {actor}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 情感影响 */}
        {event.emotionalImpact !== undefined && (
          <div className="flex items-center space-x-2">
            <span className="text-gray-400 text-xs">情感影响:</span>
            <span className={`text-xs ${getEmotionalColor(event.emotionalImpact)}`}>
              {getEmotionalIcon(event.emotionalImpact)} {event.emotionalImpact > 0 ? '+' : ''}{event.emotionalImpact}
            </span>
          </div>
        )}

        {/* 详细信息 */}
        {event.details && Object.keys(event.details).length > 0 && (
          <div className="cyber-border rounded p-2 bg-gray-800/30">
            <h6 className="font-tech text-cyan-300 text-xs mb-1">📋 详细信息</h6>
            <div className="text-xs text-gray-300 space-y-1">
              {Object.entries(event.details).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-400">{key}:</span>
                  <span>{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card 
      title="运行记录" 
      subtitle={`${events.length} 条日志 - 追踪AI动态`}
      collapsible={false}
      glow
      className="h-full flex flex-col overflow-hidden"
    >
      <div className="flex flex-col h-full">
        {/* 过滤器 */}
        <div className="flex flex-wrap gap-1 pb-2 border-b border-cyan-500/30 flex-shrink-0">
          {eventTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setFilterType(type.value)}
              className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
                filterType === type.value
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {type.icon} {type.label}
            </button>
          ))}
        </div>

        {/* 事件列表 */}
        <div className="flex-1 overflow-y-auto cyber-scrollbar">
          <div className="space-y-2 pb-3">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <div className="text-2xl mb-1">📜</div>
                <div className="text-sm">暂无事件记录</div>
              </div>
            ) : (
              filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className={`cyber-border rounded-lg p-2 transition-all duration-300 cursor-pointer hover:scale-[1.02] ${
                    getEventColor(event.type)
                  } ${expandedEvent === event.id ? 'border-cyan-400/50' : ''}`}
                  onClick={() => {
                    setExpandedEvent(expandedEvent === event.id ? null : event.id);
                    onEventSelect?.(event);
                  }}
                >
                  {/* 事件头部 */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getEventIcon(event.type)}</span>
                      <div>
                        <h5 className="font-tech text-cyan-300 text-sm">
                          {event.type.toUpperCase()} 事件
                        </h5>
                        <p className="text-gray-300 text-sm leading-tight">
                          {expandedEvent === event.id 
                            ? event.description 
                            : truncateText(event.description, 80)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-gray-400 text-xs">
                        {formatTime(event.timestamp)}
                      </div>
                      {event.emotionalImpact !== undefined && (
                        <div className={`text-xs mt-1 ${getEmotionalColor(event.emotionalImpact)}`}>
                          {getEmotionalIcon(event.emotionalImpact)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 展开的详细信息 */}
                  {expandedEvent === event.id && renderEventDetails(event)}

                  {/* 底部信息 */}
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-700/30">
                    <span className="text-gray-500 text-xs">
                      ID: {event.id.slice(-6)}
                    </span>
                    <span className="text-gray-400 text-xs">
                      点击{expandedEvent === event.id ? '收起' : '查看'}详情
                    </span>
                  </div>
                </div>
              ))
            )}

            {/* 统计摘要 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 mt-4 border-t border-cyan-500/30">
              <div className="text-center">
                <div className="text-cyan-300 font-tech text-lg">
                  {events.filter(e => e.type === 'action').length}
                </div>
                <div className="text-gray-400 text-sm">行动事件</div>
              </div>
              <div className="text-center">
                <div className="text-blue-300 font-tech text-lg">
                  {events.filter(e => e.type === 'vote').length}
                </div>
                <div className="text-gray-400 text-sm">投票事件</div>
              </div>
              <div className="text-center">
                <div className="text-purple-300 font-tech text-lg">
                  {events.filter(e => e.type === 'chat').length}
                </div>
                <div className="text-gray-400 text-sm">交流事件</div>
              </div>
              <div className="text-center">
                <div className="text-red-300 font-tech text-lg">
                  {events.filter(e => e.type === 'elimination').length}
                </div>
                <div className="text-gray-400 text-sm">淘汰事件</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
