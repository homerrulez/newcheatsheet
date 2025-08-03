import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Draggable, { DraggableEvent, DraggableData } from 'react-draggable';
import { ResizableBox, ResizeCallbackData } from 'react-resizable';
import { SyntheticEvent } from 'react';
import 'react-resizable/css/styles.css';
import LaTeXRenderer from './latex-renderer';

// Constants
const SIZING_CONSTANTS = {
  TITLE_HEIGHT: 48,
  PADDING: 24,
  INNER_PADDING: 12,
  DEBOUNCE_DELAY: 150,
  INITIAL_LOAD_DELAY: 300,
  MAX_ASPECT_RATIO: 4,
  MIN_ASPECT_RATIO: 0.4,
  ASPECT_RATIO_CORRECTION: 3.5,
  MIN_ASPECT_MULTIPLIER: 0.5,
} as const;

interface Size {
  width: number;
  height: number;
}

interface Position {
  x: number;
  y: number;
}

interface AutoResizeMathBoxProps {
  id: string;
  title: string;
  content: string;
  color: string;
  position: Position;
  size?: Size;
  onPositionChange: (position: Position) => void;
  onSizeChange: (size: Size) => void;
  onSaveRequest: () => void;
  boxNumber: number;
  isGridMode?: boolean;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}

interface ContentCharacteristics {
  hasImages: boolean;
  hasLongText: boolean;
  isMultiLine: boolean;
  isMathFormula: boolean;
  isComplexMath: boolean;
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
  const [autoSize, setAutoSize] = useState<Size>({ width: 200, height: 120 });
  const [isManuallyResized, setIsManuallyResized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const resizeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Memoized content characteristics analysis
  const contentCharacteristics = useMemo((): ContentCharacteristics => {
    return {
      hasImages: !!(contentRef.current?.querySelector('img')) || /\.(jpg|jpeg|png|gif|svg|webp)/i.test(content),
      hasLongText: content.length > 200,
      isMultiLine: content.includes('\n') || content.includes('<br>') || content.split(' ').length > 15,
      isMathFormula: content.includes('\\') || content.includes('=') || content.includes('^') || content.includes('frac'),
      isComplexMath: content.includes('\\sum') || content.includes('\\int') || content.includes('\\sqrt') || content.includes('matrix'),
    };
  }, [content]);

  // Cleanup function for timers
  const cleanupTimers = useCallback(() => {
    if (resizeTimerRef.current) {
      clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = null;
    }
    if (initialTimerRef.current) {
      clearTimeout(initialTimerRef.current);
      initialTimerRef.current = null;
    }
  }, []);

  // Enhanced content-aware size calculation with proper error handling
  const calculateContentSize = useCallback((): Size => {
    if (!contentRef.current) {
      return { width: 200, height: 120 };
    }
    
    const contentElement = contentRef.current;
    const { TITLE_HEIGHT, PADDING, INNER_PADDING } = SIZING_CONSTANTS;
    
    // Get computed styles once to avoid repeated calls
    const computedStyle = window.getComputedStyle(contentElement);
    const fontFamily = computedStyle.fontFamily;
    const fontSize = computedStyle.fontSize;
    const lineHeight = computedStyle.lineHeight;
    
    // Create measurement container with proper styling
    const measureElement = document.createElement('div');
    measureElement.style.cssText = `
      position: absolute;
      visibility: hidden;
      top: -9999px;
      left: -9999px;
      width: auto;
      height: auto;
      max-width: ${maxWidth - PADDING}px;
      font-family: ${fontFamily};
      font-size: ${fontSize};
      line-height: ${lineHeight};
      padding: ${INNER_PADDING}px;
      white-space: pre-wrap;
      word-wrap: break-word;
      contain: layout style paint;
    `;
    
    let optimalWidth: number;
    let optimalHeight: number;
    
    try {
      measureElement.innerHTML = contentElement.innerHTML;
      document.body.appendChild(measureElement);
      
      const { hasImages, hasLongText, isMultiLine, isMathFormula } = contentCharacteristics;
      
      if (hasImages) {
        // Image content: generous sizing to accommodate visual content
        const img = measureElement.querySelector('img');
        if (img && img.naturalWidth && img.naturalHeight) {
          optimalWidth = Math.min(maxWidth, Math.max(300, img.naturalWidth + PADDING));
          optimalHeight = Math.min(maxHeight, Math.max(200, img.naturalHeight + TITLE_HEIGHT + PADDING));
        } else {
          optimalWidth = 400;
          optimalHeight = 300;
        }
      } else if (hasLongText) {
        // Long text: prioritize readability with comfortable width
        const idealWidth = Math.min(500, Math.max(300, Math.sqrt(content.length) * 25));
        measureElement.style.width = `${idealWidth - PADDING}px`;
        optimalWidth = idealWidth;
        optimalHeight = Math.min(maxHeight, Math.max(150, measureElement.scrollHeight + TITLE_HEIGHT + PADDING));
      } else if (isMultiLine) {
        // Multi-line content: balanced proportions
        const naturalWidth = Math.min(400, measureElement.scrollWidth);
        measureElement.style.width = `${naturalWidth}px`;
        optimalWidth = naturalWidth + PADDING;
        optimalHeight = Math.min(maxHeight, Math.max(120, measureElement.scrollHeight + TITLE_HEIGHT + PADDING));
      } else if (isMathFormula) {
        // Math formulas: compact but ensure visibility
        const naturalWidth = Math.min(350, measureElement.scrollWidth);
        optimalWidth = Math.max(200, naturalWidth + PADDING);
        measureElement.style.width = `${optimalWidth - PADDING}px`;
        optimalHeight = Math.min(maxHeight, Math.max(100, measureElement.scrollHeight + TITLE_HEIGHT + PADDING));
      } else {
        // Short text/single line: compact sizing
        const naturalWidth = Math.min(300, measureElement.scrollWidth);
        optimalWidth = Math.max(minWidth, naturalWidth + PADDING);
        measureElement.style.width = `${optimalWidth - PADDING}px`;
        optimalHeight = Math.min(maxHeight, Math.max(minHeight, measureElement.scrollHeight + TITLE_HEIGHT + PADDING));
      }
      
    } catch (error) {
      console.error('Error calculating content size:', error);
      // Fallback to default size
      optimalWidth = 200;
      optimalHeight = 120;
    } finally {
      // Ensure cleanup even if error occurs
      if (measureElement.parentNode) {
        document.body.removeChild(measureElement);
      }
    }
    
    // Apply constraints
    optimalWidth = Math.max(minWidth, Math.min(maxWidth, optimalWidth));
    optimalHeight = Math.max(minHeight, Math.min(maxHeight, optimalHeight));
    
    // Ensure reasonable aspect ratios with safe bounds checking
    const ratio = optimalWidth / optimalHeight;
    const { MAX_ASPECT_RATIO, MIN_ASPECT_RATIO, ASPECT_RATIO_CORRECTION, MIN_ASPECT_MULTIPLIER } = SIZING_CONSTANTS;
    
    if (ratio > MAX_ASPECT_RATIO && optimalHeight > 0) {
      // Too wide - increase height
      const newHeight = Math.max(optimalHeight, optimalWidth / ASPECT_RATIO_CORRECTION);
      optimalHeight = Math.min(maxHeight, newHeight);
    } else if (ratio < MIN_ASPECT_RATIO && optimalWidth > 0) {
      // Too tall - increase width
      const newWidth = Math.max(optimalWidth, optimalHeight * MIN_ASPECT_MULTIPLIER);
      optimalWidth = Math.min(maxWidth, newWidth);
    }
    
    return { 
      width: Math.round(optimalWidth), 
      height: Math.round(optimalHeight) 
    };
  }, [content, contentCharacteristics, maxWidth, maxHeight, minWidth, minHeight]);

  // Debounced resize calculation
  const debouncedCalculateSize = useCallback(() => {
    if (resizeTimerRef.current) {
      clearTimeout(resizeTimerRef.current);
    }
    
    resizeTimerRef.current = setTimeout(() => {
      if (!isManuallyResized && !isDragging) {
        const newSize = calculateContentSize();
        setAutoSize(newSize);
        onSizeChange(newSize);
      }
    }, SIZING_CONSTANTS.DEBOUNCE_DELAY);
  }, [calculateContentSize, onSizeChange, isManuallyResized, isDragging]);

  // Setup ResizeObserver for content changes
  useEffect(() => {
    if (!contentRef.current || typeof ResizeObserver === 'undefined') return;

    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === contentRef.current && !isManuallyResized && !isDragging) {
          debouncedCalculateSize();
        }
      }
    });

    resizeObserverRef.current.observe(contentRef.current);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [debouncedCalculateSize, isManuallyResized, isDragging]);

  // Update size when content changes
  useEffect(() => {
    if (contentRef.current && !isManuallyResized && !isDragging) {
      debouncedCalculateSize();
    }
  }, [content, debouncedCalculateSize, isManuallyResized, isDragging]);

  // Initial size calculation on mount
  useEffect(() => {
    if (contentRef.current && !externalSize) {
      initialTimerRef.current = setTimeout(() => {
        const newSize = calculateContentSize();
        setAutoSize(newSize);
        onSizeChange(newSize);
      }, SIZING_CONSTANTS.INITIAL_LOAD_DELAY);
    }

    return () => {
      if (initialTimerRef.current) {
        clearTimeout(initialTimerRef.current);
      }
    };
  }, [calculateContentSize, onSizeChange, externalSize]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupTimers();
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [cleanupTimers]);

  // Use external size if manually resized, otherwise use auto size
  const boxSize = useMemo(() => {
    return isManuallyResized && externalSize ? externalSize : autoSize;
  }, [isManuallyResized, externalSize, autoSize]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragStop = useCallback((e: DraggableEvent, data: DraggableData) => {
    setIsDragging(false);
    onPositionChange({ x: data.x, y: data.y });
    onSaveRequest();
  }, [onPositionChange, onSaveRequest]);

  const handleResize = useCallback((e: SyntheticEvent, { size }: ResizeCallbackData) => {
    setIsManuallyResized(true);
    setAutoSize(size);
    onSizeChange(size);
  }, [onSizeChange]);

  const handleResizeStop = useCallback(() => {
    onSaveRequest();
  }, [onSaveRequest]);

  const borderColor = `hsl(${(boxNumber * 50) % 360}, 70%, 50%)`;

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
      <div 
        className="absolute" 
        style={{ 
          width: `${boxSize.width}px`,
          height: `${boxSize.height}px`
        }}
        role="region"
        aria-label={`Math box ${boxNumber}: ${title}`}
      >
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
            <div 
              className={`w-full h-full bg-gradient-to-br ${color} rounded-xl border-2 shadow-lg hover:shadow-xl transition-all duration-300 animate-scale-in overflow-hidden relative`} 
              style={{ border: `3px solid ${borderColor}` }}
            >
              {/* Make entire box draggable */}
              <div 
                className="drag-handle w-full h-full cursor-move"
                role="button"
                aria-label={`Drag to move math box ${boxNumber}`}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    // Could implement keyboard navigation here
                  }
                }}
              >
                {/* Title Header */}
                <div className="flex items-center justify-between p-3 border-b border-white/20 bg-white/10 backdrop-blur-sm">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-6 h-6 bg-slate-600 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0"
                      aria-label={`Box number ${boxNumber}`}
                    >
                      {boxNumber}
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm truncate select-none">
                      {title}
                    </h4>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <div 
                      className="w-4 h-4 bg-slate-400/30 rounded-full flex items-center justify-center"
                      aria-label="Drag indicator"
                    >
                      <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
                    </div>
                  </div>
                </div>
                
                {/* Content Container */}
                <div className="p-3" style={{ height: `${boxSize.height - SIZING_CONSTANTS.TITLE_HEIGHT}px` }}>
                  <div 
                    ref={contentRef}
                    className="text-sm leading-relaxed h-full overflow-hidden flex items-center justify-center"
                    style={{ cursor: 'text' }}
                    onClick={(e) => e.stopPropagation()}
                    role="region"
                    aria-label="Math content"
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
          <div 
            className={`w-full h-full bg-gradient-to-br ${color} rounded-xl border-2 shadow-lg hover:shadow-xl transition-all duration-300 animate-scale-in overflow-hidden relative`}
            style={{ border: `3px solid ${borderColor}` }}
          >
            {/* Title Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/20 bg-white/10 backdrop-blur-sm">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-6 h-6 bg-slate-600 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0"
                  aria-label={`Box number ${boxNumber}`}
                >
                  {boxNumber}
                </div>
                <h4 className="font-semibold text-slate-900 text-sm truncate select-none">
                  {title}
                </h4>
              </div>
            </div>
            
            {/* Content Container */}
            <div className="p-3" style={{ height: `${boxSize.height - SIZING_CONSTANTS.TITLE_HEIGHT}px` }}>
              <div 
                ref={contentRef}
                className="text-sm leading-relaxed h-full overflow-hidden flex items-center justify-center"
                role="region"
                aria-label="Math content"
              >
                <LaTeXRenderer 
                  content={content} 
                  className="text-base math-content w-full h-full flex items-center justify-center"
                  displayMode={false}
                />
              </div>
            </div>
            
            {/* Grid mode indicator */}
            <div 
              className="absolute bottom-1 right-1 w-3 h-3 opacity-60 pointer-events-none"
              aria-label="Grid mode indicator"
            >
              <div className="w-full h-full bg-blue-400 rounded-tl-lg transform rotate-45 scale-75"></div>
            </div>
          </div>
        )}
      </div>
    </Draggable>
  );
}

export { AutoResizeMathBox };