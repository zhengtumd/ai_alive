import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { ControlState } from '@/types';

interface ControlPanelProps {
  controlState: ControlState;
  loading: boolean;
  onRunNextDay: () => void;
  onResetSystem: () => void;
  onSetAutoRun: (autoRun: boolean) => void;
  onSetSpeed: (speed: 'slow' | 'normal' | 'fast') => void;
  onLoadMockData?: () => void;
  noBorder?: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  controlState,
  loading,
  onRunNextDay,
  onResetSystem,
  onSetAutoRun,
  onSetSpeed,
  onLoadMockData,
  noBorder = false,
}) => {
  const speedLabels = {
    slow: '🐢 慢速 (10秒/次)',
    normal: '🚶 正常 (5秒/次)',
    fast: '⚡ 快速 (2秒/次)',
  };

  const getStatusIcon = () => {
    if (loading) return '🔄';
    if (controlState.autoRun) return '🎮';
    return '⏸️';
  };

  const getStatusColor = () => {
    if (loading) return 'text-yellow-400';
    if (controlState.autoRun) return 'text-green-400';
    return 'text-gray-400';
  };

  const getStatusText = () => {
    if (loading) return '处理中...';
    if (controlState.autoRun) return '自动运行中';
    return '等待指令';
  };

  return (
    <Card 
      title="避难所控制台" 
      subtitle="末日生存系统指挥中心"
      collapsible
      defaultCollapsed={false}
      glow
      noBorder={noBorder}
      className="h-full"
    >
      <div className="space-y-4">
        {/* 状态指示器 */}
        <div className={noBorder ? "p-3" : "cyber-border rounded-lg p-3 bg-gray-800/50"}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xl">{getStatusIcon()}</span>
              <div>
                <h4 className={`font-tech text-sm ${getStatusColor()}`}>
                  {getStatusText()}
                </h4>
                <p className="text-gray-400 text-xs">
                  更新: {new Date(controlState.lastUpdate).toLocaleTimeString('zh-CN')}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-cyan-300 font-tech text-sm">
                {controlState.speed === 'slow' ? '🐢' : 
                 controlState.speed === 'normal' ? '🚶' : '⚡'}
              </div>
              <div className="text-gray-400 text-xs">速度</div>
            </div>
          </div>
        </div>

        {/* 主要控制按钮 */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="cyber"
            size="sm"
            onClick={onRunNextDay}
            disabled={loading || controlState.autoRun}
            glow={!loading && !controlState.autoRun}
            className="w-full h-12"
          >
            <div className="flex items-center justify-center space-x-1">
              <span className="text-lg">⏭️</span>
              <div className="text-left">
                <div className="font-tech text-xs">运行下一天</div>
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
            <div className="flex items-center justify-center space-x-1">
              <span className="text-lg">🔄</span>
              <div className="text-left">
                <div className="font-tech text-xs">重置系统</div>
              </div>
            </div>
          </Button>
        </div>

        {/* 自动运行控制 */}
        <div className={noBorder ? "p-3" : "cyber-border rounded-lg p-3"}>
          <h4 className="font-tech text-cyan-300 text-sm mb-2">🤖 自动运行</h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-200 text-xs">自动模式</div>
                <div className="text-gray-400 text-xs">系统自动推进</div>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={controlState.autoRun}
                  onChange={(e) => onSetAutoRun(e.target.checked)}
                  className="sr-only peer"
                  disabled={loading}
                />
                <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-200 text-xs">速度设置</div>
                <div className="text-gray-400 text-xs">控制推进速度</div>
              </div>
              
              <div className="flex space-x-1">
                {(['slow', 'normal', 'fast'] as const).map((speed) => (
                  <button
                    key={speed}
                    onClick={() => onSetSpeed(speed)}
                    disabled={loading}
                    className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                      controlState.speed === speed
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {speedLabels[speed].split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {controlState.autoRun && (
            <div className="mt-2 p-2 bg-green-900/20 border border-green-500/30 rounded">
              <div className="flex items-center space-x-1 text-green-300 text-xs">
                <span>💡</span>
                <span>自动运行: {controlState.updateInterval / 1000}秒/天</span>
              </div>
            </div>
          )}
        </div>

        {/* 开发工具 */}
        {onLoadMockData && (
          <div className={noBorder ? "p-3" : "cyber-border rounded-lg p-3"}>
            <h4 className="font-tech text-yellow-300 text-sm mb-2">🔧 开发工具</h4>
            
            <div className="space-y-2">
              <Button
                variant="default"
                size="sm"
                onClick={onLoadMockData}
                className="w-full"
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>🧪</span>
                  <span className="text-xs">加载模拟数据</span>
                </div>
              </Button>
              
              <div className="text-xs text-gray-500 text-center">
                开发测试用
              </div>
            </div>
          </div>
        )}

        {/* 系统提示 */}
        <div className={noBorder ? "p-2" : "cyber-border rounded-lg p-2 bg-gray-800/30"}>
          <h4 className="font-tech text-cyan-300 text-xs mb-1">💡 提示</h4>
          <ul className="text-xs text-gray-400 space-y-0.5">
            <li>• 手动/自动推进模拟</li>
            <li>• 调整速度控制节奏</li>
            <li>• 重置系统重新开始</li>
            <li>• 观察AI社会动态</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};