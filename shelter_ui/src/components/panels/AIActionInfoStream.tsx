import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import type { AIRealtimeState, AIDecision, AIAction } from '@/types';

interface AIActionInfoStreamProps {
  ai: AIRealtimeState;
  aiStates: AIRealtimeState[];
  aiDecisions?: Record<string, AIDecision>;
  liveStateData?: any;
  staticMode?: boolean;
  maxVisibleSteps?: number;
  containerHeight?: string;
}

interface ActionStep {
  type: string;
  content: string;
  timestamp: number;
  isCollapsed?: boolean;
  isImportant?: boolean;
}

interface TooltipState {
  isVisible: boolean;
  content: string;
  x: number;
  y: number;
  type: string;
  stepIndex: number;
  isDragging?: boolean;
  dragOffset?: { x: number; y: number };
  width: number;
  height: number;
  isResizing?: boolean;
  resizeDirection?: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
  resizeStartSize?: { width: number; height: number };
  resizeStartPos?: { x: number; y: number };
}

const actionTypeInfo = {
  propose: { label: '提出提案', icon: '📝', color: 'text-blue-400', bgColor: 'bg-blue-500/20', tooltipBg: 'bg-blue-900/95' },
  vote: { label: '投票表决', icon: '🗳️', color: 'text-green-400', bgColor: 'bg-green-500/20', tooltipBg: 'bg-green-900/95' },
  private_message: { label: '私聊沟通', icon: '💬', color: 'text-purple-400', bgColor: 'bg-purple-500/20', tooltipBg: 'bg-purple-900/95' },
  do_nothing: { label: '无行动', icon: '⏸️', color: 'text-gray-400', bgColor: 'bg-gray-500/20', tooltipBg: 'bg-gray-900/95' },
  think: { label: '分析思考', icon: '🧠', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', tooltipBg: 'bg-cyan-900/95' },
};

export const AIActionInfoStream: React.FC<AIActionInfoStreamProps> = ({
  ai,
  aiStates,
  aiDecisions,
  liveStateData,
  staticMode = false,
  maxVisibleSteps = 5,
  containerHeight = '400px',
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [actionStream, setActionStream] = useState<ActionStep[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const stepsContainerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<number>(0);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  const formatResourceRequest = (value: number) => {
    if (value === Infinity || value === -Infinity) {
      return '∞';
    }
    if (value > 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value > 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value;
  };

  const { decision, actions } = useMemo(() => {
    let decisionData: AIDecision | undefined = aiDecisions?.[ai.name];
    if (liveStateData) {
      decisionData = {
        name: ai.name,
        thinking: liveStateData.decision,
        resourceRequest: liveStateData.resourceRequest,
        actions: liveStateData.actions || [],
        day: 1,
        actionPoints: liveStateData.actionPoints
      };
    }
    return { decision: decisionData, actions: decisionData?.actions || [] };
  }, [ai.name, aiDecisions, liveStateData]);

  useEffect(() => {
    const steps: ActionStep[] = [];

    if (decision?.thinking && ai.status === 'thinking') {
      steps.push({
        type: 'think',
        content: `决策原因：${decision.thinking}`,
        timestamp: Date.now(),
        isImportant: true
      });
      
      if (actions.length > 0) {
        actions.forEach((action: AIAction, index: number) => {
          const type = action.type || 'do_nothing';
          const info = actionTypeInfo[type as keyof typeof actionTypeInfo] || actionTypeInfo.do_nothing;
          
          let actionReason = '';
          if (action.reasoning) {
            actionReason = `行动原因：${action.reasoning}`;
          } else {
            actionReason = `行动原因：执行${info.label}`;
          }
          
          steps.push({
            type,
            content: actionReason,
            timestamp: Date.now() + (index + 1) * 500,
            isCollapsed: false, // 修复：无行动类型也允许点击
            isImportant: type !== 'do_nothing'
          });
        });
      } else {
        steps.push({
          type: 'do_nothing',
          content: '行动原因：无行动',
          timestamp: Date.now() + 500,
          isCollapsed: false // 修复：改为false，允许点击
        });
      }
    }

    if (ai.status === 'acting' && actions.length > 0) {
      actions.forEach((action: AIAction, index: number) => {
        const type = action.type || 'do_nothing';
        const info = actionTypeInfo[type as keyof typeof actionTypeInfo] || actionTypeInfo.do_nothing;
        
        let content = '';
        
        if (type === 'do_nothing') {
          content = `无行动：${action.reasoning || '无具体原因'}`;
        } else {
          content = info.label;
          
          if (action.proposalId) {
            content += ` - 提案 #${action.proposalId}`;
          } else if (action.vote) {
            content += ` - ${action.vote === 'support' ? '支持' : '反对'}`;
            if (action.target) {
              content += ` - 目标提案: ${action.target}`;
            }
          } else if (type === 'private_message' && action.target) {
            // 私聊：显示目标和消息内容
            content += ` - 对: ${action.target}`;
            const messageContent = action.content || action.message || '';
            if (messageContent) {
              content += ` | 消息: ${messageContent}`;
            }
          } else if (action.target) {
            content += ` - 目标: ${action.target}`;
          }
          
          if (action.initiator) {
            content += ` | 发起者: ${action.initiator}`;
          }
          if (action.target && action.target !== action.initiator && type !== 'private_message') {
            content += ` | 对: ${action.target}`;
          }
          
          if (action.reasoning) {
            content += ` | 理由: ${action.reasoning}`;
          }
        }

        steps.push({
          type,
          content,
          timestamp: Date.now() + (index + 1) * 1000,
          isCollapsed: false, // 修复：无行动类型也允许点击
          isImportant: type !== 'do_nothing'
        });
      });
    }

    if (ai.status === 'acting' && actions.length === 0) {
      steps.push({
        type: 'do_nothing',
        content: '跳过行动：当前无可执行行动',
        timestamp: Date.now(),
        isCollapsed: false // 修复：改为false，允许点击
      });
    }

    setActionStream(steps);
    setCurrentStep(0);
  }, [ai.name, aiDecisions, liveStateData, actions, ai.status]);

  useEffect(() => {
    if (staticMode && actionStream.length > 0) {
      setCurrentStep(actionStream.length - 1);
    }
  }, [staticMode, actionStream]);

  useEffect(() => {
    if (staticMode) return;
    if (currentStep >= actionStream.length - 1) return;

    const currentAction = actionStream[currentStep];
    let delay = 3000;

    if (currentAction) {
      if (currentAction.type === 'do_nothing') {
        delay = 1500;
      } else if (currentAction.type === 'think') {
        delay = 5000;
      } else if (['propose', 'call_meeting'].includes(currentAction.type)) {
        delay = 8500;  // 后端延时8秒 + 缓冲
      } else if (['vote', 'private_message'].includes(currentAction.type)) {
        delay = 6500;  // 后端延时6秒 + 缓冲
      }
    }

    const timer = setTimeout(() => {
      setCurrentStep(prev => prev + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [currentStep, actionStream, staticMode]);

  useEffect(() => {
    if (currentStep < actionStream.length) {
      setIsTyping(true);
      const timer = setTimeout(() => setIsTyping(false), 500);
      return () => clearTimeout(timer);
    }
  }, [currentStep, actionStream.length]);

  // 计算悬浮框位置，优先显示在左侧
  const calculateTooltipPosition = useCallback((clickRect: DOMRect) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = 350;
    const tooltipHeight = 200;
    const margin = 10;
    
    // 优先尝试点击元素左侧
    let candidateX = clickRect.left - tooltipWidth - margin;
    let candidateY = clickRect.top;
    
    // 如果左侧空间不足，尝试右侧
    if (candidateX < margin) {
      candidateX = clickRect.right + margin;
      
      // 如果右侧也超出边界，调整到视口内
      if (candidateX + tooltipWidth > viewportWidth - margin) {
        candidateX = viewportWidth - tooltipWidth - margin;
      }
    }
    
    // 如果右侧仍然超出边界，强制显示在左侧
    if (candidateX + tooltipWidth > viewportWidth - margin) {
      candidateX = margin;
    }
    
    // 调整垂直位置
    if (candidateY + tooltipHeight > viewportHeight - margin) {
      candidateY = viewportHeight - tooltipHeight - margin;
    }
    
    if (candidateY < margin) {
      candidateY = margin;
    }
    
    return { 
      x: candidateX, 
      y: candidateY,
      width: tooltipWidth,
      height: tooltipHeight
    };
  }, []);

  // 点击步骤显示悬浮框
  const handleStepClick = useCallback((e: React.MouseEvent, step: ActionStep, index: number) => {
    // 修复：移除对isCollapsed的判断，允许所有步骤点击
    const rect = e.currentTarget.getBoundingClientRect();
    const { x, y, width, height } = calculateTooltipPosition(rect);
    
    setTooltip({
      isVisible: true,
      content: step.content,
      x,
      y,
      type: step.type,
      stepIndex: index,
      width,
      height
    });
  }, [calculateTooltipPosition]);

  // 拖拽移动功能
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!tooltip || tooltip.isResizing) return;
    
    const startX = e.clientX;
    const startY = e.clientY;
    const tooltipX = tooltip.x;
    const tooltipY = tooltip.y;
    
    setTooltip(prev => prev ? { 
      ...prev, 
      isDragging: true, 
      dragOffset: { 
        x: startX - tooltipX, 
        y: startY - tooltipY 
      } 
    } : null);
    
    e.stopPropagation();
  }, [tooltip]);

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!tooltip?.isDragging) return;
    
    const newX = e.clientX - (tooltip.dragOffset?.x || 0);
    const newY = e.clientY - (tooltip.dragOffset?.y || 0);
    
    // 确保悬浮框不超出视口边界
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 10;
    
    const clampedX = Math.max(margin, Math.min(newX, viewportWidth - tooltip.width - margin));
    const clampedY = Math.max(margin, Math.min(newY, viewportHeight - tooltip.height - margin));
    
    setTooltip(prev => prev ? { ...prev, x: clampedX, y: clampedY } : null);
  }, [tooltip]);

  const handleDragEnd = useCallback(() => {
    setTooltip(prev => prev ? { ...prev, isDragging: false } : null);
  }, []);

  // 调整大小功能
  const handleResizeStart = useCallback((e: React.MouseEvent, direction: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw') => {
    if (!tooltip) return;
    
    e.stopPropagation();
    e.preventDefault();
    
    setTooltip(prev => prev ? { 
      ...prev, 
      isResizing: true, 
      resizeDirection: direction,
      resizeStartSize: { width: prev.width, height: prev.height },
      resizeStartPos: { x: e.clientX, y: e.clientY }
    } : null);
  }, [tooltip]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!tooltip?.isResizing || !tooltip.resizeStartSize || !tooltip.resizeStartPos) return;
    
    const deltaX = e.clientX - tooltip.resizeStartPos.x;
    const deltaY = e.clientY - tooltip.resizeStartPos.y;
    
    let newWidth = tooltip.resizeStartSize.width;
    let newHeight = tooltip.resizeStartSize.height;
    let newX = tooltip.x;
    let newY = tooltip.y;
    
    const minWidth = 200;
    const minHeight = 150;
    const maxWidth = 800;
    const maxHeight = 600;
    const margin = 10;
    
    // 根据调整方向计算新的尺寸和位置
    switch (tooltip.resizeDirection) {
      case 'e': // 东边 - 调整宽度
        newWidth = Math.max(minWidth, Math.min(maxWidth, tooltip.resizeStartSize.width + deltaX));
        break;
      case 's': // 南边 - 调整高度
        newHeight = Math.max(minHeight, Math.min(maxHeight, tooltip.resizeStartSize.height + deltaY));
        break;
      case 'se': // 东南角 - 调整宽度和高度
        newWidth = Math.max(minWidth, Math.min(maxWidth, tooltip.resizeStartSize.width + deltaX));
        newHeight = Math.max(minHeight, Math.min(maxHeight, tooltip.resizeStartSize.height + deltaY));
        break;
      case 'sw': // 西南角 - 调整宽度和高度，同时调整X位置
        newWidth = Math.max(minWidth, Math.min(maxWidth, tooltip.resizeStartSize.width - deltaX));
        newHeight = Math.max(minHeight, Math.min(maxHeight, tooltip.resizeStartSize.height + deltaY));
        newX = tooltip.x + deltaX;
        break;
      case 'ne': // 东北角 - 调整宽度和高度，同时调整Y位置
        newWidth = Math.max(minWidth, Math.min(maxWidth, tooltip.resizeStartSize.width + deltaX));
        newHeight = Math.max(minHeight, Math.min(maxHeight, tooltip.resizeStartSize.height - deltaY));
        newY = tooltip.y + deltaY;
        break;
      case 'nw': // 西北角 - 调整宽度和高度，同时调整X和Y位置
        newWidth = Math.max(minWidth, Math.min(maxWidth, tooltip.resizeStartSize.width - deltaX));
        newHeight = Math.max(minHeight, Math.min(maxHeight, tooltip.resizeStartSize.height - deltaY));
        newX = tooltip.x + deltaX;
        newY = tooltip.y + deltaY;
        break;
      case 'w': // 西边 - 调整宽度，同时调整X位置
        newWidth = Math.max(minWidth, Math.min(maxWidth, tooltip.resizeStartSize.width - deltaX));
        newX = tooltip.x + deltaX;
        break;
      case 'n': // 北边 - 调整高度，同时调整Y位置
        newHeight = Math.max(minHeight, Math.min(maxHeight, tooltip.resizeStartSize.height - deltaY));
        newY = tooltip.y + deltaY;
        break;
    }
    
    // 确保不超出视口边界
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    if (newX < margin) {
      newWidth -= (margin - newX);
      newX = margin;
    }
    
    if (newX + newWidth > viewportWidth - margin) {
      newWidth = Math.max(minWidth, viewportWidth - margin - newX);
    }
    
    if (newY < margin) {
      newHeight -= (margin - newY);
      newY = margin;
    }
    
    if (newY + newHeight > viewportHeight - margin) {
      newHeight = Math.max(minHeight, viewportHeight - margin - newY);
    }
    
    setTooltip(prev => prev ? { 
      ...prev, 
      width: Math.max(minWidth, newWidth),
      height: Math.max(minHeight, newHeight),
      x: newX,
      y: newY
    } : null);
  }, [tooltip]);

  const handleResizeEnd = useCallback(() => {
    setTooltip(prev => prev ? { ...prev, isResizing: false } : null);
  }, []);

  // 监听拖拽和调整大小事件
  useEffect(() => {
    if (tooltip?.isDragging || tooltip?.isResizing) {
      const handleMouseMove = (e: MouseEvent) => {
        if (tooltip?.isDragging) {
          handleDragMove(e);
        } else if (tooltip?.isResizing) {
          handleResizeMove(e);
        }
      };
      
      const handleMouseUp = () => {
        if (tooltip?.isDragging) {
          handleDragEnd();
        } else if (tooltip?.isResizing) {
          handleResizeEnd();
        }
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [tooltip?.isDragging, tooltip?.isResizing, handleDragMove, handleDragEnd, handleResizeMove, handleResizeEnd]);

  // 点击悬浮框外部关闭悬浮框
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node) && 
          !tooltip?.isDragging && !tooltip?.isResizing) {
        setTooltip(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [tooltip?.isDragging, tooltip?.isResizing]);

  // ESC键关闭悬浮框
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTooltip(null);
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, []);

  // 当窗口大小变化时重新计算悬浮框位置
  useEffect(() => {
    const handleResize = () => {
      if (tooltip && tooltipRef.current && !tooltip.isDragging && !tooltip.isResizing) {
        const stepElement = stepRefs.current.get(tooltip.stepIndex);
        if (stepElement) {
          const rect = stepElement.getBoundingClientRect();
          const { x, y, width, height } = calculateTooltipPosition(rect);
          
          setTooltip(prev => prev ? { ...prev, x, y, width, height } : null);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [tooltip, calculateTooltipPosition]);

  // 自动滚动到当前步骤
  useEffect(() => {
    if (!staticMode && stepsContainerRef.current && actionStream.length > 0) {
      const container = stepsContainerRef.current;
      const stepsContainer = container.querySelector('.steps-list-container') as HTMLElement;
      
      if (stepsContainer) {
        const currentStepElement = stepsContainer.children[currentStep] as HTMLElement;
        
        if (currentStepElement) {
          const containerRect = stepsContainer.getBoundingClientRect();
          const elementRect = currentStepElement.getBoundingClientRect();
          
          if (elementRect.bottom > containerRect.bottom || elementRect.top < containerRect.top) {
            currentStepElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }
    }
  }, [currentStep, actionStream.length, staticMode]);

  const handleScroll = useCallback(() => {
    if (stepsContainerRef.current) {
      const scrollTop = stepsContainerRef.current.scrollTop;
      setIsScrolled(scrollTop > 0);
      scrollRef.current = scrollTop;
    }
  }, []);

  useEffect(() => {
    const container = stepsContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const currentAction = actionStream[currentStep];
  const progress = actionStream.length > 0 ? ((currentStep + 1) / actionStream.length) * 100 : 0;

  // 获取要显示的步骤
  const getStepsToShow = () => {
    if (showAllSteps || staticMode) {
      return actionStream;
    }
    
    const startIndex = Math.max(0, currentStep - maxVisibleSteps + 2);
    const endIndex = Math.min(actionStream.length, currentStep + 2);
    
    return actionStream.slice(startIndex, endIndex);
  };

  const stepsToShow = getStepsToShow();
  const hasMoreSteps = actionStream.length > stepsToShow.length;

  return (
    <div 
      ref={containerRef}
      className="flex flex-col h-full min-h-0 relative" 
      style={{ height: containerHeight }}
    >
      {/* 头部区域 - 固定高度 */}
      <div className="flex-shrink-0 p-2 border-b border-cyan-500/30 bg-slate-900/80">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-cyan-400">{ai.name}</h3>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded text-xs ${ai.status === 'acting' ? 'bg-green-500/20 text-green-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
              {ai.status === 'acting' ? '行动中' : '决策中'}
            </span>
            <span className="text-gray-400 text-xs">{currentStep + 1}/{actionStream.length}</span>
          </div>
        </div>

        {decision?.resourceRequest !== undefined && (
          <div className="mb-2 flex items-center space-x-2">
            <span className="text-xs text-amber-400">💎 申请资源:</span>
            <span className="text-sm font-bold text-amber-400">
              {formatResourceRequest(decision.resourceRequest)}
            </span>
          </div>
        )}

        <div className="w-full relative h-6">
          <div className="w-full bg-slate-800/80 rounded-full h-2 relative overflow-hidden border border-slate-600/50">
            <div
              className="h-2 rounded-full transition-all duration-500 relative overflow-hidden"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/30 via-blue-500/30 to-purple-500/30 blur-sm"></div>
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                style={{
                  animation: 'scanline 2s linear infinite',
                  width: '30%',
                  transform: `translateX(${progress > 0 ? progress * 0.7 : -30}%)`
                }}
              ></div>
            </div>
            <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-transparent, rgba(6, 182, 212, 0.1)"
                 style={{backgroundSize: '4px 4px'}}></div>
          </div>
          <div className="absolute -top-1 right-0 transform translate-x-1/2">
            <div className="bg-cyan-500 text-white text-xs px-1.5 py-0.5 rounded border border-cyan-300 shadow-lg">
              {Math.round(progress)}%
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区域 - 固定高度，内部滚动 */}
      <div 
        ref={stepsContainerRef}
        className="flex-1 min-h-0 flex flex-col"
        style={{ 
          height: `calc(${containerHeight} - 120px)`,
          overflow: 'hidden'
        }}
      >
        {actionStream.length === 0 ? (
          <div className="text-center text-gray-500 py-4 flex items-center justify-center h-full">
            <div>
              <div className="text-2xl mb-1">⚡</div>
              <div className="text-xs">等待行动开始...</div>
            </div>
          </div>
        ) : (
          <>
            {/* 控制栏 - 固定高度 */}
            <div className="flex-shrink-0 p-2 bg-slate-900/30 border-b border-slate-700/30">
              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-400">
                  共 {actionStream.length} 个步骤
                </div>
                <div className="flex space-x-2">
                  {hasMoreSteps && !showAllSteps && (
                    <button
                      onClick={() => setShowAllSteps(true)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 px-2 py-1 rounded border border-cyan-500/30 hover:border-cyan-500/50 transition-colors"
                    >
                      查看全部 ({actionStream.length})
                    </button>
                  )}
                  {showAllSteps && (
                    <button
                      onClick={() => setShowAllSteps(false)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 px-2 py-1 rounded border border-cyan-500/30 hover:border-cyan-500/50 transition-colors"
                    >
                      精简视图
                    </button>
                  )}
                </div>
              </div>
              
              {stepsToShow.length > 0 && (
                <div className="mt-1 px-1">
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>
                      显示步骤 {actionStream.indexOf(stepsToShow[0]) + 1} - {actionStream.indexOf(stepsToShow[stepsToShow.length - 1]) + 1}
                    </span>
                    {hasMoreSteps && !showAllSteps && (
                      <span className="text-cyan-400">
                        中间省略 {actionStream.length - stepsToShow.length} 个步骤
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* 步骤列表容器 - 固定高度，内部滚动 */}
            <div 
              className="steps-list-container flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-1"
              style={{ 
                height: '100%',
                maxHeight: '100%',
                scrollBehavior: 'smooth'
              }}
            >
              {stepsToShow.map((step, index) => {
                const originalIndex = actionStream.indexOf(step);
                const info = actionTypeInfo[step.type as keyof typeof actionTypeInfo] || actionTypeInfo.do_nothing;
                const isActive = originalIndex === currentStep;
                const isPast = originalIndex < currentStep;
                const isCollapsed = step.isCollapsed; // 修复：不再根据类型判断

                return (
                  <div
                    key={`${step.type}-${originalIndex}`}
                    ref={(el) => {
                      if (el) {
                        stepRefs.current.set(originalIndex, el);
                      } else {
                        stepRefs.current.delete(originalIndex);
                      }
                    }}
                    className={`cyber-border rounded-md mb-1 transition-all duration-200 cursor-pointer hover:border-cyan-500/30 ${
                      isActive ? info.bgColor + ' ' + info.color + ' border-' + info.color.replace('text-', '') + '/50' :
                      isPast ? info.bgColor + ' ' + info.color + ' border-' + info.color.replace('text-', '') + '/30 opacity-80' :
                      'bg-slate-800/20 border-slate-700/20 opacity-60'
                    } cursor-pointer hover:scale-[1.02]`} // 修复：移除对isCollapsed的判断
                    onClick={(e) => handleStepClick(e, step, originalIndex)} // 修复：所有步骤都可点击
                    title="点击查看详情"
                  >
                    <div className="p-2">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <div className="text-lg flex-shrink-0">
                            {info.icon}
                          </div>
                          <div className={`font-medium text-xs ${isActive || isPast ? info.color : 'text-gray-400'}`}>
                            {info.label}
                          </div>
                          <div className="text-xs text-gray-500 bg-slate-700/30 px-1.5 py-0.5 rounded">
                            #{originalIndex + 1}
                          </div>
                          {isPast && (
                            <div className="text-xs text-green-400 bg-green-900/20 px-1.5 py-0.5 rounded">
                              ✓
                            </div>
                          )}
                        </div>
                        
                        <div className="text-xs text-cyan-400/60 px-1" title="可点击查看详情">
                          📄
                        </div>
                      </div>

                      {/* 步骤内容 - 简洁显示 */}
                      {isActive ? (
                        <div
                          className={`text-xs ${isTyping ? 'animate-pulse' : ''} pl-7 break-words`}
                          style={{ 
                            wordWrap: 'break-word', 
                            overflowWrap: 'break-word',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            maxHeight: '3rem'
                          }}
                        >
                          {step.content}
                        </div>
                      ) : (
                        <div
                          className="text-xs text-gray-300 pl-7 break-words"
                          style={{ 
                            wordWrap: 'break-word', 
                            overflowWrap: 'break-word',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            maxHeight: '3rem'
                          }}
                        >
                          {step.content.length > 60 ? `${step.content.substring(0, 60)}...` : step.content}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 底部状态栏 - 固定高度 */}
      <div className="flex-shrink-0 p-2 border-t border-cyan-500/30 grid grid-cols-2 gap-2 bg-slate-900/80">
        <div className="text-center">
          <div className="text-sm font-bold text-green-400">{ai.health}%</div>
          <div className="text-xs text-gray-400">健康度</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-cyan-400">{ai.actionPoints}</div>
          <div className="text-xs text-gray-400">行动力</div>
        </div>
      </div>

      {/* 全局悬浮框 - 可拖拽和调整大小 */}
      {tooltip && tooltip.isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-[9999] rounded-lg shadow-2xl backdrop-blur-sm pointer-events-auto select-none resize-box"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            width: `${tooltip.width}px`,
            height: `${tooltip.height}px`,
            opacity: 0,
            animation: 'fadeIn 0.2s ease-out forwards',
            maxWidth: 'calc(100vw - 20px)',
            maxHeight: 'calc(100vh - 20px)',
            cursor: tooltip.isDragging ? 'grabbing' : (tooltip.isResizing ? 'nwse-resize' : 'grab'),
            userSelect: 'none',
            touchAction: 'none',
            minWidth: '200px',
            minHeight: '150px',
            resize: 'none',
          }}
        >
          {/* 悬浮框主体 */}
          <div className={`w-full h-full rounded-lg ${actionTypeInfo[tooltip.type as keyof typeof actionTypeInfo]?.tooltipBg || 'bg-slate-900/95'} border-2 ${actionTypeInfo[tooltip.type as keyof typeof actionTypeInfo]?.color.replace('text-', 'border-')}/50 flex flex-col`}>
            {/* 拖拽区域 - 悬浮框头部 */}
            <div 
              className="flex items-center justify-between p-3 cursor-grab active:cursor-grabbing border-b border-gray-700/50 flex-shrink-0"
              onMouseDown={handleDragStart}
              style={{ userSelect: 'none' }}
            >
              <div className="flex items-center space-x-2">
                <div className="text-lg">
                  {actionTypeInfo[tooltip.type as keyof typeof actionTypeInfo]?.icon}
                </div>
                <div className={`font-semibold text-sm ${actionTypeInfo[tooltip.type as keyof typeof actionTypeInfo]?.color}`}>
                  {actionTypeInfo[tooltip.type as keyof typeof actionTypeInfo]?.label}
                </div>
                <div className="text-xs text-gray-300 bg-black/40 px-2 py-0.5 rounded">
                  步骤 #{tooltip.stepIndex + 1}
                </div>
                <div className="text-xs text-cyan-300/60">
                  {Math.round(tooltip.width)}×{Math.round(tooltip.height)}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {tooltip.isDragging && (
                  <div className="text-xs text-cyan-400 animate-pulse">拖动中...</div>
                )}
                {tooltip.isResizing && (
                  <div className="text-xs text-purple-400 animate-pulse">调整大小中...</div>
                )}
                <button
                  onClick={() => setTooltip(null)}
                  className="text-gray-400 hover:text-gray-200 text-lg transition-colors ml-2"
                  title="关闭 (ESC)"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* 悬浮框内容 - 可滚动 */}
            <div 
              className="flex-1 p-3 text-sm text-gray-200 break-words whitespace-pre-wrap overflow-y-auto overflow-x-hidden"
              style={{ 
                lineHeight: '1.4',
                cursor: 'auto',
                minHeight: 0
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {tooltip.content}
            </div>
            
            {/* 悬浮框底部 */}
            <div className="p-2 pt-2 border-t border-gray-700/50 flex justify-between items-center text-xs text-gray-400 flex-shrink-0">
              <span className="flex items-center">
                <span className="mr-2">↔️</span>
                拖拽头部移动
              </span>
              <span>拖动边框调整大小</span>
              <span>点击外部或ESC关闭</span>
            </div>

            {/* 调整大小手柄 */}
            {/* 北边手柄 */}
            <div 
              className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize"
              onMouseDown={(e) => handleResizeStart(e, 'n')}
            />
            {/* 南边手柄 */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize"
              onMouseDown={(e) => handleResizeStart(e, 's')}
            />
            {/* 西边手柄 */}
            <div 
              className="absolute top-0 bottom-0 left-0 w-2 cursor-ew-resize"
              onMouseDown={(e) => handleResizeStart(e, 'w')}
            />
            {/* 东边手柄 */}
            <div 
              className="absolute top-0 bottom-0 right-0 w-2 cursor-ew-resize"
              onMouseDown={(e) => handleResizeStart(e, 'e')}
            />
            {/* 西北角手柄 */}
            <div 
              className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize"
              onMouseDown={(e) => handleResizeStart(e, 'nw')}
            />
            {/* 东北角手柄 */}
            <div 
              className="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize"
              onMouseDown={(e) => handleResizeStart(e, 'ne')}
            />
            {/* 西南角手柄 */}
            <div 
              className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize"
              onMouseDown={(e) => handleResizeStart(e, 'sw')}
            />
            {/* 东南角手柄 - 主调整手柄 */}
            <div 
              className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize bg-cyan-500/50 border border-cyan-300 rounded-sm"
              onMouseDown={(e) => handleResizeStart(e, 'se')}
            />
          </div>
        </div>
      )}

      {/* 添加CSS动画 */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-5px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        .resize-box {
          resize: both;
          overflow: auto;
        }
        
        .resize-box::-webkit-resizer {
          background-color: rgba(6, 182, 212, 0.5);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};
