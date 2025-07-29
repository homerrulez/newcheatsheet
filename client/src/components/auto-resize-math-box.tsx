import { useState, useEffect, useRef, useCallback } from 'react';
import Draggable from 'react-draggable';
import LaTeXRenderer from './latex-renderer';

interface AutoResizeMathBoxProps {
  id: string;
  title: string;
  content: string;
  color: string;
  position: { x: number; y: number };
  onPositionChange: (position: { x: number; y: number }) => void;
  onSaveRequest: () => void;
  boxNumber: number;
}

export default function AutoResizeMathBox({
  id,
  title,
  content,
  color,
  position,
  onPositionChange,
  onSaveRequest,
  boxNumber
}: AutoResizeMathBoxProps) {
  const [size, setSize] = useState({ width: 200, height: 120 });
  const contentRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Auto-resize based on content using ResizeObserver
  const setupResizeObserver = useCallback(() => {
    if (!contentRef.current) return;

    // Clean up previous observer
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }

    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        
        // Add padding for title bar (4rem) and content padding (24px)
        const newHeight = Math.max(120, height + 64 + 24);
        const newWidth = Math.max(200, Math.min(800, width + 48)); // Max width constraint
        
        setSize(prev => {
          // Only update if size actually changed to avoid infinite loops
          if (Math.abs(prev.width - newWidth) > 5 || Math.abs(prev.height - newHeight) > 5) {
            return { width: newWidth, height: newHeight };
          }
          return prev;
        });
      }
    });

    resizeObserverRef.current.observe(contentRef.current);
  }, []);

  // Set up ResizeObserver when content changes
  useEffect(() => {
    // Wait for MathJax to render, then observe
    const timer = setTimeout(() => {
      setupResizeObserver();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [content, setupResizeObserver]);

  // Handle position updates
  const handleDragStop = useCallback((e: any, data: any) => {
    const newPosition = { x: Math.max(0, data.x), y: Math.max(0, data.y) };
    onPositionChange(newPosition);
    onSaveRequest();
  }, [onPositionChange, onSaveRequest]);

  return (
    <Draggable
      position={position}
      onStop={handleDragStop}
      grid={[10, 10]}
      handle=".drag-handle"
    >
      <div 
        className="absolute"
        style={{
          width: size.width,
          height: size.height,
          minWidth: 200,
          minHeight: 120,
          maxWidth: 800
        }}
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
          
          {/* Auto-sizing Content Container */}
          <div className="p-3" style={{ minHeight: 'calc(100% - 4rem)' }}>
            <div 
              ref={contentRef}
              className="text-sm leading-relaxed"
              style={{ 
                width: 'fit-content',
                maxWidth: '100%',
                display: 'inline-block'
              }}
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
          
          {/* Auto-resize indicator */}
          <div className="absolute bottom-1 right-1 w-3 h-3 opacity-60 pointer-events-none">
            <div className="w-full h-full bg-green-400 rounded-tl-lg transform rotate-45 scale-75"></div>
          </div>
        </div>
      </div>
    </Draggable>
  );
}