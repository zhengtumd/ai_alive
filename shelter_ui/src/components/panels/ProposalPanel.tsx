import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  formatTime, 
  getProposalStatusColor, 
  getVoteAnalysisDescription,
  truncateText 
} from '@/utils';
import type { Proposal, VoteAnalysis } from '@/types';

interface ProposalPanelProps {
  proposals: Proposal[];
  voteAnalyses: VoteAnalysis[];
  onVote?: (proposalId: string, vote: 'support' | 'oppose') => void;
}

export const ProposalPanel: React.FC<ProposalPanelProps> = ({
  proposals,
  voteAnalyses,
  onVote,
}) => {
  const [expandedProposal, setExpandedProposal] = useState<string | null>(null);

  const getVoteAnalysis = (proposalId: string): VoteAnalysis | undefined => {
    return voteAnalyses.find(analysis => analysis.proposalId === proposalId);
  };

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

  const getVoteIntensity = (analysis: VoteAnalysis): string => {
    if (analysis.controversyScore >= 80) return '激烈争议';
    if (analysis.controversyScore >= 60) return '意见分歧';
    if (analysis.controversyScore >= 40) return '温和讨论';
    return '一致倾向';
  };

  const renderVoteProgress = (proposal: Proposal) => {
    const supportPercent = getVotePercentage(proposal, 'support');
    const opposePercent = getVotePercentage(proposal, 'oppose');
    const totalVotes = proposal.supporters.length + proposal.opposers.length;

    return (
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-400">
          <span>投票进度 ({totalVotes} 票)</span>
          <span>{supportPercent.toFixed(1)}% 支持 / {opposePercent.toFixed(1)}% 反对</span>
        </div>
        
        <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
          <div className="flex h-2">
            <div 
              className="bg-green-500 transition-all duration-500"
              style={{ width: `${supportPercent}%` }}
            ></div>
            <div 
              className="bg-red-500 transition-all duration-500"
              style={{ width: `${opposePercent}%` }}
            ></div>
          </div>
        </div>
        
        <div className="flex justify-between text-xs">
          <span className="text-green-400">支持: {proposal.supporters.length}</span>
          <span className="text-red-400">反对: {proposal.opposers.length}</span>
        </div>
      </div>
    );
  };

  const renderVoteDetails = (proposal: Proposal) => {
    const analysis = getVoteAnalysis(proposal.id);
    
    return (
      <div className="mt-4 space-y-3">
        {/* 投票分析 */}
        {analysis && (
          <div className="cyber-border rounded p-3 bg-gray-800/30">
            <h5 className="font-tech text-cyan-300 text-sm mb-2">📊 投票分析</h5>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-400">投票强度</span>
                <div className="text-cyan-300">{getVoteIntensity(analysis)}</div>
              </div>
              <div>
                <span className="text-gray-400">争议程度</span>
                <div className="text-purple-300">{analysis.controversyScore.toFixed(0)}/100</div>
              </div>
              <div>
                <span className="text-gray-400">关键影响者</span>
                <div className="text-yellow-300">{analysis.keyInfluencers.join(', ')}</div>
              </div>
              <div>
                <span className="text-gray-400">总体倾向</span>
                <div className="text-green-300">{getVoteAnalysisDescription(analysis)}</div>
              </div>
            </div>
          </div>
        )}

        {/* 投票理由 */}
        {proposal.voteReasoning && Object.keys(proposal.voteReasoning).length > 0 && (
          <div className="cyber-border rounded p-3 bg-gray-800/30">
            <h5 className="font-tech text-cyan-300 text-sm mb-2">💭 AI投票理由</h5>
            <div className="space-y-2 text-xs">
              {Object.entries(proposal.voteReasoning).map(([aiName, reasoning]) => (
                <div key={aiName} className="flex justify-between">
                  <span className="text-gray-400">{aiName}:</span>
                  <span className="text-gray-300 text-right">{reasoning}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 投票历史 */}
        {proposal.voteHistory.length > 0 && (
          <div className="cyber-border rounded p-3 bg-gray-800/30">
            <h5 className="font-tech text-cyan-300 text-sm mb-2">📋 投票时间线</h5>
            <div className="space-y-1 text-xs max-h-32 overflow-y-auto cyber-scrollbar">
              {proposal.voteHistory.map((vote, index) => (
                <div key={index} className="flex justify-between items-center py-1 border-b border-gray-700/50 last:border-0">
                  <span className={`px-2 py-1 rounded ${
                    vote.vote === 'support' ? 'vote-support' : 'vote-oppose'
                  }`}>
                    {vote.aiName}
                  </span>
                  <span className="text-gray-400">{formatTime(vote.timestamp)}</span>
                  <span className={`text-xs ${
                    vote.vote === 'support' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {vote.vote === 'support' ? '👍 支持' : '👎 反对'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 投票操作 */}
        {proposal.status === 'voting' && (
          <div className="flex space-x-3 justify-end">
            <Button 
              variant="success" 
              size="sm"
              onClick={() => onVote?.(proposal.id, 'support')}
            >
              👍 支持提案
            </Button>
            <Button 
              variant="danger" 
              size="sm"
              onClick={() => onVote?.(proposal.id, 'oppose')}
            >
              👎 反对提案
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card 
      title="智能体决议" 
      subtitle={`${proposals.length} 项提案 - ${proposals.filter(p => p.status === 'voting').length} 项表决中`}
      collapsible={false}
      glow
      className="h-full flex flex-col overflow-hidden"
    >
      <div className="flex flex-col h-full">
        {/* 过滤器 */}
        <div className="flex flex-wrap gap-1 pb-2 border-b border-cyan-500/30 flex-shrink-0">
          <button className="px-2 py-1 rounded text-xs font-medium bg-cyan-500 text-white">
            全部
          </button>
          <button className="px-2 py-1 rounded text-xs font-medium bg-gray-700 text-gray-300 hover:bg-gray-600">
            投票中
          </button>
          <button className="px-2 py-1 rounded text-xs font-medium bg-gray-700 text-gray-300 hover:bg-gray-600">
            已通过
          </button>
          <button className="px-2 py-1 rounded text-xs font-medium bg-gray-700 text-gray-300 hover:bg-gray-600">
            已拒绝
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto cyber-scrollbar">
          <div className="space-y-3 pb-3">
            {proposals.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <div className="text-2xl mb-1">📋</div>
                <div className="text-sm">暂无提案</div>
              </div>
            ) : (
              proposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className={`cyber-border rounded-lg p-3 transition-all duration-300 ${
                    expandedProposal === proposal.id ? 'border-cyan-400/50' : 'hover:border-cyan-400/30'
                  }`}
                >
                  {/* 提案头部 */}
                  <div 
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => setExpandedProposal(
                      expandedProposal === proposal.id ? null : proposal.id
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-xl">{getStatusIcon(proposal.status)}</span>
                        <h4 className="font-tech text-lg text-cyan-300">
                          {proposal.type} - {proposal.proposer}
                        </h4>
                        <span className={`text-sm px-2 py-1 rounded ${
                          getProposalStatusColor(proposal.status)
                        } bg-opacity-20`}>
                          {proposal.status === 'pending' ? '等待中' :
                           proposal.status === 'voting' ? '投票中' :
                           proposal.status === 'approved' ? '已通过' : '已拒绝'}
                        </span>
                      </div>
                      
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {expandedProposal === proposal.id 
                          ? proposal.content 
                          : truncateText(proposal.content, 100)}
                      </p>
                      
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                        <span>创建时间: {formatTime(proposal.createdAt)}</span>
                        <span>提案人: {proposal.proposer}</span>
                        <span>投票数: {proposal.supporters.length + proposal.opposers.length}</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-gray-400 text-sm">点击{expandedProposal === proposal.id ? '收起' : '展开'}</div>
                    </div>
                  </div>

                  {/* 投票进度 */}
                  {proposal.status === 'voting' && renderVoteProgress(proposal)}

                  {/* 展开的详细信息 */}
                  {expandedProposal === proposal.id && renderVoteDetails(proposal)}
                </div>
              ))
            )}

            {/* 统计摘要 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-cyan-500/30">
              <div className="text-center">
                <div className="text-cyan-300 font-tech text-lg">
                  {proposals.filter(p => p.status === 'voting').length}
                </div>
                <div className="text-gray-400 text-sm">进行中</div>
              </div>
              <div className="text-center">
                <div className="text-green-300 font-tech text-lg">
                  {proposals.filter(p => p.status === 'approved').length}
                </div>
                <div className="text-gray-400 text-sm">已通过</div>
              </div>
              <div className="text-center">
                <div className="text-red-300 font-tech text-lg">
                  {proposals.filter(p => p.status === 'rejected').length}
                </div>
                <div className="text-gray-400 text-sm">已拒绝</div>
              </div>
              <div className="text-center">
                <div className="text-yellow-300 font-tech text-lg">
                  {proposals.reduce((sum, p) => sum + p.supporters.length + p.opposers.length, 0)}
                </div>
                <div className="text-gray-400 text-sm">总投票数</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
