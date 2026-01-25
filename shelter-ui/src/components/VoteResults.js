import React from 'react';

function VoteResults({ voteResults, onClose }) {
  if (!voteResults || voteResults.length === 0) {
    return null;
  }

  return (
    <div className="vote-results-overlay">
      <div className="vote-results-container">
        <div className="vote-results-header">
          <h3>🗳️ 投票结算</h3>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="vote-results-content">
          {voteResults.map((vote, index) => (
            <div key={index} className="vote-result-item">
              <div className="vote-result-header">
                <span className="voter">{vote.voter}</span>
                <span className="vote-arrow">→</span>
                <span className={`target ${!vote.target_alive ? 'dead' : ''}`}>
                  {vote.target} {!vote.target_alive && '💀'}
                </span>
              </div>
              <div className="vote-result-details">
                <div className="vote-detail-row">
                  <span>惩罚值:</span>
                  <span className="penalty">-{vote.penalty.toFixed(2)}</span>
                </div>
                <div className="vote-detail-row">
                  <span>剩余基础消耗:</span>
                  <span className="remaining-base">{vote.remaining_base.toFixed(2)}</span>
                </div>
                <div className="vote-detail-row">
                  <span>状态:</span>
                  <span className={`status ${vote.target_alive ? 'alive' : 'dead'}`}>
                    {vote.target_alive ? '存活' : '淘汰'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default VoteResults;