import React from 'react';
import { Card } from '@/components/ui/Card';
import { 
  formatNumber, 
  getProgressWidth, 
  generateResourceAdvice,
  calculateEfficiencyTrend,
  getUsageColor
} from '@/utils';
import type { SystemState } from '@/types';

interface ResourcePanelProps {
  systemState: SystemState;
  noBorder?: boolean;
}

export const ResourcePanel: React.FC<ResourcePanelProps> = ({ systemState, noBorder = false }) => {
  const resourceRemaining = systemState.totalResources > 0
    ? (systemState.remainingResources / systemState.totalResources) * 100
    : 0;

  const tokenRemaining = systemState.tokenBudget > 0
    ? ((systemState.tokenBudget - systemState.totalTokenConsumed) / systemState.tokenBudget) * 100
    : 0;

  const resourceAdvice = generateResourceAdvice(systemState);

  const getEfficiencyTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '📊';
    }
  };

  const getRemainingColor = (percentage: number) => {
    // 剩余百分比：剩余越多越安全
    if (percentage >= 70) return 'text-green-400';
    if (percentage >= 50) return 'text-cyan-400';
    if (percentage >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 80) return 'text-green-400';
    if (efficiency >= 60) return 'text-yellow-400';
    if (efficiency >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  // 空状态处理
  if (systemState.day === 0 && systemState.totalResources === 0) {
    return (
      <Card 
        title="物资储备库" 
        subtitle="避难所生存资源统计"
        collapsible
        defaultCollapsed={false}
        glow
        noBorder={noBorder}
      >
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">⚡</div>
          <p>避难所系统离线或尚未启动</p>
          <p className="text-sm mt-2">等待避难所主控系统连接...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title="物资储备库" 
      subtitle={`末日第 ${systemState.day} 天 - ${systemState.allocationMethod}`}
      collapsible
      defaultCollapsed={false}
      glow
      noBorder={noBorder}
      className="h-full"
    >
      <div className="space-y-4">
        {/* 资源使用情况 */}
        <div className="grid grid-cols-2 gap-3">
          {/* 物资资源 */}
          <div className={noBorder ? "p-3" : "cyber-border rounded-lg p-3"}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-tech text-cyan-300 text-sm">📦 物资</h4>
              <span className={`text-xs font-medium ${getRemainingColor(resourceRemaining)}`}>
                {resourceRemaining.toFixed(1)}%
              </span>
            </div>
            
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>剩余/总量</span>
                  <span>{formatNumber(systemState.remainingResources)}/{formatNumber(systemState.totalResources)}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                    style={{ width: `${resourceRemaining}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-center">
                <div>
                  <div className="text-cyan-300 font-tech text-sm">{formatNumber(systemState.remainingResources)}</div>
                  <div className="text-gray-400 text-xs">剩余</div>
                </div>
                <div>
                  <div className="text-blue-300 font-tech text-sm">{formatNumber(systemState.totalResources - systemState.remainingResources)}</div>
                  <div className="text-gray-400 text-xs">已使用</div>
                </div>
              </div>
            </div>
          </div>

          {/* Token资源 */}
          <div className={noBorder ? "p-3" : "cyber-border rounded-lg p-3"}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-tech text-purple-300 text-sm">🔑 Token</h4>
              <span className={`text-xs font-medium ${getUsageColor(100 - tokenRemaining)}`}>
                {tokenRemaining.toFixed(1)}%
              </span>
            </div>
            
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>消耗/预算</span>
                  <span>{formatNumber(systemState.totalTokenConsumed)}/{formatNumber(systemState.tokenBudget)}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                    style={{ width: getProgressWidth(systemState.tokenBudget - systemState.totalTokenConsumed, systemState.tokenBudget) }}
                  ></div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-center">
                <div>
                  <div className="text-purple-300 font-tech text-sm">{formatNumber(systemState.tokenBudget - systemState.totalTokenConsumed)}</div>
                  <div className="text-gray-400 text-xs">剩余预算</div>
                </div>
                <div>
                  <div className="text-pink-300 font-tech text-sm">{formatNumber(systemState.totalTokenConsumed)}</div>
                  <div className="text-gray-400 text-xs">已消耗</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 系统效率和淘汰统计 */}
        <div className="grid grid-cols-3 gap-2">
          <div className={noBorder ? "p-2 text-center" : "cyber-border rounded p-2 text-center"}>
            <div className="text-xl mb-1">⚡</div>
            <div className={`font-tech text-sm mb-1 ${getEfficiencyColor(systemState.systemEfficiency)}`}>
              {systemState.systemEfficiency}%
            </div>
            <div className="text-gray-400 text-xs">效率</div>
          </div>
          
          <div className={noBorder ? "p-2 text-center" : "cyber-border rounded p-2 text-center"}>
            <div className="text-xl mb-1">💀</div>
            <div className="font-tech text-sm text-red-400 mb-1">
              {systemState.eliminationCount}
            </div>
            <div className="text-gray-400 text-xs">淘汰</div>
          </div>
          
          <div className={noBorder ? "p-2 text-center" : "cyber-border rounded p-2 text-center"}>
            <div className="text-xl mb-1">📅</div>
            <div className="font-tech text-sm text-cyan-300 mb-1">
              {systemState.day}
            </div>
            <div className="text-gray-400 text-xs">天数</div>
          </div>
        </div>

        {/* 分配策略和建议 */}
        <div className={noBorder ? "p-4" : "cyber-border rounded-lg p-4"}>
          <h4 className="font-tech text-yellow-300 text-lg mb-3">🎯 分配策略分析</h4>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">当前策略</span>
              <span className="text-cyan-300 font-tech">{systemState.allocationMethod}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-400">资源建议</span>
              <span className="text-green-300 text-sm">{resourceAdvice}</span>
            </div>
            
            <div className="bg-gray-800/50 rounded p-3 mt-2">
              <div className="text-xs text-gray-400 leading-relaxed">
                💡 <strong>系统洞察：</strong>当前资源分配策略正在有效运行。建议密切关注Token消耗趋势，
                确保系统在预算范围内保持高效运转。
              </div>
            </div>
          </div>
        </div>

        {/* 趣味性统计 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div className={noBorder ? "p-2" : "cyber-border rounded p-2"}>
            <div className="text-cyan-300 font-tech">{Math.round(resourceRemaining)}%</div>
            <div className="text-gray-500 text-xs">物资剩余率</div>
          </div>
          <div className={noBorder ? "p-2" : "cyber-border rounded p-2"}>
            <div className="text-purple-300 font-tech">{Math.round(tokenRemaining)}%</div>
            <div className="text-gray-500 text-xs">Token余量</div>
          </div>
          <div className={noBorder ? "p-2" : "cyber-border rounded p-2"}>
            <div className="text-green-300 font-tech">{systemState.systemEfficiency}%</div>
            <div className="text-gray-500 text-xs">运行效率</div>
          </div>
          <div className={noBorder ? "p-2" : "cyber-border rounded p-2"}>
            <div className="text-yellow-300 font-tech">{systemState.eliminationCount}</div>
            <div className="text-gray-500 text-xs">历史淘汰</div>
          </div>
        </div>
      </div>
    </Card>
  );
};