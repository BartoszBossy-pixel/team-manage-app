import React, { useState, useRef, useEffect } from 'react';

interface ColumnResizerProps {
  columnKey: string;
  onResize: (columnKey: string, newWidth: number) => void;
  minWidth?: number;
  maxWidth?: number;
}

const ColumnResizer: React.FC<ColumnResizerProps> = ({
  columnKey,
  onResize,
  minWidth = 50,
  maxWidth = 500
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const resizerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const th = (e.target as HTMLElement).closest('th');
    if (!th) return;
    
    setIsResizing(true);
    setStartX(e.clientX);
    setStartWidth(th.offsetWidth);
    
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    
    const diff = e.clientX - startX;
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + diff));
    
    // Update the column width immediately for visual feedback
    const th = resizerRef.current?.closest('th');
    if (th) {
      th.style.width = `${newWidth}px`;
    }
  };

  const handleMouseUp = () => {
    if (!isResizing) return;
    
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    // Get final width and save to database
    const th = resizerRef.current?.closest('th');
    if (th) {
      const finalWidth = th.offsetWidth;
      onResize(columnKey, finalWidth);
    }
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, startX, startWidth]);

  return (
    <div
      ref={resizerRef}
      className={`column-resizer ${isResizing ? 'resizing' : ''}`}
      onMouseDown={handleMouseDown}
      title="Przeciągnij aby zmienić szerokość kolumny"
    />
  );
};

export default ColumnResizer;