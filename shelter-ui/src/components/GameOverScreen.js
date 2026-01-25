import React from 'react';

function GameOverScreen({ stats, onClose, onRestart }) {
  if (!stats) return null;

  const { 
    total_days, 
    total_consumed, 
    initial_tokens, 
    remaining_tokens, 
    alive_count, 
    ai_stats = [],
    efficiency 
  } = stats;

  const survivalRate = (alive_count / ai_stats.length) * 100;
  const resourceUsage = ((initial_tokens - remaining_tokens) / initial_tokens) * 100;

  return (
    <div className="game-over-overlay">
      <div className="game-over-container">
        <div className="game-over-header">
          <h1>💀 文明终结</h1>
          <p className="game-over-subtitle">避难所资源耗尽，AI文明走向终结</p>
        </div>

        <div className="game-over-stats">
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label">生存天数</span>
              <span className="stat-value">{total_days}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">总消耗算力</span>
              <span className="stat-value">{total_consumed.toFixed(0)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">存活AI</span>
              <span className="stat-value">{alive_count}/{ai_stats.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">资源利用率</span>
              <span className="stat-value">{resourceUsage.toFixed(1)}%</span>
            </div>
          </div>

          <div className="ai-ranking">
            <h3>🏆 AI消耗排行榜</h3>
            <div className="ranking-list">
              {ai_stats.map((ai, index) => (
                <div key={ai.name} className={`ranking-item ${index < 3 ? 'top-three' : ''}`}>
                  <span className="rank">
                    {index + 1}
                    {index === 0 && '🥇'}
                    {index === 1 && '🥈'}
                    {index === 2 && '🥉'}
                  </span>
                  <span className="ai-name">{ai.name}</span>
                  <span className={`status ${ai.alive ? 'alive' : 'dead'}`}>
                    {ai.alive ? '存活' : '淘汰'}
                  </span>
                  <span className="consumption">{ai.total_spent.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="summary">
            <h3>📊 生存分析</h3>
            <div className="summary-content">
              <p>平均日消耗：<strong>{efficiency.toFixed(0)}</strong> 算力/天</p>
              <p>生存率：<strong>{survivalRate.toFixed(1)}%</strong></p>
              <p>资源效率：<strong>{(total_consumed / total_days).toFixed(0)}</strong> 算力/天</p>
            </div>
          </div>
        </div>

        <div className="game-over-actions">
          <button className="restart-btn" onClick={onRestart}>
            🔄 重新开始
          </button>
          <button className="close-btn" onClick={onClose}>
            ❌ 关闭
          </button>
        </div>
      </div>
    </div>
  );
}

export default GameOverScreen;