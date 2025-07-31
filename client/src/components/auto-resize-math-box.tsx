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
  maxWidth = 800,
  minHeight = 100,
  maxHeight = 600
}: AutoResizeMathBoxProps) {
  const [autoSize, setAutoSize] = useState({ width: 200, height: 120 });
  const [isManuallyResized, setIsManuallyResized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Advanced content-aware size calculation with ResizeObserver
  const calculateContentSize = useCallback(() => {
    if (!contentRef.current) return { width: 200, height: 120 };
    
    const contentElement = contentRef.current;
    const titleHeight = 48;
    const padding = 24;
    
    // Detect content characteristics for specialized sizing
    const hasImages = contentElement.querySelector('img') || content.match(/\.(jpg|jpeg|png|gif|svg|webp)/i);
    const hasLongText = content.length > 200;
    const isMultiLine = content.includes('\n') || content.includes('<br>') || content.split(' ').length > 15;
    const isMathFormula = content.includes('\\') || content.includes('=') || content.includes('^') || content.includes('frac');
    const isComplexMath = content.includes('\\sum') || content.includes('\\int') || content.includes('\\sqrt') || content.includes('matrix');
    
    // Create measurement container with proper styling
    const measureElement = document.createElement('div');
    measureElement.style.cssText = `
      position: absolute;
      visibility: hidden;
      top: -9999px;
      left: -9999px;
      width: auto;
      height: auto;
      max-width: ${maxWidth - padding}px;
      font-family: ${window.getComputedStyle(contentElement).fontFamily};
      font-size: ${window.getComputedStyle(contentElement).fontSize};
      line-height: ${window.getComputedStyle(contentElement).lineHeight};
      padding: 12px;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: ${window.getComputedStyle(contentElement).fontFamily};
      line-height: ${window.getComputedStyle(contentElement).lineHeight};
      white-space: pre-wrap;
      word-wrap: break-word;
    `;
    measureElement.innerHTML = contentElement.innerHTML;
    document.body.appendChild(measureElement);
    
    let optimalWidth, optimalHeight;
    
    if (hasImages) {
      // Image content: generous sizing to accommodate visual content
      const img = measureElement.querySelector('img');
      if (img) {
        optimalWidth = Math.min(maxWidth, Math.max(300, img.naturalWidth + padding));
        optimalHeight = Math.min(maxHeight, Math.max(200, img.naturalHeight + titleHeight + padding));
      } else {
        optimalWidth = 400;
        optimalHeight = 300;
      }
    } else if (hasLongText) {
      // Long text: prioritize readability with comfortable width
      const idealWidth = Math.min(500, Math.max(300, Math.sqrt(content.length) * 25));
      measureElement.style.width = `${idealWidth - padding}px`;
      optimalWidth = idealWidth;
      optimalHeight = Math.min(maxHeight, Math.max(150, measureElement.scrollHeight + titleHeight + padding));
    } else if (isMultiLine) {
      // Multi-line content: balanced proportions
      const naturalWidth = Math.min(400, measureElement.scrollWidth);
      measureElement.style.width = `${naturalWidth}px`;
      optimalWidth = naturalWidth + padding;
      optimalHeight = Math.min(maxHeight, Math.max(120, measureElement.scrollHeight + titleHeight + padding));
    } else if (isMathFormula) {
      // Math formulas: compact but ensure visibility
      const naturalWidth = Math.min(350, measureElement.scrollWidth);
      optimalWidth = Math.max(200, naturalWidth + padding);
      measureElement.style.width = `${optimalWidth - padding}px`;
      optimalHeight = Math.min(maxHeight, Math.max(100, measureElement.scrollHeight + titleHeight + padding));
    } else {
      // Short text/single line: compact sizing
      const naturalWidth = Math.min(300, measureElement.scrollWidth);
      optimalWidth = Math.max(minWidth, naturalWidth + padding);
      measureElement.style.width = `${optimalWidth - padding}px`;
      optimalHeight = Math.min(maxHeight, Math.max(minHeight, measureElement.scrollHeight + titleHeight + padding));
    }
    
    document.body.removeChild(measureElement);
    
    // Apply constraints
    optimalWidth = Math.max(minWidth, Math.min(maxWidth, optimalWidth));
    optimalHeight = Math.max(minHeight, Math.min(maxHeight, optimalHeight));
    
    // Ensure reasonable aspect ratios
    const ratio = optimalWidth / optimalHeight;
    if (ratio > 4) { // Too wide
      optimalHeight = Math.max(optimalHeight, optimalWidth / 3.5);
    } else if (ratio < 0.4) { // Too tall
      optimalWidth = Math.max(optimalWidth, optimalHeight * 0.5);
    }
    
    return { 
      width: Math.round(optimalWidth), 
      height: Math.round(optimalHeight) 
    };
  }, [content]);

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

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragStop = useCallback((e: any, data: any) => {
    setIsDragging(false);
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
      position={isDragging ? undefined : position}
      defaultPosition={isDragging ? position : undefined}
      onStart={handleDragStart}
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
            maxConstraints={[800, 600]}
            onResize={handleResize}
            onResizeStop={handleResizeStop}
            resizeHandles={['se']}
            className="relative group"
          >
            <div className={`w-full h-full bg-gradient-to-br ${color} rounded-xl border-2 shadow-lg hover:shadow-xl transition-all duration-300 animate-scale-in overflow-hidden relative`} style={{ border: `3px solid hsl(${(boxNumber * 50) % 360}, 70%, 50%)` }}>
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
                    className="text-sm leading-relaxed h-full overflow-hidden flex items-center justify-center"
                    style={{ cursor: 'text' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <LaTeXRenderer 
                      content={content} 
                      className="text-base math-content w-full h-full flex items-center justify-center"
                      displayMode={false}
                    />
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
                className="text-sm leading-relaxed h-full overflow-hidden flex items-center justify-center"
              >
                <LaTeXRenderer 
                  content={content} 
                  className="text-base math-content w-full h-full flex items-center justify-center"
                  displayMode={false}
                />
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