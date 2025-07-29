import { useState, useEffect, useRef, useCallback } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';
import LaTeXRenderer from './latex-renderer';

interface AutoResizeMathBoxProps {
  id: string;
  title: string;
  content: string;
  color: string;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  onPositionChange: (position: { x: number; y: number }) => void;
  onSizeChange: (size: { width: number; height: number }) => void;
  onSaveRequest: () => void;
  boxNumber: number;
  isGridMode?: boolean;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}

export default function AutoResizeMathBox({
  id,
  title,
  content,
  color,
  position,
  size: externalSize,
  onPositionChange,
  onSizeChange,
  onSaveRequest,
  boxNumber,
  isGridMode = false,
  minWidth = 160,
  maxWidth = 400,
  minHeight = 100,
  maxHeight = 300
}: AutoResizeMathBoxProps) {
  const [autoSize, setAutoSize] = useState({ width: 200, height: 120 });
  const [isManuallyResized, setIsManuallyResized] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Content-aware size calculation
  const calculateContentSize = useCallback(() => {
    if (!contentRef.current) return { width: 200, height: 120 };
    
    const contentElement = contentRef.current;
    const titleHeight = 48; // Fixed title height
    const padding = 24; // Total padding (12px each side)
    
    // Create a temporary element to measure natural content size
    const measureElement = document.createElement('div');
    measureElement.style.position = 'absolute';
    measureElement.style.visibility = 'hidden';
    measureElement.style.whiteSpace = 'nowrap';
    measureElement.style.fontSize = window.getComputedStyle(contentElement).fontSize;
    measureElement.style.fontFamily = window.getComputedStyle(contentElement).fontFamily;
    measureElement.style.lineHeight = window.getComputedStyle(contentElement).lineHeight;
    measureElement.innerHTML = contentElement.innerHTML;
    document.body.appendChild(measureElement);
    
    const naturalWidth = measureElement.scrollWidth;
    document.body.removeChild(measureElement);
    
    // Calculate width: natural width + padding, with reasonable constraints
    let optimalWidth = Math.max(180, naturalWidth + padding);
    optimalWidth = Math.min(400, optimalWidth);
    
    // Now measure height for the calculated width
    contentElement.style.width = `${optimalWidth - padding}px`;
    const heightForWidth = contentElement.scrollHeight;
    
    let optimalHeight = Math.max(100, heightForWidth + titleHeight + padding);
    
    // Maintain reasonable proportions
    const ratio = optimalWidth / optimalHeight;
    if (ratio > 3.5) { // Very wide - increase height slightly
      optimalHeight = Math.max(optimalHeight, optimalWidth / 3.2);
    } else if (ratio < 0.3) { // Very tall - increase width slightly  
      optimalWidth = Math.max(optimalWidth, optimalHeight * 0.4);
    }
    
    return { 
      width: Math.round(optimalWidth), 
      height: Math.round(optimalHeight) 
    };
  }, []);

  // Update size when content changes or component mounts
  useEffect(() => {
    if (contentRef.current && !isManuallyResized) {
      const timer = setTimeout(() => {
        const newSize = calculateContentSize();
        setAutoSize(newSize);
        onSizeChange(newSize);
      }, 150); // Slightly longer delay to ensure content is rendered
      return () => clearTimeout(timer);
    }
  }, [content, calculateContentSize, onSizeChange, isManuallyResized]);

  // Initial size calculation on mount
  useEffect(() => {
    if (contentRef.current && !externalSize) {
      const initialTimer = setTimeout(() => {
        const newSize = calculateContentSize();
        setAutoSize(newSize);
        onSizeChange(newSize);
      }, 300); // Longer delay for initial load
      return () => clearTimeout(initialTimer);
    }
  }, []);

  // Use auto size unless manually resized
  const boxSize = isManuallyResized && externalSize ? externalSize : autoSize;

  const handleDragStop = useCallback((e: any, data: any) => {
    onPositionChange({ x: data.x, y: data.y });
    onSaveRequest();
  }, [onPositionChange, onSaveRequest]);

  const handleResize = useCallback((e: any, { size }: any) => {
    setIsManuallyResized(true);
    onSizeChange(size);
  }, [onSizeChange]);

  const handleResizeStop = useCallback(() => {
    onSaveRequest();
  }, [onSaveRequest]);

  return (
    <Draggable
      position={position}
      onStop={handleDragStop}
      grid={[10, 10]}
      handle=".drag-handle"
      disabled={isGridMode}
    >
      <div className="absolute" style={{ 
        width: `${boxSize.width}px`,
        height: `${boxSize.height}px`
      }}>
        {!isGridMode ? (
          // Free positioning mode with resize handles
          <ResizableBox
            width={boxSize.width}
            height={boxSize.height}
            minConstraints={[150, 80]}
            maxConstraints={[600, 400]}
            onResize={handleResize}
            onResizeStop={handleResizeStop}
            resizeHandles={['se']}
            className="relative group"
          >
            <div className={`w-full h-full bg-gradient-to-br ${color} rounded-xl border-2 shadow-lg hover:shadow-xl transition-all duration-300 animate-scale-in overflow-hidden relative`}>
              {/* Make entire box draggable */}
              <div className="drag-handle w-full h-full cursor-move">
                {/* Title Header */}
                <div className="flex items-center justify-between p-3 border-b border-white/20 bg-white/10 backdrop-blur-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-slate-600 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                      {boxNumber}
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm truncate select-none">{title}</h4>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-4 h-4 bg-slate-400/30 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
                    </div>
                  </div>
                </div>
                
                {/* Content Container */}
                <div className="p-3" style={{ height: `${boxSize.height - 48}px` }}>
                  <div 
                    ref={contentRef}
                    className="text-sm leading-relaxed h-full overflow-visible"
                    style={{ cursor: 'text' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {content.includes('\\') || content.includes('$') ? (
                      <LaTeXRenderer 
                        content={content.replace(/^\$+|\$+$/g, '')} 
                        className="text-base math-content"
                      />
                    ) : (
                      <div className="whitespace-pre-wrap">{content}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </ResizableBox>
        ) : (
          // Grid mode - auto-sizing only, no manual resize
          <div className={`w-full h-full bg-gradient-to-br ${color} rounded-xl border-2 shadow-lg hover:shadow-xl transition-all duration-300 animate-scale-in overflow-hidden relative`}>
            {/* Title Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/20 bg-white/10 backdrop-blur-sm">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-slate-600 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                  {boxNumber}
                </div>
                <h4 className="font-semibold text-slate-900 text-sm truncate select-none">{title}</h4>
              </div>
            </div>
            
            {/* Content Container */}
            <div className="p-3" style={{ height: `${boxSize.height - 48}px` }}>
              <div 
                ref={contentRef}
                className="text-sm leading-relaxed h-full overflow-visible"
              >
                {content.includes('\\') || content.includes('$') ? (
                  <LaTeXRenderer 
                    content={content.replace(/^\$+|\$+$/g, '')} 
                    className="text-base math-content"
                  />
                ) : (
                  <div className="whitespace-pre-wrap">{content}</div>
                )}
              </div>
            </div>
            
            {/* Grid mode indicator */}
            <div className="absolute bottom-1 right-1 w-3 h-3 opacity-60 pointer-events-none">
              <div className="w-full h-full bg-blue-400 rounded-tl-lg transform rotate-45 scale-75"></div>
            </div>
          </div>
        )}
      </div>
    </Draggable>
  );
}

export { AutoResizeMathBox };