import React, { useState, useEffect } from 'react';
import MessageTransmit from './MessageTransmit';

const DEFAULT_PROMPT_COST = 100;

function AIStatus({ aiList, liveState }) {
  const [communicatingAI, setCommunicatingAI] = useState(null);
  const [launchEffects, setLaunchEffects] = useState([]);

  // 检测通讯状态
  useEffect(() => {
    if (liveState?.detail?.type === 'reply' && liveState.detail.action === '私聊回复') {
      // 当有回复时，标记目标AI为通讯状态
      setCommunicatingAI(liveState.detail.target);

      // 添加发射效果
      const sourceAI = liveState.current_ai;
      const targetAI = liveState.detail.target;

      if (sourceAI && targetAI) {
        setLaunchEffects(prev => [
          ...prev,
          { id: Date.now(), from: sourceAI, to: targetAI }
        ]);
      }

      // 3秒后清除通讯状态
      const timer = setTimeout(() => {
        setCommunicatingAI(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [liveState]);

  // 移除过期的发射效果
  useEffect(() => {
    if (launchEffects.length > 0) {
      const timer = setTimeout(() => {
        setLaunchEffects(prev => prev.slice(1));
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [launchEffects]);

  return (
    <div className="ai-status-container">
      {launchEffects.map(effect => (
        <MessageTransmit
          key={effect.id}
          from={effect.from}
          to={effect.to}
          aiList={aiList}
        />
      ))}

      {aiList.map((agent) => {
        const isCurrent = liveState?.current_ai === agent.name;
        const isAlive = agent.alive !== false;
        const baseCost = agent.base_prompt_cost ?? DEFAULT_PROMPT_COST;
        const defaultCost = agent.default_prompt_cost || DEFAULT_PROMPT_COST;
        const healthPercentage = (baseCost / defaultCost) * 100;
        const isCommunicating = communicatingAI === agent.name ||
                               (launchEffects.some(effect =>
                                 effect.from === agent.name || effect.to === agent.name
                               ));

        return (
          <div
            key={agent.name}
            className={`ai-card ${isAlive ? "" : "dead"} ${isCurrent ? "active" : ""} ${isCommunicating ? "communicating" : ""} ${healthPercentage <= 30 ? "low-health" : healthPercentage <= 60 ? "medium-health" : ""}`}
            title={`${agent.name} - 当前算力: ${baseCost.toFixed(1)} (${healthPercentage.toFixed(1)}%)`}
            data-ai={agent.name}
          >
            {/* 发射效果点 */}
            {launchEffects.some(effect => effect.from === agent.name) && (
              <div className="message-launch active"></div>
            )}

            <div className="ai-avatar">
              {isAlive ? "🤖" : "💀"}
              {isCurrent && <div className="pulse-dot"></div>}
            </div>

            {/* 如果这个AI是通讯目标，添加接收效果 */}
            {launchEffects.some(effect => effect.to === agent.name) && (
              <div className="message-receive"></div>
            )}

            <div className="ai-info">
              <div className="ai-name-row">
                <span className="ai-name">{agent.name}</span>
                {isCurrent && <span className="current-badge">行动中</span>}
              </div>

              <div className="ai-health">
                <div className="health-bar">
                  <div className="health-bar-bg"></div>
                  <div
                    className="health-bar-fill"
                    style={{
                      width: `${Math.min(100, Math.max(0, healthPercentage))}%`,
                      background: healthPercentage <= 30 ? "#ff4444" :
                                 healthPercentage <= 60 ? "#ffaa00" : "#4caf50"
                    }}
                  ></div>
                </div>
                <div className="health-info">
                  <span className="health-text">
                    {isAlive ? `${Math.round(baseCost)}/${Math.round(defaultCost)}` : '离线'}
                  </span>
                  <span className="health-status">
                    {isAlive ? (agent.base_prompt_cost > 0 ? '存活' : '濒危') : '淘汰'}
                  </span>
                </div>
              </div>

              <div className="ai-stats">
                <div className="stat-item">
                  <span className="stat-label">消耗:</span>
                  <span className="stat-value">{Math.round(agent.total_spent || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default AIStatus;