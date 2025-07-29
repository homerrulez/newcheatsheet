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
  isGridMode = false
}: AutoResizeMathBoxProps) {
  const [autoSize, setAutoSize] = useState({ width: 200, height: 120 });
  const [isManuallyResized, setIsManuallyResized] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Use external size if manually resized, otherwise use auto-calculated size
  const currentSize = isManuallyResized && externalSize ? externalSize : autoSize;

  // Auto-resize based on content using ResizeObserver
  const setupResizeObserver = useCallback(() => {
    if (!contentRef.current || isManuallyResized) return;

    // Clean up previous observer
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }

    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        
        // Add padding for title bar (4rem) and content padding (24px)
        const newHeight = Math.max(120, height + 64 + 24);
        const newWidth = Math.max(200, Math.min(800, width + 48));
        
        setAutoSize(prev => {
          // Only update if size actually changed to avoid infinite loops
          if (Math.abs(prev.width - newWidth) > 5 || Math.abs(prev.height - newHeight) > 5) {
            return { width: newWidth, height: newHeight };
          }
          return prev;
        });
      }
    });

    resizeObserverRef.current.observe(contentRef.current);
  }, [isManuallyResized]);

  // Set up ResizeObserver when content changes
  useEffect(() => {
    if (!isManuallyResized) {
      const timer = setTimeout(() => {
        setupResizeObserver();
      }, 100);

      return () => {
        clearTimeout(timer);
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect();
        }
      };
    }
  }, [content, setupResizeObserver, isManuallyResized]);

  // Handle position updates
  const handleDragStop = useCallback((e: any, data: any) => {
    const newPosition = { x: Math.max(0, data.x), y: Math.max(0, data.y) };
    onPositionChange(newPosition);
    onSaveRequest();
  }, [onPositionChange, onSaveRequest]);

  // Handle manual resize
  const handleResize = useCallback((e: any, data: any) => {
    setIsManuallyResized(true);
    onSizeChange({ width: data.size.width, height: data.size.height });
  }, [onSizeChange]);

  const handleResizeStop = useCallback(() => {
    onSaveRequest();
  }, [onSaveRequest]);

  // Grid mode: fixed positioning with no dragging/resizing
  if (isGridMode) {
    return (
      <div
        className={`w-full h-full bg-gradient-to-br ${color} rounded-xl border-2 shadow-lg hover:shadow-xl transition-all duration-300 animate-scale-in overflow-hidden relative`}
      >
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
        <div className="p-3 h-[calc(100%-4rem)] overflow-auto">
          <div 
            ref={contentRef}
            className="text-sm leading-relaxed"
          >
            {/* Render LaTeX or regular content */}
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
    );
  }

  // Free positioning mode: draggable and resizable
  return (
    <Draggable
      position={position}
      onStop={handleDragStop}
      grid={[10, 10]}
      handle=".drag-handle"
    >
      <div className="absolute">
        <ResizableBox
          width={currentSize.width}
          height={currentSize.height}
          minConstraints={[200, 120]}
          maxConstraints={[800, 600]}
          onResize={handleResize}
          onResizeStop={handleResizeStop}
          resizeHandles={['se', 'sw', 'ne', 'nw']}
          className="relative group professional-resize-handles"
        >
          <div
            className={`w-full h-full bg-gradient-to-br ${color} rounded-xl border-2 shadow-lg hover:shadow-xl transition-all duration-300 animate-scale-in overflow-hidden relative`}
          >
            {/* Title Header with Drag Handle and Box Number */}
            <div className="drag-handle flex items-center justify-between p-3 border-b border-white/20 bg-white/10 backdrop-blur-sm cursor-move hover:bg-white/20 transition-colors">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-slate-600 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                  {boxNumber}
                </div>
                <h4 className="font-semibold text-slate-900 text-sm truncate select-none">{title}</h4>
              </div>
              <div className="flex items-center space-x-1 opacity-60">
                <div className="w-1 h-1 bg-slate-600 rounded-full"></div>
                <div className="w-1 h-1 bg-slate-600 rounded-full"></div>
                <div className="w-1 h-1 bg-slate-600 rounded-full"></div>
                <div className="w-1 h-1 bg-slate-600 rounded-full"></div>
                <div className="w-1 h-1 bg-slate-600 rounded-full"></div>
                <div className="w-1 h-1 bg-slate-600 rounded-full"></div>
              </div>
            </div>
            
            {/* Content Container */}
            <div className="p-3 h-[calc(100%-4rem)] overflow-auto">
              <div 
                ref={contentRef}
                className="text-sm leading-relaxed"
                style={!isManuallyResized ? { 
                  width: 'fit-content',
                  maxWidth: '100%',
                  display: 'inline-block'
                } : {}}
              >
                {/* Render LaTeX or regular content */}
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
            
            {/* Size indicator - auto (green) or manual (blue) */}
            <div className="absolute bottom-1 right-1 w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className={`w-full h-full ${isManuallyResized ? 'bg-blue-400' : 'bg-green-400'} rounded-tl-lg transform rotate-45 scale-75`}></div>
            </div>
          </div>
        </ResizableBox>
      </div>
    </Draggable>
  );
}