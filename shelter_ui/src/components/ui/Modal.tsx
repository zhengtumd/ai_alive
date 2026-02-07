import React, { useEffect, useCallback } from 'react';
import { clsx } from 'clsx';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  className,
  size = 'md',
}) => {
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* 背景遮罩 - 科幻风格 */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      
      {/* 扫描线效果 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute w-full h-px bg-cyan-500/20"
          style={{
            animation: 'scanLine 3s linear infinite',
          }}
        />
      </div>

      {/* 模态框容器 */}
      <div 
        className={clsx(
          'relative w-full mx-4',
          sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 科幻边框效果 */}
        <div className="relative bg-gray-900 border-2 border-cyan-500/50 rounded-lg overflow-hidden"
          style={{
            boxShadow: `
              0 0 0 1px rgba(6, 182, 212, 0.3),
              0 0 30px rgba(6, 182, 212, 0.2),
              inset 0 0 60px rgba(6, 182, 212, 0.05)
            `,
          }}
        >
          {/* 角落装饰 */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />

          {/* 头部 */}
          {(title || subtitle) && (
            <div className="relative px-6 py-4 border-b border-cyan-500/30 bg-gradient-to-r from-cyan-900/20 to-transparent">
              <div className="flex items-center justify-between">
                <div>
                  {title && (
                    <h3 className="text-xl font-cyber text-cyan-300 gradient-text">
                      {title}
                    </h3>
                  )}
                  {subtitle && (
                    <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-cyan-300 transition-colors text-2xl leading-none"
                  style={{ textShadow: '0 0 10px rgba(6, 182, 212, 0.5)' }}
                >
                  ×
                </button>
              </div>
              
              {/* 科技线条装饰 */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-cyan-500/50 via-cyan-300/30 to-transparent" />
            </div>
          )}

          {/* 内容区域 */}
          <div className="p-6 max-h-[70vh] overflow-y-auto cyber-scrollbar">
            {children}
          </div>

          {/* 底部装饰 */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
        </div>

        {/* 外部光晕效果 */}
        <div 
          className="absolute -inset-1 bg-cyan-500/10 rounded-lg -z-10 blur-xl"
        />
      </div>

      <style>{`
        @keyframes scanLine {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};
