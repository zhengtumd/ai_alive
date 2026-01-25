import React from 'react';

const DEFAULT_PROMPT_COST = 100;

function AICard({ agent, isCurrent, isCommunicating, onCardClick, isAlive = true }) {
  const baseCost = agent.base_prompt_cost ?? DEFAULT_PROMPT_COST;
  const defaultCost = agent.default_prompt_cost || DEFAULT_PROMPT_COST;
  const healthPercentage = (baseCost / defaultCost) * 100;

  return (
    <div 
      className={`ai-card ${isCurrent ? 'current' : ''} ${isCommunicating ? 'communicating' : ''} ${!isAlive ? 'dead' : ''}`}
      onClick={onCardClick}
    >
      <div className="ai-avatar">
        {agent.name.substring(0, 2).toUpperCase()}
      </div>
      
      <div className="ai-info">
        <div className="ai-name">{agent.name}</div>
        <div className="ai-status">
          {isAlive ? (
            <span className="status-alive">存活</span>
          ) : (
            <span className="status-dead">淘汰</span>
          )}
        </div>
      </div>

      {isAlive && (
        <div className="ai-health">
          <div className="health-bar">
            <div 
              className="health-fill"
              style={{ width: `${healthPercentage}%` }}
            ></div>
          </div>
          <div className="health-text">
            {baseCost.toFixed(0)}/{defaultCost.toFixed(0)}
          </div>
        </div>
      )}

      <div className="ai-stats">
        <div className="stat-item">
          <span className="stat-label">消耗</span>
          <span className="stat-value">{Math.round(agent.total_spent || 0)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">记忆</span>
          <span className="stat-value">{agent.memory_len || 0}</span>
        </div>
      </div>

      {isCurrent && (
        <div className="pulse-animation">
          <div className="pulse-dot"></div>
        </div>
      )}
    </div>
  );
}

export default AICard;