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
}

/**
 * Standalone Document Engine Component
 * 
 * This component can be dropped into any React application without breaking
 * existing layouts or creating scrolling conflicts.
 * 
 * CRITICAL: Do not wrap this component in containers with:
 * - overflow-y: auto
 * - overflow: hidden  
 * - fixed heights (height: 100vh)
 * 
 * The component manages its own height and requires external scrolling.
 */
export function StandaloneDocumentEngine({ onDataUpdate, className }: StandaloneDocumentEngineProps) {
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
          break;
          
        case 'DOCUMENT_DATA':
          if (onDataUpdate) {
            onDataUpdate(data);
          }
          
          // Dynamic height adjustment based on content
          if (data.contentHeight && data.contentHeight > 0) {
            const newHeight = Math.max(data.contentHeight + 200, window.innerHeight);
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
  }, [onDataUpdate]);

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
        clearContent: () => sendMessage('CLEAR_CONTENT')
      };
    }
  }, [isReady]);

  const sendMessage = (type: string, data?: any) => {
    if (iframeRef.current && isReady) {
      iframeRef.current.contentWindow?.postMessage({ type, data }, window.location.origin);
    }
  };

  return (
    <div className={`standalone-document-engine ${className || ''}`}>
      <iframe
        ref={iframeRef}
        src="/document-engine/working.html"
        className="w-full border-0"
        style={{ 
          height: `${documentHeight}px`,
          minHeight: '100vh',
          backgroundColor: '#f9f9fa',
          overflow: 'hidden',
          display: 'block'
        }}
        title="Standalone Document Editor"
        sandbox="allow-scripts allow-same-origin allow-popups allow-downloads"
        scrolling="no"
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