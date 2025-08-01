import { useState, useEffect, useMemo } from 'react';
import DocumentPage from './document-page';
import DocumentBox from './document-box';
import LaTeXRenderer from './latex-renderer';
import { cn } from '@/lib/utils';
import { nanoid } from 'nanoid';

interface DocumentSettings {
  pageSize: 'letter' | 'a4' | 'legal' | '4x6';
  orientation: 'portrait' | 'landscape';
  margins: 'normal' | 'narrow' | 'wide';
}

interface DocumentBox {
  id: string;
  pageNumber: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  title: string;
  content: string;
  color: string;
}

interface DocumentEditorEnhancedProps {
  content: string;
  settings: DocumentSettings;
  boxes: DocumentBox[];
  onChange: (content: string) => void;
  onBoxesChange: (boxes: DocumentBox[]) => void;
  className?: string;
}

const PAGE_SIZES = {
  letter: { width: 816, height: 1056 },
  a4: { width: 794, height: 1123 },
  legal: { width: 816, height: 1344 },
  '4x6': { width: 384, height: 576 }
};

const MARGIN_SIZES = {
  normal: { top: 96, right: 96, bottom: 96, left: 96 },
  narrow: { top: 48, right: 48, bottom: 48, left: 48 },
  wide: { top: 144, right: 144, bottom: 144, left: 144 }
};

export default function DocumentEditorEnhanced({
  content,
  settings,
  boxes,
  onChange,
  onBoxesChange,
  className
}: DocumentEditorEnhancedProps) {
  const [pages, setPages] = useState<string[]>(['']);

  const dimensions = PAGE_SIZES[settings.pageSize];
  const marginConfig = MARGIN_SIZES[settings.margins];
  
  const pageWidth = settings.orientation === 'landscape' ? dimensions.height : dimensions.width;
  const pageHeight = settings.orientation === 'landscape' ? dimensions.width : dimensions.height;
  
  const contentWidth = pageWidth - marginConfig.left - marginConfig.right;
  const contentHeight = pageHeight - marginConfig.top - marginConfig.bottom;

  // Process content and split into pages
  const processedContent = useMemo(() => {
    if (!content) return [''];

    // Detect and render LaTeX content
    const processLaTeX = (text: string): string => {
      // Replace LaTeX delimiters with rendered content
      return text.replace(/\\\[(.*?)\\\]/g, (match, formula) => {
        try {
          // Return a placeholder that will be rendered by LaTeXRenderer
          return `[LATEX:${formula.trim()}]`;
        } catch {
          return match;
        }
      }).replace(/\\\((.*?)\\\)/g, (match, formula) => {
        try {
          return `[LATEX_INLINE:${formula.trim()}]`;
        } catch {
          return match;
        }
      });
    };

    const processedText = processLaTeX(content);
    
    // Split content into pages based on estimated character count per page
    // This is a simplified pagination - in a real editor you'd measure actual rendered height
    const CHARS_PER_PAGE = 2000; // Rough estimate for page capacity
    const textLength = processedText.length;
    
    if (textLength <= CHARS_PER_PAGE) {
      return [processedText];
    }

    const pageCount = Math.ceil(textLength / CHARS_PER_PAGE);
    const newPages: string[] = [];
    
    for (let i = 0; i < pageCount; i++) {
      const start = i * CHARS_PER_PAGE;
      const end = Math.min(start + CHARS_PER_PAGE, textLength);
      newPages.push(processedText.slice(start, end));
    }
    
    return newPages;
  }, [content]);

  useEffect(() => {
    setPages(processedContent);
  }, [processedContent]);

  const handlePageContentChange = (pageIndex: number, newContent: string) => {
    const updatedPages = [...pages];
    updatedPages[pageIndex] = newContent;
    
    // Merge all pages back into single content
    const mergedContent = updatedPages.join('\n\n--- PAGE BREAK ---\n\n');
    onChange(mergedContent);
  };

  const handleBoxUpdate = (boxId: string, updates: Partial<DocumentBox>) => {
    const updatedBoxes = boxes.map(box => 
      box.id === boxId ? { ...box, ...updates } : box
    );
    onBoxesChange(updatedBoxes);
  };

  const handleBoxDelete = (boxId: string) => {
    const updatedBoxes = boxes.filter(box => box.id !== boxId);
    onBoxesChange(updatedBoxes);
  };

  const addNewBox = (pageNumber: number, content: string, title: string = '') => {
    const newBox: DocumentBox = {
      id: nanoid(),
      pageNumber,
      position: { x: 50, y: 100 },
      size: { width: 300, height: 150 },
      title: title || `Box ${boxes.length + 1}`,
      content,
      color: 'from-blue-50 to-indigo-50 border-blue-200'
    };
    onBoxesChange([...boxes, newBox]);
  };



  return (
    <div className={cn("bg-gray-100 min-h-full py-8", className)}>
      <div className="max-w-none">
        {pages.map((pageContent, index) => {
          const pageNumber = index + 1;
          const pageBoxes = boxes.filter(box => box.pageNumber === pageNumber);
          
          return (
            <div key={index} className="mb-8 relative">
              <DocumentPage
                pageNumber={pageNumber}
                content={pageContent}
                pageSize={settings.pageSize}
                orientation={settings.orientation}
                margins={settings.margins}
                onContentChange={(newContent) => handlePageContentChange(index, newContent)}
              />
              
              {/* Overlay for boxes */}
              <div 
                className="absolute top-0 left-0 pointer-events-auto"
                style={{
                  width: `${pageWidth}px`,
                  height: `${pageHeight}px`,
                  marginLeft: 'auto',
                  marginRight: 'auto'
                }}
              >
                {pageBoxes.map(box => (
                  <DocumentBox
                    key={box.id}
                    id={box.id}
                    pageNumber={box.pageNumber}
                    position={box.position}
                    size={box.size}
                    title={box.title}
                    content={box.content}
                    color={box.color}
                    onUpdate={handleBoxUpdate}
                    onDelete={handleBoxDelete}
                    pageBounds={{ width: contentWidth, height: contentHeight }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}