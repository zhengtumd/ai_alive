import React, { useRef, useEffect, useState, useMemo } from 'react';

function PublicMessages({ messages, onClearMessages }) {
  const scrollRef = useRef();
  const [autoScroll, setAutoScroll] = useState(true);
  const messagesEndRef = useRef(null);
  const prevMessageCountRef = useRef(0);

  // 按天数分组消息
  const groupedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return {};

    const groups = {};
    messages.forEach(msg => {
      const day = msg.day !== undefined ? msg.day : 0;
      if (!groups[day]) groups[day] = [];
      groups[day].push(msg);
    });
    return groups;
  }, [messages]);

  // 获取排序后的天数列表（从大到小）
  const sortedDays = useMemo(() => {
    return Object.keys(groupedMessages).map(Number).sort((a, b) => b - a);
  }, [groupedMessages]);

  // 当有新消息时自动滚动到顶部（因为最新的在顶部）
  useEffect(() => {
    if (autoScroll && scrollRef.current && messages.length > prevMessageCountRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, autoScroll]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop } = scrollRef.current;
      setAutoScroll(scrollTop < 50); // 接近顶部时启用自动滚动
    }
  };

  return (
    <div className="panel public-messages">
      <div className="panel-header">
        <h3>📢 公共消息</h3>
        <div className="panel-actions">
          <span className="message-count">{messages?.length || 0} 条</span>
          {messages?.length > 0 && (
            <button
              className="clear-button"
              onClick={onClearMessages}
              title="清空消息"
            >
              🗑️
            </button>
          )}
        </div>
      </div>
      <div
        className="messages-container"
        ref={scrollRef}
        onScroll={handleScroll}
      >
        {messages?.length ? (
          <div className="messages-list">
            {sortedDays.map(day => (
              <div key={day} className="day-group">
                <div className="day-header">第 {day} 天</div>
                {groupedMessages[day].map((msg, idx) => (
                  <div key={msg.id || `${day}-${idx}`} className="message-item">
                    <div className="message-header">
                      <span className="message-sender">{msg.from}</span>
                    </div>
                    <div className="message-content">{msg.text}</div>
                  </div>
                ))}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <p>暂无消息</p>
            <p className="empty-hint">AI会在这里进行公开交流</p>
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

export default PublicMessages;