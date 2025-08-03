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
  MIN_FONT_SIZE: 8,
  MAX_FONT_SIZE: 24,
  DEFAULT_FONT_SIZE: 14,
  DEBOUNCE_DELAY: 100,
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
  minWidth = 100,
  maxWidth = 1200,
  minHeight = 80,
  maxHeight = 800
}: AutoResizeMathBoxProps) {
  const [currentSize, setCurrentSize] = useState<Size>(externalSize || { width: 300, height: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [optimalFontSize, setOptimalFontSize] = useState(SIZING_CONSTANTS.DEFAULT_FONT_SIZE);
  const [contentLayout, setContentLayout] = useState({ lineHeight: 1.4, wordSpacing: 'normal' });
  
  const contentRef = useRef<HTMLDivElement>(null);
  const resizeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate optimal font size and layout for current box dimensions
  const calculateOptimalDisplay = useCallback((boxSize: Size): { fontSize: number; lineHeight: number; wordSpacing: string; letterSpacing: string } => {
    if (!contentRef.current || !content.trim()) {
      return { 
        fontSize: SIZING_CONSTANTS.DEFAULT_FONT_SIZE, 
        lineHeight: 1.4, 
        wordSpacing: 'normal',
        letterSpacing: 'normal'
      };
    }

    const availableWidth = boxSize.width - SIZING_CONSTANTS.PADDING;
    const availableHeight = boxSize.height - SIZING_CONSTANTS.TITLE_HEIGHT - SIZING_CONSTANTS.PADDING;

    // Create measurement container
    const measureContainer = document.createElement('div');
    measureContainer.style.cssText = `
      position: absolute;
      visibility: hidden;
      top: -9999px;
      left: -9999px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-wrap: break-word;
      hyphens: auto;
      contain: layout style paint;
    `;

    try {
      document.body.appendChild(measureContainer);
      
      // Binary search for optimal font size
      let minFont = SIZING_CONSTANTS.MIN_FONT_SIZE;
      let maxFont = SIZING_CONSTANTS.MAX_FONT_SIZE;
      let bestFit = { fontSize: minFont, lineHeight: 1.2, wordSpacing: 'normal', letterSpacing: 'normal' };
      
      while (maxFont - minFont > 0.5) {
        const testFont = (minFont + maxFont) / 2;
        
        // Test different line heights for better fitting
        const lineHeights = [1.1, 1.2, 1.3, 1.4, 1.5];
        let fitsWithThisFont = false;
        
        for (const lineHeight of lineHeights) {
          measureContainer.style.cssText += `
            font-size: ${testFont}px;
            line-height: ${lineHeight};
            width: ${availableWidth}px;
            height: auto;
            max-height: none;
          `;
          
          measureContainer.textContent = content;
          
          const contentHeight = measureContainer.scrollHeight;
          
          if (contentHeight <= availableHeight) {
            bestFit = { 
              fontSize: testFont, 
              lineHeight, 
              wordSpacing: availableWidth < 200 ? '-0.05em' : 'normal',
              letterSpacing: availableWidth < 150 ? '-0.02em' : 'normal'
            };
            fitsWithThisFont = true;
            break;
          }
        }
        
        if (fitsWithThisFont) {
          minFont = testFont;
        } else {
          maxFont = testFont;
        }
      }
      
      // If content still doesn't fit, try more aggressive spacing
      if (bestFit.fontSize === SIZING_CONSTANTS.MIN_FONT_SIZE) {
        measureContainer.style.cssText += `
          font-size: ${bestFit.fontSize}px;
          line-height: 1.1;
          width: ${availableWidth}px;
          word-spacing: -0.1em;
          letter-spacing: -0.03em;
        `;
        measureContainer.textContent = content;
        
        if (measureContainer.scrollHeight <= availableHeight) {
          bestFit = {
            fontSize: bestFit.fontSize,
            lineHeight: 1.1,
            wordSpacing: '-0.1em',
            letterSpacing: '-0.03em'
          };
        }
      }
      
      return bestFit;
      
    } catch (error) {
      console.error('Error calculating optimal display:', error);
      return { 
        fontSize: SIZING_CONSTANTS.DEFAULT_FONT_SIZE, 
        lineHeight: 1.4, 
        wordSpacing: 'normal',
        letterSpacing: 'normal'
      };
    } finally {
      if (measureContainer.parentNode) {
        document.body.removeChild(measureContainer);
      }
    }
  }, [content]);

  // Debounced recalculation
  const debouncedRecalculate = useCallback(() => {
    if (resizeTimerRef.current) {
      clearTimeout(resizeTimerRef.current);
    }
    
    resizeTimerRef.current = setTimeout(() => {
      const optimal = calculateOptimalDisplay(currentSize);
      setOptimalFontSize(optimal.fontSize);
      setContentLayout({
        lineHeight: optimal.lineHeight,
        wordSpacing: optimal.wordSpacing
      });
    }, SIZING_CONSTANTS.DEBOUNCE_DELAY);
  }, [calculateOptimalDisplay, currentSize]);

  // Recalculate when size or content changes
  useEffect(() => {
    debouncedRecalculate();
  }, [currentSize, content, debouncedRecalculate]);

  // Sync with external size changes
  useEffect(() => {
    if (externalSize && (externalSize.width !== currentSize.width || externalSize.height !== currentSize.height)) {
      setCurrentSize(externalSize);
    }
  }, [externalSize, currentSize]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
      }
    };
  }, []);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragStop = useCallback((e: DraggableEvent, data: DraggableData) => {
    setIsDragging(false);
    onPositionChange({ x: data.x, y: data.y });
    onSaveRequest();
  }, [onPositionChange, onSaveRequest]);

  const handleResize = useCallback((e: SyntheticEvent, { size }: ResizeCallbackData) => {
    setCurrentSize(size);
    onSizeChange(size);
  }, [onSizeChange]);

  const handleResizeStop = useCallback(() => {
    onSaveRequest();
  }, [onSaveRequest]);

  // Calculate initial size if not provided
  const initialSize = useMemo(() => {
    if (externalSize) return externalSize;
    
    // Quick estimation for initial size
    const wordCount = content.split(/\s+/).length;
    const hasComplexMath = /\\[a-zA-Z]+|\^|\{|\}|_/.test(content);
    
    let estimatedWidth = Math.min(maxWidth, Math.max(minWidth, Math.sqrt(wordCount) * 40));
    let estimatedHeight = Math.min(maxHeight, Math.max(minHeight, wordCount * 2 + 100));
    
    if (hasComplexMath) {
      estimatedHeight += 50;
      estimatedWidth += 100;
    }
    
    return { 
      width: Math.round(estimatedWidth), 
      height: Math.round(estimatedHeight) 
    };
  }, [content, externalSize, maxWidth, minWidth, maxHeight, minHeight]);

  // Use initial size if currentSize hasn't been set
  const boxSize = currentSize.width > 0 ? currentSize : initialSize;

  const borderColor = `hsl(${(boxNumber * 50) % 360}, 70%, 50%)`;

  // Dynamic styles for content
  const contentStyles = useMemo(() => ({
    fontSize: `${optimalFontSize}px`,
    lineHeight: contentLayout.lineHeight,
    wordSpacing: contentLayout.wordSpacing,
    letterSpacing: (contentLayout as any).letterSpacing || 'normal',
    overflow: 'hidden',
    textOverflow: 'clip',
    wordWrap: 'break-word' as const,
    overflowWrap: 'break-word' as const,
    hyphens: 'auto' as const,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    textAlign: 'left' as const,
    width: '100%',
    height: '100%',
    padding: '0',
    margin: '0'
  }), [optimalFontSize, contentLayout]);

  return (
    <Draggable
      position={isDragging ? undefined : position}
      defaultPosition={isDragging ? position : undefined}
      onStart={handleDragStart}
      onStop={handleDragStop}
      grid={[5, 5]}
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
          // Manual resize mode
          <ResizableBox
            width={boxSize.width}
            height={boxSize.height}
            minConstraints={[minWidth, minHeight]}
            maxConstraints={[maxWidth, maxHeight]}
            onResize={handleResize}
            onResizeStop={handleResizeStop}
            resizeHandles={['se', 'sw', 'ne', 'nw', 's', 'n', 'e', 'w']}
            className="relative group"
          >
            <div 
              className={`w-full h-full bg-gradient-to-br ${color} rounded-xl border-2 shadow-lg hover:shadow-xl transition-all duration-200 relative`} 
              style={{ border: `3px solid ${borderColor}` }}
            >
              <div 
                className="drag-handle w-full h-full cursor-move"
                role="button"
                aria-label={`Drag to move box ${boxNumber}`}
                tabIndex={0}
              >
                {/* Title Header */}
                <div className="flex items-center justify-between p-3 border-b border-white/20 bg-white/10 backdrop-blur-sm">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
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
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                    <div className="text-xs text-slate-600 bg-white/20 px-2 py-1 rounded">
                      {Math.round(optimalFontSize)}px
                    </div>
                    <div 
                      className="w-4 h-4 bg-slate-400/30 rounded-full flex items-center justify-center"
                      aria-label="Resize handles"
                    >
                      <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
                    </div>
                  </div>
                </div>
                
                {/* Content Container - Always fits content */}
                <div 
                  className="relative"
                  style={{ 
                    height: `${boxSize.height - SIZING_CONSTANTS.TITLE_HEIGHT}px`,
                    padding: `${SIZING_CONSTANTS.PADDING / 2}px`,
                    overflow: 'hidden'
                  }}
                >
                  <div 
                    ref={contentRef}
                    className="w-full h-full"
                    style={contentStyles}
                    onClick={(e) => e.stopPropagation()}
                    role="region"
                    aria-label="Auto-fitting content"
                  >
                    <LaTeXRenderer 
                      content={content} 
                      className="w-full h-full math-content"
                      displayMode={false}
                      style={{
                        fontSize: 'inherit',
                        lineHeight: 'inherit',
                        wordSpacing: 'inherit',
                        letterSpacing: 'inherit',
                        overflow: 'hidden',
                        display: 'block',
                        width: '100%',
                        height: '100%'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </ResizableBox>
        ) : (
          // Grid mode - auto-sizing only
          <div 
            className={`w-full h-full bg-gradient-to-br ${color} rounded-xl border-2 shadow-lg hover:shadow-xl transition-all duration-200 relative`}
            style={{ border: `3px solid ${borderColor}` }}
          >
            {/* Title Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/20 bg-white/10 backdrop-blur-sm">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
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
              <div className="text-xs text-slate-600 bg-white/20 px-2 py-1 rounded">
                Auto-fit
              </div>
            </div>
            
            {/* Content Container */}
            <div 
              className="relative"
              style={{ 
                height: `${boxSize.height - SIZING_CONSTANTS.TITLE_HEIGHT}px`,
                padding: `${SIZING_CONSTANTS.PADDING / 2}px`,
                overflow: 'hidden'
              }}
            >
              <div 
                ref={contentRef}
                className="w-full h-full"
                style={contentStyles}
                role="region"
                aria-label="Auto-fitting content"
              >
                <LaTeXRenderer 
                  content={content} 
                  className="w-full h-full math-content"
                  displayMode={false}
                  style={{
                    fontSize: 'inherit',
                    lineHeight: 'inherit',
                    wordSpacing: 'inherit',
                    letterSpacing: 'inherit',
                    overflow: 'hidden',
                    display: 'block',
                    width: '100%',
                    height: '100%'
                  }}
                />
              </div>
            </div>
            
            {/* Auto-fit indicator */}
            <div 
              className="absolute bottom-1 right-1 w-3 h-3 opacity-60 pointer-events-none"
              aria-label="Auto-fit mode"
            >
              <div className="w-full h-full bg-green-400 rounded-full animate-pulse"></div>
            </div>
          </div>
        )}
      </div>
    </Draggable>
  );
}

export { AutoResizeMathBox };