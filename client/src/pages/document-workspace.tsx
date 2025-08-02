import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Save, FileText, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, ZoomIn, ZoomOut, Printer, Type, Palette, Highlighter, Strikethrough, Subscript, Superscript, Indent, Outdent, Copy, Scissors, Clipboard, Undo2, Redo2 } from 'lucide-react';
import WorkspaceSidebar from '@/components/workspace-sidebar';
import ChatPanel from '@/components/chat-panel';
import { apiRequest } from '@/lib/queryClient';
import { Document } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

export default function DocumentWorkspace() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [content, setContent] = useState('');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [fontSize, setFontSize] = useState(12);
  const [fontFamily, setFontFamily] = useState('Times New Roman');
  const [textColor, setTextColor] = useState('#000000');
  const [highlightColor, setHighlightColor] = useState('#FFFF00');
  const [pageSize, setPageSize] = useState({ width: 8.5, height: 11 }); // inches
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const editorRef = useRef<HTMLDivElement>(null);
  const pagesContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Calculate characters per page based on page size and font
  const calculateCharactersPerPage = useCallback(() => {
    // Base calculation: characters per line × lines per page
    const pageArea = (pageSize.width - 2) * (pageSize.height - 2); // Minus margins
    const baseArea = 6.5 * 9; // 8.5x11 minus 1" margins on each side
    const scaleFactor = pageArea / baseArea;
    
    // Adjust base character count by scale factor and font size
    const baseCharsPerPage = 2500;
    const fontSizeMultiplier = 12 / fontSize; // Smaller font = more chars
    
    return Math.floor(baseCharsPerPage * scaleFactor * fontSizeMultiplier);
  }, [pageSize, fontSize]);

  // Calculate how many pages we need based on content length
  const calculatePageCount = useCallback(() => {
    if (!content) return 1;
    const charsPerPage = calculateCharactersPerPage();
    return Math.max(1, Math.ceil(content.length / charsPerPage));
  }, [content, calculateCharactersPerPage]);

  const pageCount = calculatePageCount();

  // Get content that should appear on a specific page
  const getPageContent = useCallback((pageIndex: number) => {
    const charsPerPage = calculateCharactersPerPage();
    const startIndex = pageIndex * charsPerPage;
    const endIndex = startIndex + charsPerPage;
    return content.slice(startIndex, endIndex);
  }, [content, calculateCharactersPerPage]);

  const formatText = (command: string, value?: string) => {
    if (editorRef.current && typeof window !== 'undefined') {
      try {
        editorRef.current.focus();
        window.document.execCommand(command, false, value);
        setContent(editorRef.current.innerHTML);
      } catch (error) {
        console.warn('Error executing format command:', error);
      }
    }
  };

  const handleContentChange = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerText || editorRef.current.textContent || '';
      setContent(newContent);
    }
  };

  // Fetch current document
  const { data: document } = useQuery({
    queryKey: ['/api/documents', id],
    enabled: !!id,
  });

  useEffect(() => {
    if (document) {
      setCurrentDocument(document as Document);
      setContent((document as Document).content || '');
    }
  }, [document]);

  // Create new document
  const createDocumentMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/documents', {
      title: 'New Document',
      content: ''
    }),
    onSuccess: async (response) => {
      const newDocument = await response.json();
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      setCurrentDocument(newDocument);
      setContent('');
      navigate(`/document/${newDocument.id}`);
    },
  });

  // Save document
  const saveDocumentMutation = useMutation({
    mutationFn: () => {
      if (!currentDocument) throw new Error('No document selected');
      return apiRequest('PUT', `/api/documents/${currentDocument.id}`, {
        content,
        updatedAt: new Date()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Document saved",
        description: "Your document has been saved successfully.",
      });
    },
  });

  const handleAIResponse = (response: any) => {
    if (response.content) {
      setContent(prev => prev + '\n\n' + response.content);
      if (editorRef.current) {
        editorRef.current.innerHTML = content + '\n\n' + response.content;
      }
    }
  };

  return (
    <div className="h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <FileText className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-semibold text-slate-900">Document Workspace</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => saveDocumentMutation.mutate()}
              disabled={saveDocumentMutation.isPending || !currentDocument}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Document
            </Button>
          </div>
        </div>
      </header>

      {/* Comprehensive Toolbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-2">
        <div className="flex flex-wrap items-center gap-1">
          {/* Clipboard operations */}
          <Button variant="ghost" size="sm" onClick={() => formatText('undo')} className="p-2">
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => formatText('redo')} className="p-2">
            <Redo2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => formatText('cut')} className="p-2">
            <Scissors className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => formatText('copy')} className="p-2">
            <Copy className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => formatText('paste')} className="p-2">
            <Clipboard className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Font controls */}
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-sm w-36"
          >
            <option value="Times New Roman">Times New Roman</option>
            <option value="Arial">Arial</option>
            <option value="Calibri">Calibri</option>
            <option value="Georgia">Georgia</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Verdana">Verdana</option>
            <option value="Tahoma">Tahoma</option>
          </select>
          
          <select
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="border border-slate-300 rounded px-2 py-1 text-sm w-16"
          >
            <option value="8">8</option>
            <option value="9">9</option>
            <option value="10">10</option>
            <option value="11">11</option>
            <option value="12">12</option>
            <option value="14">14</option>
            <option value="16">16</option>
            <option value="18">18</option>
            <option value="20">20</option>
            <option value="24">24</option>
            <option value="28">28</option>
            <option value="32">32</option>
            <option value="36">36</option>
            <option value="48">48</option>
            <option value="72">72</option>
          </select>

          <Separator orientation="vertical" className="h-6" />

          {/* Text formatting */}
          <Button variant="ghost" size="sm" onClick={() => formatText('bold')} className="p-2">
            <Bold className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => formatText('italic')} className="p-2">
            <Italic className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => formatText('underline')} className="p-2">
            <Underline className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => formatText('strikeThrough')} className="p-2">
            <Strikethrough className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => formatText('subscript')} className="p-2">
            <Subscript className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => formatText('superscript')} className="p-2">
            <Superscript className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Color controls */}
          <div className="flex items-center">
            <input
              type="color"
              value={textColor}
              onChange={(e) => {
                setTextColor(e.target.value);
                formatText('foreColor', e.target.value);
              }}
              className="w-8 h-6 border border-slate-300 rounded cursor-pointer"
              title="Text Color"
            />
            <Type className="w-3 h-3 ml-1" />
          </div>
          
          <div className="flex items-center">
            <input
              type="color"
              value={highlightColor}
              onChange={(e) => {
                setHighlightColor(e.target.value);
                formatText('backColor', e.target.value);
              }}
              className="w-8 h-6 border border-slate-300 rounded cursor-pointer"
              title="Highlight Color"
            />
            <Highlighter className="w-3 h-3 ml-1" />
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Alignment */}
          <Button variant="ghost" size="sm" onClick={() => formatText('justifyLeft')} className="p-2">
            <AlignLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => formatText('justifyCenter')} className="p-2">
            <AlignCenter className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => formatText('justifyRight')} className="p-2">
            <AlignRight className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Lists and indentation */}
          <Button variant="ghost" size="sm" onClick={() => formatText('insertUnorderedList')} className="p-2">
            <List className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => formatText('insertOrderedList')} className="p-2">
            <ListOrdered className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => formatText('outdent')} className="p-2">
            <Outdent className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => formatText('indent')} className="p-2">
            <Indent className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Page size controls */}
          <select
            value={`${pageSize.width}x${pageSize.height}`}
            onChange={(e) => {
              const [width, height] = e.target.value.split('x').map(Number);
              setPageSize({ width, height });
            }}
            className="border border-slate-300 rounded px-2 py-1 text-sm"
          >
            <option value="8.5x11">Letter (8.5" × 11")</option>
            <option value="8.5x14">Legal (8.5" × 14")</option>
            <option value="11x17">Tabloid (11" × 17")</option>
            <option value="5.5x8.5">Half Letter (5.5" × 8.5")</option>
            <option value="4x6">4" × 6"</option>
            <option value="8.27x11.69">A4 (8.27" × 11.69")</option>
          </select>

          <Separator orientation="vertical" className="h-6" />

          {/* View controls */}
          <Button variant="ghost" size="sm" onClick={() => setZoomLevel(prev => Math.min(200, prev + 10))} className="p-2">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-600 px-2 min-w-[50px] text-center">{zoomLevel}%</span>
          <Button variant="ghost" size="sm" onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))} className="p-2">
            <ZoomOut className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <Button variant="ghost" size="sm" onClick={() => window.print()} className="p-2">
            <Printer className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Three-pane layout */}
      <div className="flex h-[calc(100vh-125px)]">
        {/* Left Panel: Document History */}
        <WorkspaceSidebar
          workspaceType="document"
          currentWorkspaceId={currentDocument?.id}
          onNewWorkspace={() => {
            createDocumentMutation.mutate();
          }}
        />

        {/* Middle Panel: Document Editor */}
        <div className="flex-1 flex flex-col bg-slate-100">
          <div className="bg-white border-b border-slate-200 p-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {currentDocument?.title || 'New Document'}  
            </h2>
            <div className="text-sm text-slate-600 mt-1">
              Page 1 of {pageCount} • {pageSize.width}" × {pageSize.height}"
            </div>
          </div>
          
          {/* Embedded Document Editor - Isolated from React */}
          <div 
            className="flex-1 overflow-hidden" 
            style={{ backgroundColor: '#f8f9fa', padding: '20px' }} 
            ref={pagesContainerRef}
          >
            {currentDocument ? (
              <div className="w-full h-full flex justify-center">
                <iframe
                  ref={editorRef}
                  className="border border-slate-300 shadow-xl"
                  style={{
                    width: `${pageSize.width * zoomLevel / 100}in`,
                    height: '100%',
                    backgroundColor: 'white'
                  }}
                  srcDoc={`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <style>
                        body {
                          margin: 0;
                          padding: ${1 * zoomLevel / 100}in;
                          font-family: ${fontFamily};
                          font-size: ${fontSize * zoomLevel / 100}pt;
                          line-height: 1.5;
                          color: ${textColor};
                          background: white;
                          width: ${(pageSize.width - 2) * zoomLevel / 100}in;
                          min-height: calc(100vh - ${2 * zoomLevel / 100}in);
                          box-sizing: border-box;
                          word-wrap: break-word;
                          overflow-wrap: break-word;
                          page-break-inside: avoid;
                        }
                        
                        @media print {
                          body {
                            width: ${pageSize.width}in;
                            height: ${pageSize.height}in;
                            margin: 0;
                            padding: 1in;
                          }
                          @page {
                            size: ${pageSize.width}in ${pageSize.height}in;
                            margin: 0;
                          }
                        }
                        
                        /* Page break indicators */
                        .page-break {
                          border-top: 2px dashed #ccc;
                          margin: 20px 0;
                          position: relative;
                        }
                        
                        .page-break::after {
                          content: 'Page Break';
                          position: absolute;
                          top: -10px;
                          left: 50%;
                          transform: translateX(-50%);
                          background: white;
                          padding: 0 10px;
                          font-size: 10px;
                          color: #999;
                        }
                        
                        p {
                          margin: 0 0 12px 0;
                        }
                        
                        [contenteditable]:empty:before {
                          content: "Start writing your document...";
                          color: #999;
                          font-style: italic;
                        }
                      </style>
                    </head>
                    <body contenteditable="true" spellcheck="true">
                      ${content || ''}
                    </body>
                    <script>
                      // Handle content changes
                      document.body.addEventListener('input', function() {
                        const content = document.body.innerHTML;
                        window.parent.postMessage({ type: 'contentChange', content }, '*');
                      });
                      
                      // Handle paste
                      document.body.addEventListener('paste', function(e) {
                        e.preventDefault();
                        const paste = e.clipboardData.getData('text/plain');
                        document.execCommand('insertText', false, paste);
                      });
                      
                      // Auto-focus
                      document.body.focus();
                      
                      // Insert page breaks automatically based on content height
                      function checkPageBreaks() {
                        const pageHeight = ${(pageSize.height - 2) * 72 * zoomLevel / 100}; // Convert to pixels
                        const content = document.body;
                        const currentHeight = content.scrollHeight;
                        
                        if (currentHeight > pageHeight) {
                          // Logic for page breaking would go here
                          // For now, just ensure content fits
                        }
                      }
                      
                      // Check page breaks on content change
                      document.body.addEventListener('input', checkPageBreaks);
                    </script>
                    </html>
                  `}
                  onLoad={() => {
                    // Handle messages from iframe
                    const handleMessage = (event: MessageEvent) => {
                      if (event.data.type === 'contentChange') {
                        setContent(event.data.content);
                      }
                    };
                    
                    window.addEventListener('message', handleMessage);
                    return () => window.removeEventListener('message', handleMessage);
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Document Selected</h3>
                  <p className="text-slate-600 mb-4">Create a new document or select one from the sidebar</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: AI Assistant */}
        <ChatPanel
          workspaceId={currentDocument?.id || 'new'}
          workspaceType="document"
          onAIResponse={handleAIResponse}
        />
      </div>
    </div>
  );
}