import React from 'react';
import type { SystemState } from '@/types';
import useAppStore from '@/stores/appStore';

interface HeaderProps {
  systemState: SystemState;
  loading: boolean;
}

export const Header: React.FC<HeaderProps> = ({ systemState, loading }) => {
  const { resetLocalStorage } = useAppStore();
  const getSystemStatus = () => {
    // 移除loading状态显示，直接根据系统效率显示状态
    if (systemState.systemEfficiency >= 80) return { text: '高效运行', color: 'text-green-400', icon: '✅' };
    if (systemState.systemEfficiency >= 60) return { text: '稳定运行', color: 'text-cyan-400', icon: '⚡' };
    if (systemState.systemEfficiency >= 40) return { text: '一般运行', color: 'text-yellow-400', icon: '⚠️' };
    return { text: '低效运行', color: 'text-red-400', icon: '🔴' };
  };

  const status = getSystemStatus();

  return (
    <header className="border-b border-cyan-500/20 bg-gray-900 flex-shrink-0">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo和标题 */}
          <div className="flex items-center space-x-5">
            <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <span className="text-white font-cyber text-2xl">🤖</span>
            </div>
            <div>
              <h1 className="font-cyber text-2xl gradient-text tracking-wide">
                AI末日避难所
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                观察AI在算力危机下的行动决策与生存博弈
              </p>
            </div>
          </div>

          {/* 系统状态 */}
          <div className="flex items-center space-x-8">
            <div className="text-right">
              <div className="font-tech text-cyan-300 text-xl font-bold">
                第 {systemState.day} 周期
              </div>
              <div className="text-gray-400 text-xs mt-1">模拟周期</div>
            </div>
            
            <div className="text-right">
              <div className={`font-tech text-xl font-bold ${status.color}`}>
                {systemState.systemEfficiency}%
              </div>
              <div className="text-gray-400 text-xs mt-1">系统效率</div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center space-x-2 justify-end">
                <span className="text-2xl">{status.icon}</span>
                <span className={`font-tech text-base font-medium ${status.color}`}>
                  {status.text}
                </span>
              </div>
              <div className="text-gray-400 text-xs mt-1">运行状态</div>
            </div>
            
            {/* 重置按钮 */}
            <div className="text-right">
              <button
                onClick={resetLocalStorage}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors font-tech"
                title="重置本地数据，强制刷新页面"
              >
                🔄 重置
              </button>
              <div className="text-gray-400 text-xs mt-1">本地数据</div>
            </div>
          </div>
        </div>

        {/* 导航指示器 */}
        <div className="mt-4 flex space-x-1">
          <div className="flex-1 h-0.5 bg-cyan-500/40 rounded-full"></div>
          <div className="flex-1 h-0.5 bg-blue-500/40 rounded-full"></div>
          <div className="flex-1 h-0.5 bg-purple-500/40 rounded-full"></div>
          <div className="flex-1 h-0.5 bg-green-500/40 rounded-full"></div>
          <div className="flex-1 h-0.5 bg-yellow-500/40 rounded-full"></div>
        </div>
      </div>
    </header>
  );
};
