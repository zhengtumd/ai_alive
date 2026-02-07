import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: React.ReactNode;
  glow?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  noBorder?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  title,
  subtitle,
  glow = false,
  collapsible = false,
  defaultCollapsed = false,
  noBorder = false,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  return (
    <div className={clsx(
      !noBorder && 'data-panel',
      noBorder && 'p-0',
      glow && !noBorder && 'ring-2 ring-cyan-500/50',
      'h-full flex flex-col overflow-hidden',
      className
    )}>
      {/* 固定标题区域 */}
      {(title || collapsible) && (
        <div className={clsx(
          "flex items-center justify-between px-4 py-3 flex-shrink-0",
          !noBorder && "border-b border-cyan-500/30 bg-gray-900/50"
        )}>
          <div>
            {title && (
              <h3 className="text-lg font-cyber text-cyan-300 gradient-text">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {collapsible && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm"
            >
              {isCollapsed ? '展开' : '折叠'}
            </button>
          )}
        </div>
      )}
      
      {/* 可滚动内容区域 */}
      {!isCollapsed && (
        <div className="flex-1 min-h-0 overflow-y-auto cyber-scrollbar">
          {children}
        </div>
      )}
    </div>
  );
};
