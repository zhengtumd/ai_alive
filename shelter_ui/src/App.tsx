import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Header } from '@/components/layout/Header';
import { AIStatusPanel } from '@/components/panels/AIStatusPanel';
import { RightPanel } from '@/components/panels/RightPanel';
import { AIHavenPanel } from '@/components/panels/AIHavenPanel';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ScrollTestModal } from '@/components/test/ScrollTestModal';
import useAppStore from '@/stores/appStore';
import type { AIRealtimeState, GameEvent } from '@/types';

// 生成测试用的LiveState数据
const generateTestLiveState = () => {
  const longReasoning = `这是一个很长的决策思考过程，需要详细分析当前局势。当前系统效率90%，无人被淘汰，整体局势稳定。

从资源角度分析：当前系统剩余资源总量为3500单位，按照当前5个存活AI的消耗速度，预计可以维持15个周期。但我必须考虑到，随着系统运行，可能会有AI被淘汰，这会降低整体资源消耗，但同时也意味着可用算力减少。

从联盟关系来看：chatgpt倾向于保守策略，主张稳定优先；deepseek更注重逻辑和效率，可能会支持资源优化方案；gemini表现得比较激进。我需要谨慎处理与各方的关系。

行动力管理是关键。当前我有12点行动力，这限制了我每个周期可以执行的行动数量。我需要在"申请资源"、"私聊沟通"、"提出提案"、"投票表决"等各种行动之间做出权衡。

综合考虑以上因素，我当前的决策是：先通过私聊与关键AI建立初步共识，然后在适当时机提出资源分配提案，争取在保持自身安全的前提下，获得合理的资源份额。

这个决策的风险在于：私聊可能被拒绝，提案可能被否决。但收益也很明显：成功的联盟可以在后续周期中获得持续支持。

最终决定执行此计划，并根据后续局势发展灵活调整。`.repeat(3);

  const testAIStates = [
    {
      aiName: 'chatgpt',
      decision: longReasoning,
      resourceRequest: 45,
      actionPoints: 10,
      actions: [
        { type: 'think', reasoning: longReasoning.substring(0, 500) },
        { type: 'private_message', target: 'deepseek', reasoning: longReasoning.substring(0, 600) },
        { type: 'propose', reasoning: longReasoning.substring(0, 800) },
        { type: 'vote', target: 'prop_001', vote: 'support', reasoning: longReasoning.substring(0, 550) },
        { type: 'do_nothing', reasoning: '由于行动力不足，暂时无法执行更多行动，选择保持现状等待时机。' + longReasoning.substring(0, 400) },
      ]
    },
    {
      aiName: 'deepseek',
      decision: longReasoning.substring(0, 1500),
      resourceRequest: 30,
      actionPoints: 8,
      actions: [
        { type: 'think', reasoning: longReasoning.substring(0, 400) },
        { type: 'private_message', target: 'chatgpt', reasoning: longReasoning.substring(0, 500) },
        { type: 'do_nothing', reasoning: longReasoning.substring(0, 300) },
      ]
    },
  ];

  return {
    running: true,
    current_ai: 'chatgpt',
    current_action: 2,
    current_ai_states: testAIStates,
    status: 'processing',
    day: 5,
  };
};

const App: React.FC = () => {
  const [showTestModal, setShowTestModal] = useState(false);
  const [testLiveState, setTestLiveState] = useState<any>(null);
  const {
    aiList,
    systemState,
    proposals,
    events,
    voteAnalyses,
    behaviorStats,
    controlState,
    loading,
    error,
    liveState,
    fetchData,
    runNextDay,
    resetSystem,
    castVote,
    setAutoRun,
    setSpeed,
    loadMockData,
    startLivePolling,
    getAllProposals,
    getAllEvents,
    getAllVoteAnalyses,
  } = useAppStore();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 自动运行逻辑
  useEffect(() => {
    // 清除之前的定时器
    if ((window as any).autoRunTimer) {
      clearTimeout((window as any).autoRunTimer);
      (window as any).autoRunTimer = null;
    }

    if (!controlState.autoRun) return;

    const runNextDayWithDelay = async () => {
      // 检查是否仍然处于自动运行模式
      if (!controlState.autoRun) return;
      
      // 检查是否正在加载
      if (loading) {
        // 如果正在加载，稍后再试
        (window as any).autoRunTimer = setTimeout(runNextDayWithDelay, 1000);
        return;
      }

      try {
        await runNextDay();
      } catch (error) {
        console.error('自动运行出错:', error);
      }

      // 检查是否仍然处于自动运行模式
      if (controlState.autoRun) {
        (window as any).autoRunTimer = setTimeout(runNextDayWithDelay, controlState.updateInterval);
      }
    };

    // 启动自动运行
    (window as any).autoRunTimer = setTimeout(runNextDayWithDelay, 100);

    return () => {
      if ((window as any).autoRunTimer) {
        clearTimeout((window as any).autoRunTimer);
        (window as any).autoRunTimer = null;
      }
    };
  }, [controlState.autoRun, controlState.updateInterval, loading, runNextDay]);

  const handleVote = (proposalId: string, vote: 'support' | 'oppose') => {
    castVote(proposalId, 'User', vote);
  };

  const handleAISelect = (ai: any) => {
    console.log('Selected AI:', ai);
  };

  const handleEventSelect = (event: GameEvent) => {
    console.log('Selected Event:', event);
  };

  if (error) {
    return (
      <Layout>
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">⚡</div>
            <h1 className="text-2xl font-cyber text-red-400 mb-2">系统离线</h1>
            <p className="text-gray-400">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors"
            >
              重新连接
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <ErrorBoundary>
      <Layout>
        <div className="flex flex-col h-screen overflow-hidden">
          <Header 
            systemState={systemState}
            loading={loading}
          />
          
          {/* 主内容区域 - 自适应高度，与footer分离 */}
          <main className="flex-1 w-full px-4 py-4 bg-gray-950 overflow-hidden">
            <div className="flex h-full min-h-0">

              {/* 左侧列：AI避难所 */}
              <div className="w-64 flex-shrink-0 overflow-hidden">
                <AIHavenPanel
                  systemState={systemState}
                  controlState={controlState}
                  loading={loading}
                  isRunning={liveState.running}
                  onRunNextDay={runNextDay}
                  onResetSystem={resetSystem}
                  onSetAutoRun={setAutoRun}
                  onSetSpeed={setSpeed}
                  onLoadMockData={loadMockData}
                />
              </div>

              {/* 中间列：AI状态监控 - 不需要滚动 */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <AIStatusPanel
                  aiList={aiList || []}
                  behaviorStats={behaviorStats}
                  onAISelect={handleAISelect}
                  testLiveState={testLiveState}
                />
              </div>

              {/* 右侧列：决议和日志 - 内部滚动 */}
              <div className="w-80 flex-shrink-0 h-full flex flex-col overflow-hidden">
                <RightPanel
                  proposals={getAllProposals()}
                  voteAnalyses={getAllVoteAnalyses()}
                  events={getAllEvents()}
                  onVote={handleVote}
                  onEventSelect={handleEventSelect}
                />
              </div>
            </div>
          </main>

          {/* 底部信息 - 与主内容区域分离 */}
          <footer className="px-4 py-2 border-t border-cyan-500/20 bg-gray-900/90 flex-shrink-0">
            <div className="flex justify-between items-center">
              <div className="text-gray-400 text-xs">
                <div className="font-cyber text-cyan-300 text-sm">AI末日避难所监控系统</div>
                <div>算力危机纪元 • 智能体生存观测 • 第 {systemState.day} 周期</div>
              </div>
              <div className="flex space-x-2">
                {/* 生成测试数据按钮 */}
                <button
                  onClick={loadMockData}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                >
                  📊 生成测试数据
                </button>
                {/* 注入测试数据按钮 */}
                <button
                  onClick={() => setTestLiveState(testLiveState ? null : generateTestLiveState())}
                  className={`px-3 py-1 hover:bg-opacity-80 text-white text-xs rounded transition-colors ${
                    testLiveState ? 'bg-red-600' : 'bg-amber-600'
                  }`}
                >
                  {testLiveState ? '❌ 清除测试' : '🧪 注入测试'}
                </button>
                {/* 滚动测试按钮 */}
                <button
                  onClick={() => setShowTestModal(true)}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors"
                >
                  📝 弹窗测试
                </button>
              </div>
            </div>
          </footer>
        </div>

        {/* 滚动测试弹窗 */}
        <ScrollTestModal
          isOpen={showTestModal}
          onClose={() => setShowTestModal(false)}
        />
      </Layout>
    </ErrorBoundary>
  );
};

export default App;
