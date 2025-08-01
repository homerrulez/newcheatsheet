import { useState, useRef, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LaTeXRenderer from './latex-renderer';
import { cn } from '@/lib/utils';

interface DocumentBoxProps {
  id: string;
  pageNumber: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  title: string;
  content: string;
  color: string;
  onUpdate: (id: string, updates: {
    position?: { x: number; y: number };
    size?: { width: number; height: number };
    title?: string;
    content?: string;
  }) => void;
  onDelete: (id: string) => void;
  pageBounds: { width: number; height: number };
  className?: string;
}

export default function DocumentBox({
  id,
  pageNumber,
  position,
  size,
  title,
  content,
  color,
  onUpdate,
  onDelete,
  pageBounds,
  className
}: DocumentBoxProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);
  const [localContent, setLocalContent] = useState(content);
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    onUpdate(id, {
      title: localTitle,
      content: localContent
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalTitle(title);
    setLocalContent(content);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const isLaTeX = content.includes('\\') || content.includes('^') || content.includes('_');

  return (
    <Rnd
      size={size}
      position={position}
      onDragStop={(e, d) => {
        // Constrain to page bounds
        const constrainedX = Math.max(0, Math.min(d.x, pageBounds.width - size.width));
        const constrainedY = Math.max(0, Math.min(d.y, pageBounds.height - size.height));
        onUpdate(id, { position: { x: constrainedX, y: constrainedY } });
      }}
      onResizeStop={(e, direction, ref, delta, position) => {
        const newWidth = parseInt(ref.style.width);
        const newHeight = parseInt(ref.style.height);
        
        // Constrain to page bounds
        const constrainedWidth = Math.min(newWidth, pageBounds.width - position.x);
        const constrainedHeight = Math.min(newHeight, pageBounds.height - position.y);
        
        onUpdate(id, {
          size: { width: constrainedWidth, height: constrainedHeight },
          position
        });
      }}
      bounds="parent"
      dragHandleClassName="drag-handle"
      className={cn("absolute", className)}
    >
      <div className={cn(
        "w-full h-full rounded-lg border-2 shadow-sm bg-gradient-to-br transition-all duration-200",
        color,
        "hover:shadow-md"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-white/50 rounded-t-lg">
          <div className="flex items-center space-x-2 flex-1">
            <GripVertical className="w-4 h-4 text-gray-400 drag-handle cursor-move" />
            {isEditing ? (
              <input
                ref={titleRef}
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 text-sm font-medium bg-transparent border-none outline-none"
                placeholder="Box title..."
              />
            ) : (
              <h3 
                className="flex-1 text-sm font-medium text-gray-700 truncate cursor-pointer"
                onClick={() => setIsEditing(true)}
              >
                {title || 'Untitled'}
              </h3>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            <span className="text-xs text-gray-400 bg-gray-100 px-1 rounded">
              P{pageNumber}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(id)}
              className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 flex-1 overflow-hidden">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                ref={contentRef}
                value={localContent}
                onChange={(e) => setLocalContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full h-16 text-sm border border-gray-200 rounded p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Content..."
              />
              <div className="flex space-x-2">
                <Button size="sm" onClick={handleSave}>Save</Button>
                <Button size="sm" variant="outline" onClick={handleCancel}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div 
              className="text-sm text-gray-700 cursor-pointer h-full overflow-auto"
              onClick={() => setIsEditing(true)}
            >
              {isLaTeX && content ? (
                <LaTeXRenderer content={content} displayMode={false} />
              ) : (
                <div className="whitespace-pre-wrap break-words">
                  {content || <span className="text-gray-400 italic">Click to add content...</span>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Rnd>
  );
}