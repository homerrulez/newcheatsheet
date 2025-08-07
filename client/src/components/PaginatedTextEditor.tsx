import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Page {
  id: string;
  content: string;
}

interface PaginatedTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  fontSize: number;
  fontFamily: string;
  zoom: number;
  onCursorPositionChange?: (position: number) => void;
}

export function PaginatedTextEditor({
  content,
  onChange,
  fontSize,
  fontFamily,
  zoom,
  onCursorPositionChange
}: PaginatedTextEditorProps) {
  const [pages, setPages] = useState<Page[]>([{ id: '1', content: content || '' }]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const pageRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  
  // Page dimensions (8.5" x 11" with 1" margins at 96 DPI)
  const pageWidth = 816; // 8.5" * 96 DPI
  const pageHeight = 1056; // 11" * 96 DPI
  const marginSize = 96; // 1" margin * 96 DPI
  const contentWidth = pageWidth - (marginSize * 2); // 6.5"
  const contentHeight = pageHeight - (marginSize * 2); // 9"

  // Binary search to find overflow break point
  const findOverflowBreakPoint = useCallback((editor: HTMLTextAreaElement, text: string) => {
    let left = 0;
    let right = text.length;
    let lastValidPosition = text.length;
    
    const originalValue = editor.value;
    
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const testContent = text.substring(0, mid);
      
      editor.value = testContent;
      
      if (editor.scrollHeight <= editor.clientHeight) {
        lastValidPosition = mid;
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    
    editor.value = originalValue;
    return lastValidPosition;
  }, []);

  // Find nearest word boundary for clean breaks
  const findNearestBreakPoint = useCallback((text: string, targetPosition: number) => {
    // Look for line breaks first (within 20 chars)
    for (let i = targetPosition; i >= Math.max(0, targetPosition - 20); i--) {
      if (text[i] === '\n') return i + 1;
    }
    
    // Then look for word breaks (within 10 chars)
    for (let i = targetPosition; i >= Math.max(0, targetPosition - 10); i--) {
      if (text[i] === ' ') return i + 1;
    }
    
    // Use exact position if no nearby break
    return targetPosition;
  }, []);

  // Handle overflow when page content exceeds capacity
  const handleOverflow = useCallback((pageIndex: number) => {
    const editor = pageRefs.current[pageIndex];
    if (!editor) return;

    const text = editor.value;
    const breakPoint = findOverflowBreakPoint(editor, text);
    const cleanBreakPoint = findNearestBreakPoint(text, breakPoint);
    
    const keepContent = text.substring(0, cleanBreakPoint);
    const overflowContent = text.substring(cleanBreakPoint);

    setPages(prevPages => {
      const newPages = [...prevPages];
      newPages[pageIndex] = { ...newPages[pageIndex], content: keepContent };
      
      // Add overflow to next page or create new page
      if (pageIndex + 1 < newPages.length) {
        newPages[pageIndex + 1] = {
          ...newPages[pageIndex + 1],
          content: overflowContent + newPages[pageIndex + 1].content
        };
      } else {
        newPages.push({
          id: (newPages.length + 1).toString(),
          content: overflowContent
        });
      }
      
      return newPages;
    });

    // Move cursor to next page if it was in overflow text
    const editorCursorPos = editor.selectionStart || 0;
    if (editorCursorPos > cleanBreakPoint) {
      setTimeout(() => {
        setCurrentPageIndex(pageIndex + 1);
        const nextEditor = pageRefs.current[pageIndex + 1];
        if (nextEditor) {
          const newCursorPos = editorCursorPos - cleanBreakPoint;
          nextEditor.focus();
          nextEditor.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  }, [findOverflowBreakPoint, findNearestBreakPoint]);

  // Handle underflow - pull content from next page
  const handleUnderflow = useCallback((pageIndex: number) => {
    const editor = pageRefs.current[pageIndex];
    const nextEditor = pageRefs.current[pageIndex + 1];
    if (!editor || !nextEditor || pageIndex >= pages.length - 1) return;

    const spaceRatio = editor.scrollHeight / editor.clientHeight;
    
    // Only pull content if page is less than 40% full
    if (spaceRatio < 0.4 && nextEditor.value.length > 0) {
      const nextPageContent = nextEditor.value;
      const pullAmount = Math.min(nextPageContent.length, 100); // Pull up to 100 chars
      
      const pulledContent = nextPageContent.substring(0, pullAmount);
      const remainingContent = nextPageContent.substring(pullAmount);
      
      setPages(prevPages => {
        const newPages = [...prevPages];
        newPages[pageIndex] = {
          ...newPages[pageIndex],
          content: newPages[pageIndex].content + pulledContent
        };
        
        if (remainingContent.length > 0) {
          newPages[pageIndex + 1] = {
            ...newPages[pageIndex + 1],
            content: remainingContent
          };
        } else {
          // Remove empty page
          newPages.splice(pageIndex + 1, 1);
        }
        
        return newPages;
      });
    }
  }, [pages.length]);

  // Check for overflow on content change
  const checkForOverflow = useCallback((pageIndex: number) => {
    const editor = pageRefs.current[pageIndex];
    if (!editor) return;

    if (editor.scrollHeight > editor.clientHeight) {
      handleOverflow(pageIndex);
    } else {
      handleUnderflow(pageIndex);
    }
  }, [handleOverflow, handleUnderflow]);

  // Handle page content change
  const handlePageChange = useCallback((pageIndex: number, newContent: string) => {
    setPages(prevPages => {
      const newPages = [...prevPages];
      newPages[pageIndex] = { ...newPages[pageIndex], content: newContent };
      return newPages;
    });

    // Check for overflow after state update
    setTimeout(() => checkForOverflow(pageIndex), 0);
    
    // Update overall content
    const fullContent = pages.map((page, idx) => 
      idx === pageIndex ? newContent : page.content
    ).join('');
    onChange(fullContent);
  }, [pages, onChange, checkForOverflow]);

  // Handle navigation between pages
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>, pageIndex: number) => {
    const editor = e.currentTarget;
    const { selectionStart, selectionEnd } = editor;
    
    if (e.key === 'ArrowUp' && selectionStart === 0 && pageIndex > 0) {
      e.preventDefault();
      const prevEditor = pageRefs.current[pageIndex - 1];
      if (prevEditor) {
        prevEditor.focus();
        prevEditor.setSelectionRange(prevEditor.value.length, prevEditor.value.length);
        setCurrentPageIndex(pageIndex - 1);
      }
    } else if (e.key === 'ArrowDown' && selectionStart === editor.value.length && pageIndex < pages.length - 1) {
      e.preventDefault();
      const nextEditor = pageRefs.current[pageIndex + 1];
      if (nextEditor) {
        nextEditor.focus();
        nextEditor.setSelectionRange(0, 0);
        setCurrentPageIndex(pageIndex + 1);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (pageIndex < pages.length - 1) {
        const nextEditor = pageRefs.current[pageIndex + 1];
        if (nextEditor) {
          nextEditor.focus();
          setCurrentPageIndex(pageIndex + 1);
        }
      }
    }
  }, [pages.length]);

  // Update pages when content prop changes
  useEffect(() => {
    if (pages.length === 1 && pages[0].content !== content) {
      setPages([{ id: '1', content: content || '' }]);
    }
  }, [content, pages]);

  // Update cursor position callback
  const handleCursorChange = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const editor = e.currentTarget;
    const position = editor.selectionStart || 0;
    setCursorPosition(position);
    onCursorPositionChange?.(position);
  }, [onCursorPositionChange]);

  const editorStyle = {
    width: `${contentWidth * zoom / 100}px`,
    height: `${contentHeight * zoom / 100}px`,
    fontSize: `${fontSize * zoom / 100}px`,
    fontFamily: fontFamily,
    lineHeight: '1.5',
    padding: '0',
    border: 'none',
    outline: 'none',
    resize: 'none' as const,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  };

  const pageStyle = {
    width: `${pageWidth * zoom / 100}px`,
    height: `${pageHeight * zoom / 100}px`,
    backgroundColor: 'white',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    margin: '20px auto',
    padding: `${marginSize * zoom / 100}px`,
    position: 'relative' as const,
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-100 p-8">
      <div className="max-w-none">
        {pages.map((page, index) => (
          <div key={page.id} style={pageStyle}>
            <textarea
              ref={el => pageRefs.current[index] = el}
              value={page.content}
              onChange={(e) => handlePageChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onSelect={handleCursorChange}
              onClick={handleCursorChange}
              style={editorStyle}
              className="w-full h-full"
              spellCheck={true}
            />
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-400">
              Page {index + 1} of {pages.length}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}