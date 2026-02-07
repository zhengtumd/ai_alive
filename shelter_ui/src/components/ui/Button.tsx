import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'cyber' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'default',
  size = 'md',
  glow = false,
  className,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-tech font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-500';
  
  const variantClasses = {
    default: 'bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600',
    cyber: 'bg-cyan-900/50 text-cyan-300 hover:bg-cyan-800/70 border border-cyan-500/50 hover:border-cyan-400/70',
    danger: 'bg-red-900/50 text-red-300 hover:bg-red-800/70 border border-red-500/50 hover:border-red-400/70',
    success: 'bg-green-900/50 text-green-300 hover:bg-green-800/70 border border-green-500/50 hover:border-green-400/70',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm rounded-md',
    md: 'px-4 py-2 text-base rounded-lg',
    lg: 'px-6 py-3 text-lg rounded-xl',
  };

  const glowClass = glow ? 'ring-2 ring-cyan-500/50' : '';

  return (
    <button
      className={clsx(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        glowClass,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};