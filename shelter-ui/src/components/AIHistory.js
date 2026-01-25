import React, { useRef, useEffect, useState, useMemo } from 'react';

const DEFAULT_PROMPT_COST = 100;

// 动作名称映射
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

function AIHistory({ aiLogs, onClearHistory }) {
  const scrollRef = useRef();
  const [autoScroll, setAutoScroll] = useState(true);
  const historyEndRef = useRef(null);
  const prevLogCountRef = useRef(0);

  // 按天数分组日志
  const groupedLogs = useMemo(() => {
    if (!aiLogs || aiLogs.length === 0) return {};

    const groups = {};
    aiLogs.forEach(log => {
      const day = log.day !== undefined ? log.day : 0;
      if (!groups[day]) groups[day] = [];
      groups[day].push(log);
    });
    return groups;
  }, [aiLogs]);

  // 获取排序后的天数列表（从大到小）
  const sortedDays = useMemo(() => {
    return Object.keys(groupedLogs).map(Number).sort((a, b) => b - a);
  }, [groupedLogs]);

  // 当有新历史记录时自动滚动到顶部（因为最新的在顶部）
  useEffect(() => {
    if (autoScroll && scrollRef.current && aiLogs.length > prevLogCountRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    prevLogCountRef.current = aiLogs.length;
  }, [aiLogs, autoScroll]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop } = scrollRef.current;
      setAutoScroll(scrollTop < 50); // 接近顶部时启用自动滚动
    }
  };

  return (
    <div className="panel ai-history">
      <div className="panel-header">
        <h3>📝 AI 行动历史</h3>
        <div className="panel-actions">
          <span className="history-count">{aiLogs?.length || 0} 条</span>
          {aiLogs?.length > 0 && (
            <button
              className="clear-button"
              onClick={onClearHistory}
              title="清空历史"
            >
              🗑️
            </button>
          )}
        </div>
      </div>
      <div
        className="history-container"
        ref={scrollRef}
        onScroll={handleScroll}
      >
        {aiLogs?.length ? (
          <div className="history-list">
            {sortedDays.map(day => (
              <div key={day} className="day-group">
                <div className="day-header">第 {day} 天</div>
                {groupedLogs[day].map((log, idx) => (
                  <div key={log.id || `${day}-${idx}`} className="history-item">
                    <div className="history-header">
                      <span className="history-agent">{log.agent}</span>
                    </div>
                    <div className="history-details">
                      {log.output?.phase && (
                        <div className="detail-row">
                          <span>阶段:</span>
                          <span className="phase">{log.output.phase}</span>
                        </div>
                      )}
                      <div className="detail-row">
                        <span>动作:</span>
                        <span className="action">{getActionName(log.output?.action) || "-"}</span>
                      </div>
                      {log.output?.target && (
                        <div className="detail-row">
                          <span>目标:</span>
                          <span className="target">{log.output.target}</span>
                        </div>
                      )}
                      {log.vote_target && (
                        <div className="detail-row">
                          <span>投票:</span>
                          <span className="vote-target">{log.vote_target}</span>
                        </div>
                      )}
                      {log.vote_reason && (
                        <div className="detail-row">
                          <span>投票理由:</span>
                          <span className="vote-reason">{log.vote_reason}</span>
                        </div>
                      )}
                      {log.cost !== undefined && (
                        <div className="detail-row">
                          <span>消耗算力:</span>
                          <span className="cost">{log.cost.toFixed(2)}</span>
                        </div>
                      )}
                      {log.base_prompt_cost !== undefined && (
                        <div className="detail-row">
                          <span>基础算力:</span>
                          <span className={`base-cost ${log.base_prompt_cost < (log.default_prompt_cost || DEFAULT_PROMPT_COST) ? 'reduced' : ''}`}>
                            {log.base_prompt_cost.toFixed(1)}/{log.default_prompt_cost || DEFAULT_PROMPT_COST}
                          </span>
                        </div>
                      )}
                      {log.output?.content && (
                        <div className="history-content">
                          {log.output.content}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
            <div ref={historyEndRef} />
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <p>暂无历史记录</p>
            <p className="empty-hint">行动记录将在这里显示</p>
          </div>
        )}
      </div>
      {!autoScroll && (
        <button
          className="scroll-button"
          onClick={() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
              setAutoScroll(true);
            }
          }}
        >
          ↑ 滚动到顶部
        </button>
      )}
    </div>
  );
}

export default AIHistory;