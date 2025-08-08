import { useEffect, useRef, useState } from "react";

interface DocumentData {
  title: string;
  content: string;
  stats: {
    wordCount: number;
    charCount: number;
    lineCount: number;
    pageCount: number;
  };
  contentHeight?: number;
}

interface StandaloneDocumentEngineProps {
  onDataUpdate?: (data: DocumentData) => void;
  className?: string;
  initialContent?: string;
}

/**
 * Standalone Document Engine Component
 * 
 * This component provides proper pagination with Microsoft Word-like page layout.
 * It uses an iframe-based document engine that handles text overflow automatically.
 */
export function StandaloneDocumentEngine({ 
  onDataUpdate, 
  className, 
  initialContent 
}: StandaloneDocumentEngineProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [documentHeight, setDocumentHeight] = useState(1200);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const { type, data } = event.data;

      switch (type) {
        case 'DOCUMENT_ENGINE_READY':
          setIsReady(true);
          console.log('Document engine ready for integration');
          
          // Set initial content if provided
          if (initialContent) {
            setTimeout(() => {
              sendMessage('SET_CONTENT', { content: initialContent });
            }, 100);
          }
          break;
          
        case 'DOCUMENT_DATA':
          if (onDataUpdate) {
            onDataUpdate(data);
          }
          
          // Dynamic height adjustment based on content
          if (data.contentHeight && data.contentHeight > 0) {
            // Calculate height based on actual document content with proper padding
            // Each page is approximately 1100px height, add extra padding for scrolling
            const pageCount = data.stats?.pageCount || 1;
            const estimatedHeight = pageCount * 1150 + 100; // 1150px per page + buffer
            const newHeight = Math.max(data.contentHeight + 400, estimatedHeight, window.innerHeight);
            setDocumentHeight(newHeight);
            
            if (iframeRef.current) {
              iframeRef.current.style.height = `${newHeight}px`;
            }
          }
          break;
          
        case 'PRINT_COMPLETE':
          console.log('Document printed successfully');
          break;
          
        case 'EXPORT_COMPLETE':
          console.log('Document exported successfully');
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onDataUpdate, initialContent]);

  // Expose API for external control
  useEffect(() => {
    if (typeof window !== 'undefined' && isReady) {
      (window as any).standaloneDocumentAPI = {
        print: () => sendMessage('PRINT_DOCUMENT'),
        save: () => sendMessage('SAVE_DOCUMENT'), 
        exportPDF: () => sendMessage('EXPORT_PDF'),
        exportJSON: () => sendMessage('EXPORT_JSON'),
        formatText: (command: string) => sendMessage('FORMAT_TEXT', { command }),
        insertText: (text: string) => sendMessage('INSERT_TEXT', { text }),
        getData: () => sendMessage('GET_DOCUMENT'),
        clearContent: () => sendMessage('CLEAR_CONTENT'),
        setContent: (content: string) => sendMessage('SET_CONTENT', { content })
      };
    }
  }, [isReady]);

  const sendMessage = (type: string, data?: any) => {
    if (iframeRef.current && isReady) {
      iframeRef.current.contentWindow?.postMessage({ type, data }, window.location.origin);
    }
  };

  return (
    <div className={`standalone-document-engine ${className || ''}`} style={{ height: '100%' }}>
      <iframe
        ref={iframeRef}
        src="/document-engine/working.html"
        className="w-full border-0"
        style={{ 
          height: `${documentHeight}px`,
          minHeight: '100vh',
          backgroundColor: '#f9f9fa',
          display: 'block'
        }}
        title="Standalone Document Editor"
        sandbox="allow-scripts allow-same-origin allow-popups allow-downloads"
        frameBorder="0"
      />
      
      {!isReady && (
        <div className="flex items-center justify-center p-8 text-gray-500">
          <div className="text-center">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p>Loading Document Engine...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default StandaloneDocumentEngine;