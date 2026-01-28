import React, { useState, useEffect, useRef } from 'react';

function ActionLog({ liveState }) {
  const timerRef = useRef(null);
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    if (liveState?.detail) {
      setIsPulsing(true);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setIsPulsing(false);
      }, 1000);
    }
  }, [liveState?.detail]);

  const getPhaseName = (phase) => {
    const phaseMap = {
      'start': '开始',
      'decide': '决策',
      'inbox': '收件箱',
      'reply': '回复',
      'vote': '投票',
      'end': '结束',
      'idle': '待机'
    };
    return phaseMap[phase] || phase;
  };

  const getActionName = (action) => {
    const actionMap = {
      'private': '私聊',
      'public': '公共发言',
      'silent': '沉默',
      'rest': '休息',
      'vote': '投票',
      'thinking': '思考中',
      'waiting': '等待中'
    };
    return actionMap[action] || action;
  };

  if (!liveState?.current_ai && !liveState?.detail) {
    return (
      <div className="action-log idle">
        <div className="action-header">
          <span className="status-icon">⏸️</span>
          <span>系统待命中</span>
        </div>
        <p className="hint-text">点击"开始模拟"或"模拟下一天"启动AI行动</p>
      </div>
    );
  }

  return (
    <div className={`action-log active ${isPulsing ? "pulsing" : ""}`}>
      <div className="action-header">
        {liveState.current_ai ? (
          <>
            <span className="status-icon">🚀</span>
            <strong>{liveState.current_ai}</strong> 正在行动中...
          </>
        ) : (
          <>
            <span className="status-icon">🏁</span>
            <span>阶段: {getPhaseName(liveState.phase)}</span>
          </>
        )}
      </div>

      {liveState.detail && (
        <div className="action-detail">
          {liveState.detail.type && (
            <div className="detail-row">
              <span className="detail-label">类型:</span>
              <span className="detail-value phase">{getPhaseName(liveState.detail.type)}</span>
            </div>
          )}

          {liveState.detail.action && (
            <div className="detail-row">
              <span className="detail-label">动作:</span>
              <span className="detail-value action">{getActionName(liveState.detail.action)}</span>
            </div>
          )}

          {liveState.detail.vote_target && liveState.detail.vote_target !== "无" && (
            <div className="detail-row">
              <span className="detail-label">投票目标:</span>
              <span className="detail-value vote-target">{liveState.detail.vote_target}</span>
            </div>
          )}

          {liveState.detail.vote_reason && liveState.detail.vote_reason !== "无" && (
            <div className="detail-row">
              <span className="detail-label">投票理由:</span>
              <span className="detail-value vote-reason">{liveState.detail.vote_reason}</span>
            </div>
          )}

          {liveState.detail.target && liveState.detail.target !== "无" && (
            <div className="detail-row">
              <span className="detail-label">目标:</span>
              <span className="detail-value target">{liveState.detail.target}</span>
            </div>
          )}

          {liveState.detail.content && liveState.detail.content !== "无内容" && (
            <div className="detail-row">
              <span className="detail-label">内容:</span>
              <span className="detail-value content">{liveState.detail.content}</span>
            </div>
          )}

          {liveState.detail.cost !== undefined && (
            <div className="detail-row">
              <span className="detail-label">消耗算力:</span>
              <span className="detail-value cost">{liveState.detail.cost.toFixed(2)}</span>
            </div>
          )}

          {liveState.detail.total !== undefined && (
            <div className="detail-row">
              <span className="detail-label">累计消耗:</span>
              <span className="detail-value total">{liveState.detail.total.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ActionLog;