import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* 背景效果 */}
      <div className="fixed inset-0 bg-circuit-pattern bg-[length:50px_50px] opacity-10 pointer-events-none"></div>
      

      
      {/* 主要内容 */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};