import React, { useState, useEffect } from 'react';

function MessageTransmit({ from, to }) {
  const [positions, setPositions] = useState({ from: { x: 0, y: 0 }, to: { x: 0, y: 0 } });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 获取AI卡片的位置
    const getAIPosition = (aiName) => {
      const element = document.querySelector(`[data-ai="${aiName}"]`);
      if (element) {
        const rect = element.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2 + window.scrollX,
          y: rect.top + rect.height / 2 + window.scrollY
        };
      }
      return { x: 0, y: 0 };
    };

    const fromPos = getAIPosition(from);
    const toPos = getAIPosition(to);

    setPositions({ from: fromPos, to: toPos });
    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [from, to]);

  if (!visible) return null;

  const angle = Math.atan2(positions.to.y - positions.from.y, positions.to.x - positions.from.x);
  const distance = Math.sqrt(
    Math.pow(positions.to.x - positions.from.x, 2) +
    Math.pow(positions.to.y - positions.from.y, 2)
  );

  return (
    <div
      className={`message-transmit ${visible ? 'active' : ''}`}
      style={{
        left: positions.from.x,
        top: positions.from.y,
        width: distance,
        transform: `rotate(${angle}rad)`,
        transformOrigin: '0 0'
      }}
    >
      <div className="transmit-content">💬</div>
    </div>
  );
}

export default MessageTransmit;