import React, { ReactNode, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface AnimatedTooltipProps {
  content: string | ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

// Global state to track active tooltip
let activeTooltipId: string | null = null;
const tooltipInstances = new Map<string, () => void>();

const AnimatedTooltip: React.FC<AnimatedTooltipProps> = ({
  content,
  position = 'top',
  children,
  className = '',
  disabled = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const tooltipId = useRef<string>(`tooltip-${Math.random().toString(36).substr(2, 9)}`);

  const updateTooltipPosition = () => {
    if (!containerRef.current || !tooltipRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = containerRect.top - tooltipRect.height - 8;
        left = containerRect.left + containerRect.width / 2;
        break;
      case 'bottom':
        top = containerRect.bottom + 8;
        left = containerRect.left + containerRect.width / 2;
        break;
      case 'left':
        top = containerRect.top + containerRect.height / 2;
        left = containerRect.left - tooltipRect.width - 8;
        break;
      case 'right':
        top = containerRect.top + containerRect.height / 2;
        left = containerRect.right + 8;
        break;
    }

    // Adjust for viewport boundaries based on position
    if (position === 'left') {
      // For left tooltips, check if it goes beyond left edge
      if (left < 8) {
        left = 8;
      }
    } else if (position === 'right') {
      // For right tooltips, check if it goes beyond right edge
      if (left + tooltipRect.width > viewportWidth - 8) {
        left = viewportWidth - tooltipRect.width - 8;
      }
    } else {
      // For top/bottom tooltips, check both edges
      if (left < 8) {
        left = 8;
      } else if (left + tooltipRect.width > viewportWidth - 8) {
        left = viewportWidth - tooltipRect.width - 8;
      }
    }

    if (top < 8) {
      top = 8;
    } else if (top + tooltipRect.height > viewportHeight - 8) {
      top = viewportHeight - tooltipRect.height - 8;
    }

    setTooltipStyle({
      top: `${top}px`,
      left: `${left}px`,
      transform: position === 'left' || position === 'right' ? 'translateY(-50%)' : 'translateX(-50%)'
    });
  };

  const hideTooltip = () => {
    setIsVisible(false);
    if (activeTooltipId === tooltipId.current) {
      activeTooltipId = null;
    }
  };

  const handleMouseEnter = () => {
    if (disabled || !content) return;
    
    // Hide any other active tooltip
    if (activeTooltipId && activeTooltipId !== tooltipId.current) {
      const hideOther = tooltipInstances.get(activeTooltipId);
      if (hideOther) hideOther();
    }
    
    activeTooltipId = tooltipId.current;
    setIsVisible(true);
    // Small delay to ensure tooltip is rendered before positioning
    setTimeout(updateTooltipPosition, 10);
  };

  const handleMouseLeave = () => {
    hideTooltip();
  };

  useEffect(() => {
    // Register this tooltip instance
    tooltipInstances.set(tooltipId.current, hideTooltip);
    
    if (isVisible) {
      updateTooltipPosition();
      // Update position on scroll or resize
      const handleUpdate = () => updateTooltipPosition();
      window.addEventListener('scroll', handleUpdate, true);
      window.addEventListener('resize', handleUpdate);
      
      return () => {
        window.removeEventListener('scroll', handleUpdate, true);
        window.removeEventListener('resize', handleUpdate);
      };
    }
    
    return () => {
      // Cleanup on unmount
      tooltipInstances.delete(tooltipId.current);
      if (activeTooltipId === tooltipId.current) {
        activeTooltipId = null;
      }
    };
  }, [isVisible, position]);

  if (disabled || !content) {
    return <>{children}</>;
  }

  return (
    <>
      <div
        ref={containerRef}
        className={`tooltip-container ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
      {isVisible && createPortal(
        <div
          ref={tooltipRef}
          className={`animated-tooltip tooltip-${position}`}
          style={{
            ...tooltipStyle,
            opacity: 1,
            visibility: 'visible'
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
};

export default AnimatedTooltip;