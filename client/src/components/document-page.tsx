import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface DocumentPageProps {
  pageNumber: number;
  content: string;
  pageSize: 'letter' | 'a4' | 'legal' | '4x6';
  orientation: 'portrait' | 'landscape';
  margins: 'normal' | 'narrow' | 'wide';
  textScaleFactor?: number;
  onContentChange: (content: string) => void;
  className?: string;
}

const PAGE_SIZES = {
  letter: { width: 816, height: 1056 }, // 8.5" x 11" at 96 DPI
  a4: { width: 794, height: 1123 },     // 210mm x 297mm at 96 DPI
  legal: { width: 816, height: 1344 },  // 8.5" x 14" at 96 DPI
  '4x6': { width: 384, height: 576 }    // 4" x 6" at 96 DPI
};

const MARGIN_SIZES = {
  normal: { top: 96, right: 96, bottom: 96, left: 96 }, // 1 inch
  narrow: { top: 48, right: 48, bottom: 48, left: 48 }, // 0.5 inch
  wide: { top: 144, right: 144, bottom: 144, left: 144 } // 1.5 inch
};

export default function DocumentPage({
  pageNumber,
  content,
  pageSize,
  orientation,
  margins,
  textScaleFactor = 1,
  onContentChange,
  className
}: DocumentPageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const dimensions = PAGE_SIZES[pageSize];
  const marginConfig = MARGIN_SIZES[margins];
  
  const pageWidth = orientation === 'landscape' ? dimensions.height : dimensions.width;
  const pageHeight = orientation === 'landscape' ? dimensions.width : dimensions.height;
  
  const contentWidth = pageWidth - marginConfig.left - marginConfig.right;
  const contentHeight = pageHeight - marginConfig.top - marginConfig.bottom;

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(content.length, content.length);
    }
  }, [isEditing, content.length]);

  const handleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  return (
    <div 
      className={cn(
        "relative bg-white border border-gray-300 shadow-lg mx-auto my-4 print:shadow-none print:border-none",
        className
      )}
      style={{
        width: `${pageWidth}px`,
        height: `${pageHeight}px`,
        minHeight: `${pageHeight}px`
      }}
    >
      {/* Page number */}
      <div className="absolute top-2 right-4 text-xs text-gray-400 print:hidden">
        Page {pageNumber}
      </div>
      
      {/* Content area */}
      <div
        className="absolute"
        style={{
          top: `${marginConfig.top}px`,
          left: `${marginConfig.left}px`,
          width: `${contentWidth}px`,
          height: `${contentHeight}px`
        }}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full h-full p-0 border-none resize-none focus:outline-none font-serif text-base leading-relaxed"
            style={{ 
              fontSize: `${12 * textScaleFactor}pt`, 
              lineHeight: '1.5',
              transform: `scale(${textScaleFactor})`,
              transformOrigin: 'top left',
              width: `${100 / textScaleFactor}%`,
              height: `${100 / textScaleFactor}%`
            }}
          />
        ) : (
          <div
            onClick={handleClick}
            className="w-full h-full cursor-text font-serif text-base leading-relaxed overflow-hidden"
            style={{ 
              fontSize: `${12 * textScaleFactor}pt`, 
              lineHeight: '1.5',
              transform: `scale(${textScaleFactor})`,
              transformOrigin: 'top left',
              width: `${100 / textScaleFactor}%`,
              height: `${100 / textScaleFactor}%`
            }}
          >
            {content ? (
              <div className="whitespace-pre-wrap break-words">
                {content}
              </div>
            ) : (
              <div className="text-gray-400 italic">
                Click to start writing...
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Page break indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200 print:hidden" />
    </div>
  );
}