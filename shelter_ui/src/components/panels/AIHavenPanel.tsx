import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatNumber, getProgressWidth } from '@/utils';
import type { SystemState, ControlState } from '@/types';

interface AIHavenPanelProps {
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

export const AIHavenPanel: React.FC<AIHavenPanelProps> = ({
  systemState,
  controlState,
  loading,
  isRunning = false,
  onRunNextDay,
  onResetSystem,
  onSetAutoRun,
  onSetSpeed,
  onLoadMockData,
}) => {
  const [showInitPanel, setShowInitPanel] = useState(false);
  const isStarted = systemState.day >= 1;
  const isFirstDay = systemState.day === 1;

  // 快捷键监听器 - Ctrl+Alt+T 切换初始化面板
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setShowInitPanel(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
  const speedLabels = {
    slow: '🐢',
    normal: '🚶',
    fast: '⚡',
  };

  // 获取状态提示文本
  const getStatusText = () => {
    // 第一周期且还没点击开始
    if (systemState.day === 1) {
      return '未开始模拟';
    }
    // 自动运行中
    if (controlState.autoRun) {
      return '自动推演中';
    }
    // 正在运行中（执行当前周期）
    if (isRunning) {
      return '运行中';
    }
    // 周期执行完成
    return '该周期已执行完';
  };

  const tokenRemaining = systemState.tokenBudget > 0
    ? ((systemState.tokenBudget - systemState.totalTokenConsumed) / systemState.tokenBudget) * 100
    : 0;

  const getRemainingColor = (percentage: number) => {
    // percentage 表示剩余资源的百分比（剩余越多越安全）
    if (percentage >= 90) return 'text-green-400';
    if (percentage >= 70) return 'text-cyan-400';
    if (percentage >= 50) return 'text-yellow-400';
    if (percentage >= 30) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <Card 
      title="AI避难所" 
      subtitle="算力调度中心"
      collapsible={false}
      glow
      noBorder={false}
      className="h-full flex flex-col min-h-0"
    >
      <div className="flex-1 min-h-0 overflow-y-auto cyber-scrollbar pr-1">
        <div className="space-y-3">
          {/* 资源使用情况 - 两行布局 */}
          <div className="space-y-2">
            {/* 物资资源 - 第一行 */}
            <div className="cyber-border rounded-lg p-2">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-tech text-cyan-300 text-sm">📦 物资</h4>
                <span className={`text-xs font-medium ${getRemainingColor((systemState.remainingResources / systemState.totalResources) * 100)}`}>
                  {systemState.totalResources > 0 ? ((systemState.remainingResources / systemState.totalResources) * 100).toFixed(1) : '0'}%
                </span>
              </div>

              <div className="space-y-1">
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                    style={{ width: systemState.totalResources > 0 ? `${(systemState.remainingResources / systemState.totalResources) * 100}%` : '0%' }}
                  ></div>
                </div>

    <div className="grid grid-cols-2 gap-1 text-center">
      <div>
        <div className="text-blue-300 font-tech text-xs">{formatNumber(systemState.remainingResources)}</div>
        <div className="text-gray-400 text-xs">剩余</div>
      </div>
      <div>
        <div className="text-cyan-300 font-tech text-xs">{formatNumber(systemState.totalResources - systemState.remainingResources)}</div>
        <div className="text-gray-400 text-xs">已使用</div>
      </div>
    </div>
              </div>
            </div>

            {/* 算力资源 - 第二行 */}
            <div className="cyber-border rounded-lg p-2">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-tech text-purple-300 text-sm">🔑 Token</h4>
                <span className={`text-xs font-medium ${getRemainingColor(tokenRemaining)}`}>
                  {tokenRemaining.toFixed(1)}%
                </span>
              </div>
              
              <div className="space-y-1">
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div 
                    className="h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                    style={{ width: getProgressWidth(systemState.tokenBudget - systemState.totalTokenConsumed, systemState.tokenBudget) }}
                  ></div>
                </div>
                
                <div className="grid grid-cols-2 gap-1 text-center">
                  <div>
                    <div className="text-purple-300 font-tech text-xs">{formatNumber(systemState.tokenBudget)}</div>
                    <div className="text-gray-400 text-xs">总量</div>
                  </div>
                  <div>
                    <div className="text-pink-300 font-tech text-xs">{formatNumber(systemState.tokenBudget - systemState.totalTokenConsumed)}</div>
                    <div className="text-gray-400 text-xs">余量</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

            {/* 系统状态 */}
          <div className="cyber-border rounded-lg p-3 bg-gray-800/30">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-tech text-cyan-300 text-base">第 {systemState.day} 周期</h4>
                <p className="text-gray-400 text-xs mt-1">
                  {getStatusText()}
                </p>
              </div>
              
              <div className="text-right">
                <div className="text-cyan-300 text-2xl">
                  {speedLabels[controlState.speed]}
                </div>
                <div className="text-gray-400 text-xs mt-1">速度</div>
              </div>
            </div>
          </div>

          {/* 主要控制按钮 */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="cyber"
              size="sm"
              onClick={() => {
                console.log('点击按钮，loading:', loading);
                onRunNextDay();
              }}
              disabled={loading || controlState.autoRun}
              glow={!loading && !controlState.autoRun}
              className="w-full h-12"
            >
              <div className="flex items-center justify-center space-x-2">
                {loading ? (
                  <span className="text-xl animate-spin">⏳</span>
                ) : (
                  <span className="text-xl">{isFirstDay ? '🚀' : '⏭️'}</span>
                )}
                <div className="text-left">
                  <div className="font-tech text-xs">{loading ? '执行中' : (isFirstDay ? '开始模拟' : '下一周期')}</div>
                </div>
              </div>
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={onResetSystem}
              disabled={loading}
              className="w-full h-12"
            >
              <div className="flex items-center justify-center space-x-2">
                <span className="text-xl">🔄</span>
                <div className="text-left">
                  <div className="font-tech text-xs">重置系统</div>
                </div>
              </div>
            </Button>
          </div>

          {/* 自动运行控制 */}
          {isStarted && (
            <div className="cyber-border rounded-lg p-3">
              <h4 className="font-tech text-cyan-300 text-sm mb-2">🤖 自动推演</h4>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-200 text-sm">自动模式</div>
                    <div className="text-gray-400 text-xs">连续观测AI行为</div>
                  </div>
                  
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={controlState.autoRun}
                      onChange={(e) => onSetAutoRun(e.target.checked)}
                      className="sr-only peer"
                      disabled={loading}
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-200 text-sm">推演速度</div>
                  </div>
                  
                  <div className="flex space-x-2">
                    {(['slow', 'normal', 'fast'] as const).map((speed) => (
                      <button
                        key={speed}
                        onClick={() => onSetSpeed(speed)}
                        disabled={loading}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                          controlState.speed === speed
                            ? 'bg-cyan-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {speedLabels[speed]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 初始化数据 - 默认隐藏，按 Ctrl+Alt+T 显示 */}
          {showInitPanel && onLoadMockData && (
            <div className="cyber-border rounded-lg p-4">
              <h4 className="font-tech text-yellow-300 text-sm mb-3">🚀 系统初始化</h4>
              
              <Button
                variant="default"
                size="sm"
                onClick={onLoadMockData}
                disabled={isStarted || loading}
                className="w-full h-10"
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>⚡</span>
                  <span className="text-sm">生成智能体集群</span>
                </div>
              </Button>
              
              <div className="text-xs text-gray-500 text-center mt-3">
                创建初始AI观测样本
                <br />
                <span className="text-gray-600">快捷键: Ctrl+Alt+T</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default AIHavenPanel;
