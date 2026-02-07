import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { formatNumber, getProgressWidth, getUsageColor } from '@/utils';
import type { SystemState, AIRealTimeDecision } from '@/types';

interface ResourceTrackerPanelProps {
  systemState: SystemState;
  aiStates: AIRealTimeDecision[];
  noBorder?: boolean;
}

interface ResourceAllocation {
  aiName: string;
  resourceRequest: number;
  lastAllocated: number;
  timestamp: number;
}

export const ResourceTrackerPanel: React.FC<ResourceTrackerPanelProps> = ({
  systemState,
  aiStates,
  noBorder = false
}) => {
  const [resourceHistory, setResourceHistory] = useState<ResourceAllocation[]>([]);
  
  // 更新资源历史记录
  useEffect(() => {
    const newAllocations: ResourceAllocation[] = aiStates
      .filter(ai => ai.resourceRequest > 0)
      .map(ai => ({
        aiName: ai.aiName,
        resourceRequest: ai.resourceRequest,
        lastAllocated: ai.lastAllocated,
        timestamp: ai.timestamp
      }));
    
    if (newAllocations.length > 0) {
      setResourceHistory(prev => {
        const combined = [...prev, ...newAllocations];
        // 保留最近20条记录
        return combined.slice(-20);
      });
    }
  }, [aiStates]);

  const getRemainingColor = (percentage: number) => {
    // 剩余百分比：剩余越多越安全
    if (percentage >= 70) return 'text-green-400';
    if (percentage >= 50) return 'text-cyan-400';
    if (percentage >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const resourceRemaining = systemState.totalResources > 0
    ? (systemState.remainingResources / systemState.totalResources) * 100
    : 0;

  const tokenRemaining = systemState.tokenBudget > 0
    ? ((systemState.tokenBudget - systemState.totalTokenConsumed) / systemState.tokenBudget) * 100
    : 0;

  // 计算当前活跃的AI资源请求
  const activeRequests = aiStates.filter(ai => ai.resourceRequest > 0);
  const totalRequested = activeRequests.reduce((sum, ai) => sum + ai.resourceRequest, 0);
  const totalAllocated = activeRequests.reduce((sum, ai) => sum + ai.lastAllocated, 0);

  return (
    <Card 
      title="资源追踪器" 
      subtitle="实时监控AI资源申请与分配"
      collapsible
      defaultCollapsed={false}
      glow
      noBorder={noBorder}
      className="h-full"
    >
      <div className="space-y-4">
        {/* 资源概览 */}
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
                <div className="w-full relative">
                  <div className="w-full bg-gray-800/80 rounded-full h-2 relative overflow-hidden border border-gray-600/50">
                    <div
                      className="h-2 rounded-full transition-all duration-500 relative overflow-hidden"
                      style={{ width: `${resourceRemaining}%` }}
                    >
                      {/* 主渐变效果 */}
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400"></div>
                      
                      {/* 发光效果 */}
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/30 via-blue-500/30 to-purple-500/30 blur-sm"></div>
                      
                      {/* 扫描线效果 */}
                      <div 
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        style={{
                          animation: 'scanline 2s linear infinite',
                          width: '30%',
                          transform: `translateX(${getProgressWidth(systemState.remainingResources, systemState.totalResources) !== '0%' ? parseFloat(getProgressWidth(systemState.remainingResources, systemState.totalResources)) * 0.7 : -30}%)`
                        }}
                      ></div>
                    </div>
                    
                    {/* 网格背景 */}
                    <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-transparent 50%, rgba(6, 182, 212, 0.1) 50%" 
                         style={{backgroundSize: '4px 4px'}}></div>
                  </div>
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

        {/* 实时申请统计 */}
        {activeRequests.length > 0 && (
          <div className={noBorder ? "p-3" : "cyber-border rounded-lg p-3"}>
            <h4 className="font-tech text-yellow-300 text-sm mb-3">🔍 当前申请统计</h4>
            
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-cyan-300 font-tech text-sm">{activeRequests.length}</div>
                  <div className="text-gray-400 text-xs">活跃AI</div>
                </div>
                <div>
                  <div className="text-orange-300 font-tech text-sm">{formatNumber(totalRequested)}</div>
                  <div className="text-gray-400 text-xs">总申请量</div>
                </div>
                <div>
                  <div className="text-green-300 font-tech text-sm">{formatNumber(totalAllocated)}</div>
                  <div className="text-gray-400 text-xs">总分配量</div>
                </div>
              </div>
              
              {/* 申请分配比例 */}
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>申请/分配比例</span>
                  <span>
                    {totalRequested > 0 ? ((totalAllocated / totalRequested) * 100).toFixed(1) : '0'}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div 
                    className="h-1.5 rounded-full bg-gradient-to-r from-orange-500 to-green-500 transition-all duration-500"
                    style={{ 
                      width: totalRequested > 0 ? `${(totalAllocated / totalRequested) * 100}%` : '0%' 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 最近资源分配记录 */}
        {resourceHistory.length > 0 && (
          <div className={noBorder ? "p-3" : "cyber-border rounded-lg p-3"}>
            <h4 className="font-tech text-cyan-300 text-sm mb-3">📊 最近分配记录</h4>
            
            <div className="space-y-2 max-h-32 overflow-y-auto cyber-scrollbar">
              {resourceHistory.slice(-5).reverse().map((allocation, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <div className="text-cyan-300">{allocation.aiName}</div>
                  <div className="flex items-center space-x-2">
                    <span className="text-orange-300">申请:{allocation.resourceRequest}</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-green-300">分配:{allocation.lastAllocated}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 系统效率统计 */}
        <div className="grid grid-cols-3 gap-2">
          <div className={noBorder ? "p-2 text-center" : "cyber-border rounded p-2 text-center"}>
            <div className="text-xl mb-1">⚡</div>
            <div className={`font-tech text-sm mb-1 ${systemState.systemEfficiency >= 80 ? 'text-green-400' : systemState.systemEfficiency >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
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
      </div>
    </Card>
  );
};