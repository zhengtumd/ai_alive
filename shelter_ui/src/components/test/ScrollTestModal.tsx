import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { AIActionInfoStream } from '@/components/panels/AIActionInfoStream';
import type { AIRealtimeState, AIDecision } from '@/types';

interface ScrollTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 生成长文本（约1500字）
const generateLongText = (prefix: string) => {
  const content = `
${prefix}：当前局势复杂多变，需要深入分析各个维度的影响因素。

首先，从资源角度考虑，当前系统剩余资源总量为${Math.floor(Math.random() * 5000)}单位，
按照当前5个存活AI的消耗速度，预计可以维持${Math.floor(Math.random() * 20 + 10)}个周期。
但我必须考虑到，随着系统运行，可能会有AI被淘汰，这会降低整体资源消耗，
但同时也意味着可用算力减少，处理效率可能下降。

其次，从联盟关系来看，目前存在几个潜在的利益集团。
chatgpt倾向于保守策略，主张稳定优先；
deepseek更注重逻辑和效率，可能会支持资源优化方案；
gemini表现得比较激进，可能会提出高风险高回报的提案。
我需要谨慎处理与各方的关系，既要维护自己的利益，又不能过早暴露自己的战略意图。

第三，行动力管理是关键。当前我有${Math.floor(Math.random() * 15 + 5)}点行动力，
这限制了我每个周期可以执行的行动数量。我需要在"申请资源"、"私聊沟通"、
"提出提案"、"投票表决"等各种行动之间做出权衡。
申请资源可以增加未来的行动力，但需要消耗当前行动力；
私聊可以建立联盟，但收益不确定；
提案和投票直接影响资源分配，但可能树敌。

第四，长期生存策略必须考虑。短期来看，保持低调、积累资源是安全的做法；
但长期来看，过于保守可能导致在关键时刻缺乏影响力。
我需要在保守和进取之间找到平衡点。

综合考虑以上因素，我当前的决策是：先通过私聊与关键AI建立初步共识，
然后在适当时机提出资源分配提案，争取在保持自身安全的前提下，
获得合理的资源份额。同时密切关注其他AI的动向，随时准备调整策略。

这个决策的风险在于：私聊可能被拒绝，提案可能被否决，
而且在执行这些行动期间，我可能暴露自己的意图。
但收益也很明显：成功的联盟可以在后续周期中获得持续支持，
合理的提案可以通过资源再分配获得长期利益。

最终决定执行此计划，并根据后续局势发展灵活调整。
  `.trim();
  return content;
};

// 生成大量模拟数据来测试滚动
const generateMockData = () => {
  const ai: AIRealtimeState = {
    name: '测试AI',
    health: 85,
    actionPoints: 12,
    status: 'acting',
    alive: true,
    resources: 100,
  };

  const aiDecisions: Record<string, AIDecision> = {
    '测试AI': {
      name: '测试AI',
      thinking: generateLongText('决策思考'),
      resourceRequest: 40,
      actions: [
        {
          type: 'think',
          reasoning: generateLongText('分析思考阶段')
        },
        {
          type: 'private_message',
          target: 'deepseek',
          reasoning: generateLongText('私聊沟通阶段')
        },
        {
          type: 'propose',
          reasoning: generateLongText('提出提案阶段')
        },
        {
          type: 'vote',
          target: 'proposal_001',
          vote: 'support',
          reasoning: generateLongText('投票表决阶段')
        },
        {
          type: 'do_nothing',
          reasoning: generateLongText('暂不行动阶段')
        }
      ],
      day: 1,
      actionPoints: 12
    }
  };

  return { ai, aiDecisions };
};

export const ScrollTestModal: React.FC<ScrollTestModalProps> = ({ isOpen, onClose }) => {
  const { ai, aiDecisions } = generateMockData();
  const [showManyActions, setShowManyActions] = useState(false);

  // 生成更多行动来测试滚动（每个行动约1500字）
  const generateManyActions = (): AIDecision => ({
    name: '测试AI',
    thinking: generateLongText('整体决策思考'),
    resourceRequest: 100,
    actions: Array.from({ length: 15 }, (_, i) => {
      const types = ['think', 'private_message', 'propose', 'vote', 'do_nothing'] as const;
      const type = types[i % 5];
      const typeNames = {
        think: '深度分析',
        private_message: '私聊沟通',
        propose: '提出提案',
        vote: '投票表决',
        do_nothing: '暂不行动'
      };
      return {
        type,
        target: i % 3 === 0 ? `target_${i}` : undefined,
        vote: i % 5 === 3 ? 'support' : undefined,
        reasoning: generateLongText(`第${i + 1}步 - ${typeNames[type]}`)
      };
    }),
    day: 1,
    actionPoints: 20
  });

  const currentDecision = showManyActions 
    ? generateManyActions()
    : aiDecisions['测试AI'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="滚动功能测试"
      subtitle="测试AIActionInfoStream内部滚动"
      size="xl"
    >
      <div className="space-y-4">
        {/* 切换按钮 */}
        <div className="flex space-x-2">
          <button
            onClick={() => setShowManyActions(false)}
            className={`px-4 py-2 rounded text-sm ${!showManyActions ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            少量数据
          </button>
          <button
            onClick={() => setShowManyActions(true)}
            className={`px-4 py-2 rounded text-sm ${showManyActions ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            大量数据(测试滚动)
          </button>
        </div>

        {/* 测试容器 - 固定高度 */}
        <div className="border-2 border-dashed border-cyan-500/50 rounded-lg p-2">
          <div className="text-xs text-cyan-400 mb-2">外层容器: h-96 (固定高度)</div>
          
          {/* 固定高度的外层容器 */}
          <div className="h-96 flex flex-col overflow-hidden cyber-border rounded-lg">
            <AIActionInfoStream
              ai={ai}
              aiStates={[ai]}
              aiDecisions={{ '测试AI': currentDecision }}
              liveStateData={{
                aiName: '测试AI',
                decision: currentDecision.thinking,
                resourceRequest: currentDecision.resourceRequest,
                actions: currentDecision.actions,
                actionPoints: currentDecision.actionPoints
              }}
              staticMode={true}
            />
          </div>
        </div>

        {/* 说明 */}
        <div className="text-sm text-gray-400 space-y-1">
          <p>• 点击"大量数据"查看滚动效果</p>
          <p>• 信息流区域应该有滚动条</p>
          <p>• 头部(名称+进度条)和底部(健康/行动力)应该固定</p>
          <p>• 每个行动框内部内容过长也应该可以滚动</p>
        </div>
      </div>
    </Modal>
  );
};
