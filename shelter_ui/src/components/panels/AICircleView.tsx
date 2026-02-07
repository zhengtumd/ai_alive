import React, { useState, useEffect } from 'react';
import type { AIRealtimeState, AIDecision } from '@/types';

interface AICircleViewProps {
  aiStates: AIRealtimeState[];
  selectedAI: string | null;
  onSelectAI: (name: string) => void;
  highlightAI?: string | null; // 新增：高亮显示的AI
}

// 机器人图标组件
const RobotAvatar: React.FC<{ health: number; status: string }> = ({ health, status }) => {
  const getHealthColor = (health: number) => {
    if (health >= 80) return '#10b981';
    if (health >= 60) return '#fbbf24';
    if (health >= 40) return '#f97316';
    return '#ef4444';
  };

  const color = status === 'dead' ? '#ef4444' : getHealthColor(health);
  
  return (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="none">
      {/* 机器人头部 */}
      <rect x="6" y="4" width="12" height="10" rx="2" stroke={color} strokeWidth="1.5" fill={`${color}20`} />
      {/* 眼睛 */}
      <circle cx="10" cy="8" r="1.5" fill={color} />
      <circle cx="14" cy="8" r="1.5" fill={color} />
      {/* 天线 */}
      <line x1="12" y1="4" x2="12" y2="2" stroke={color} strokeWidth="1.5" />
      <circle cx="12" cy="2" r="1" fill={color} />
      {/* 身体 */}
      <rect x="8" y="14" width="8" height="6" rx="1" stroke={color} strokeWidth="1.5" fill={`${color}10`} />
      {/* 胸口能量核心 */}
      <circle cx="12" cy="17" r="1.5" fill={color} opacity={0.8}>
        {status !== 'dead' && (
          <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
        )}
      </circle>
    </svg>
  );
};

export const AICircleView: React.FC<AICircleViewProps> = ({
  aiStates,
  selectedAI,
  onSelectAI,
  highlightAI,
}) => {
  const [hoveredAI, setHoveredAI] = useState<string | null>(null);
  const [animationFrame, setAnimationFrame] = useState(0);

  // 动画循环
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // 分离存活和死亡的AI
  const aliveAIs = aiStates.filter(ai => ai.alive);
  const deadAIs = aiStates.filter(ai => !ai.alive);

  // 如果AI数量超过8个，使用双环布局
  const useDoubleRing = aliveAIs.length > 8;
  
  // 内环和外环的AI分配
  const innerRingAIs = useDoubleRing ? aliveAIs.slice(0, Math.ceil(aliveAIs.length / 2)) : aliveAIs;
  const outerRingAIs = useDoubleRing ? aliveAIs.slice(Math.ceil(aliveAIs.length / 2)) : [];

  const centerX = 50;
  const centerY = 50;
  const innerRadius = 22;
  const outerRadius = 38;

  const getPosition = (index: number, total: number, radius: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    return {
      left: `${centerX + radius * Math.cos(angle)}%`,
      top: `${centerY + radius * Math.sin(angle)}%`,
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'thinking': return '#fbbf24';
      case 'acting': return '#06b6d4';
      case 'dead': return '#ef4444';
      default: return '#10b981';
    }
  };

  const renderAINode = (ai: AIRealtimeState, index: number, total: number, radius: number, isOuter: boolean = false) => {
    const pos = getPosition(index, total, radius);
    const isSelected = selectedAI === ai.name;
    const isHovered = hoveredAI === ai.name;
    const isHighlighted = highlightAI === ai.name; // 新增高亮判断
    const nodeSize = isOuter ? 44 : 52;

    return (
      <div
        key={ai.name}
        className="absolute cursor-pointer transition-all duration-300"
        style={{
          left: pos.left,
          top: pos.top,
          width: nodeSize,
          height: nodeSize,
          transform: 'translate(-50%, -50%)',
          zIndex: isHovered || isSelected ? 10 : 1,
        }}
        onClick={() => onSelectAI(ai.name)}
        onMouseEnter={() => setHoveredAI(ai.name)}
        onMouseLeave={() => setHoveredAI(null)}
      >
        {/* AI头像容器 */}
        <div
          className={`relative w-full h-full rounded-full flex items-center justify-center transition-all duration-300 ${
            isSelected ? 'scale-125' : isHighlighted ? 'scale-120' : isHovered ? 'scale-110' : ''
          }`}
          style={{
            background: `radial-gradient(circle, ${getStatusColor(ai.status)}30 0%, transparent 70%)`,
            boxShadow: isSelected ? `0 0 20px ${getStatusColor(ai.status)}` :
                      isHighlighted ? `0 0 30px ${getStatusColor('acting')}, 0 0 10px ${getStatusColor('acting')}` :
                      'none',
          }}
        >
          {/* 高亮指示器 */}
          {isHighlighted && (
            <div className="absolute -inset-2 rounded-full border-4 border-cyan-400 animate-pulse"></div>
          )}

          {/* 状态指示环 */}
          <div
            className="absolute inset-0 rounded-full border-2"
            style={{
              borderColor: getStatusColor(ai.status),
              opacity: ai.status === 'acting' ? 0.8 + Math.sin(animationFrame * 0.1) * 0.2 : 0.6,
            }}
          />

          {/* 机器人头像 */}
          <div className="w-3/4 h-3/4">
            <RobotAvatar health={ai.health} status={ai.status} />
          </div>

          {/* 生命值指示器 */}
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
            <div className="w-8 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${ai.health}%`,
                  backgroundColor: getStatusColor(ai.status),
                }}
              />
            </div>
          </div>
        </div>

        {/* AI名称 */}
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <span className={`text-xs font-tech ${isSelected ? 'text-cyan-300' : 'text-gray-400'}`}>
            {ai.name}
          </span>
        </div>

        {/* 当前行动提示 */}
        {ai.currentAction && (isHovered || isSelected) && (
          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
            <div className="bg-gray-800/90 px-2 py-1 rounded text-xs text-cyan-300 border border-cyan-500/30">
              {ai.currentAction}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="relative w-full h-full bg-gray-900/80 rounded-lg overflow-hidden cyber-border flex items-center justify-center"
      style={{ 
        minHeight: '400px', 
        minWidth: '400px',
        maxHeight: 'calc(100vh - 200px)',
        maxWidth: 'calc(100vh - 200px)'
      }}
    >
      {/* 背景装饰 - 限制在可见区域内 */}
      <div 
        className="absolute inset-0"
        style={{
          overflow: 'hidden',
          borderRadius: 'inherit'
        }}
      >
        {/* 中心圆 - 算力核心 */}
        <div 
          className="absolute rounded-full border-2 border-cyan-500/30 flex items-center justify-center"
          style={{
            width: '18%',
            height: '20%',
            left: `${centerX - 9}%`,
            top: `${centerY - 10}%`,
          }}
        >
          <div className="text-center">
            <div className="text-cyan-300 font-cyber text-sm">算力核心</div>
            <div className="text-gray-400 text-xs">{aliveAIs.length} 智能体</div>
          </div>
        </div>

        {/* 内环轨道 */}
        <div 
          className="absolute rounded-full border border-gray-700/50"
          style={{
            width: `${innerRadius * 2}%`,
            height: `${innerRadius * 2}%`,
            left: `${centerX - innerRadius}%`,
            top: `${centerY - innerRadius}%`,
          }}
        />

        {/* 外环轨道（如果有） */}
        {useDoubleRing && (
          <div 
            className="absolute rounded-full border border-gray-700/30"
            style={{
              width: `${outerRadius * 2}%`,
              height: `${outerRadius * 2}%`,
              left: `${centerX - outerRadius}%`,
              top: `${centerY - outerRadius}%`,
            }}
          />
        )}

        {/* 旋转的扫描线效果 */}
        <div 
          className="absolute"
          style={{
            width: `${(useDoubleRing ? outerRadius : innerRadius) * 2}%`,
            height: `${(useDoubleRing ? outerRadius : innerRadius) * 2}%`,
            left: `${centerX - (useDoubleRing ? outerRadius : innerRadius)}%`,
            top: `${centerY - (useDoubleRing ? outerRadius : innerRadius)}%`,
            background: `conic-gradient(from ${animationFrame}deg, transparent 0deg, rgba(6, 182, 212, 0.08) 60deg, transparent 120deg)`,
            borderRadius: '50%',
          }}
        />
      </div>

      {/* 内环AI节点 */}
      {innerRingAIs.map((ai, index) => renderAINode(ai, index, innerRingAIs.length, innerRadius))}

      {/* 外环AI节点 */}
      {outerRingAIs.map((ai, index) => renderAINode(ai, index, outerRingAIs.length, outerRadius, true))}

      {/* 死亡AI - 显示在底部 */}
      {deadAIs.length > 0 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2 flex-wrap px-4">
          {deadAIs.map(ai => (
            <div 
              key={ai.name}
              className="flex items-center space-x-1 px-2 py-1 bg-gray-800/80 rounded opacity-50"
            >
              <div className="w-4 h-4">
                <RobotAvatar health={0} status="dead" />
              </div>
              <span className="text-xs text-gray-500">{ai.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
