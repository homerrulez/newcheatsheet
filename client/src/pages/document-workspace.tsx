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
  const editorRef = useRef<HTMLIFrameElement>(null);
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
    if (editorRef.current?.contentWindow) {
      try {
        editorRef.current.contentWindow.postMessage({
          type: 'formatCommand',
          command,
          value
        }, '*');
      } catch (error) {
        console.warn('Error executing format command:', error);
      }
    }
  };

  const handleContentChange = () => {
    // Content change is now handled via postMessage from iframe
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

  // Sync style changes with iframe
  useEffect(() => {
    if (editorRef.current?.contentWindow) {
      editorRef.current.contentWindow.postMessage({
        type: 'updateStyles',
        fontFamily,
        fontSize: fontSize * zoomLevel / 100,
        textColor
      }, '*');
    }
  }, [fontFamily, fontSize, textColor, zoomLevel]);

  // Set up message listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'contentChange') {
        setContent(event.data.content);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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
    if (response.content && editorRef.current?.contentWindow) {
      const newContent = content + '\n\n' + response.content;
      setContent(newContent);
      editorRef.current.contentWindow.postMessage({
        type: 'insertContent',
        content: '\n\n' + response.content
      }, '*');
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
                        html, body {
                          margin: 0;
                          padding: 0;
                          height: 100%;
                          background: #f8f9fa;
                          font-family: ${fontFamily};
                          overflow-y: auto;
                        }
                        
                        .page-container {
                          padding: 20px;
                          display: flex;
                          flex-direction: column;
                          align-items: center;
                          gap: 20px;
                          min-height: 100%;
                        }
                        
                        .page {
                          width: ${pageSize.width * zoomLevel / 100}in;
                          height: ${pageSize.height * zoomLevel / 100}in;
                          background: white;
                          border: 1px solid #d1d5db;
                          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                          padding: ${1 * zoomLevel / 100}in;
                          box-sizing: border-box;
                          position: relative;
                          overflow: hidden;
                        }
                        
                        .page-content {
                          width: 100%;
                          height: ${(pageSize.height - 2) * zoomLevel / 100}in;
                          font-size: ${fontSize * zoomLevel / 100}pt;
                          line-height: 1.5;
                          color: ${textColor};
                          word-wrap: break-word;
                          overflow-wrap: break-word;
                          outline: none;
                          border: none;
                          resize: none;
                          overflow: hidden;
                          white-space: pre-wrap;
                          box-sizing: border-box;
                        }
                        
                        .page-number {
                          position: absolute;
                          bottom: 10px;
                          right: 15px;
                          font-size: ${Math.max(8, fontSize * 0.7) * zoomLevel / 100}pt;
                          color: #9ca3af;
                          pointer-events: none;
                        }
                        
                        .page-content:empty:before {
                          content: "Start writing your document...";
                          color: #9ca3af;
                          font-style: italic;
                        }
                        
                        @media print {
                          html, body {
                            background: white;
                          }
                          .page-container {
                            padding: 0;
                            gap: 0;
                          }
                          .page {
                            width: ${pageSize.width}in;
                            height: ${pageSize.height}in;
                            box-shadow: none;
                            border: none;
                            margin: 0;
                            page-break-after: always;
                          }
                        }
                      </style>
                    </head>
                    <body>
                      <div class="page-container" id="pageContainer">
                        <div class="page" id="page1">
                          <div class="page-content" contenteditable="true" id="pageContent1">${content || ''}</div>
                          <div class="page-number">1</div>
                        </div>
                      </div>
                      
                      <script>
                        let pageCount = 1;
                        const CHARS_PER_PAGE = ${calculateCharactersPerPage()};
                        
                        // Handle content changes
                        function handleContentChange() {
                          const allContent = getAllContent();
                          window.parent.postMessage({ type: 'contentChange', content: allContent }, '*');
                          checkPagination();
                        }
                        
                        function getAllContent() {
                          let content = '';
                          for (let i = 1; i <= pageCount; i++) {
                            const pageContent = document.getElementById('pageContent' + i);
                            if (pageContent) {
                              content += pageContent.innerText || pageContent.textContent || '';
                              if (i < pageCount) content += '\\n';
                            }
                          }
                          return content;
                        }
                        
                        function checkPagination() {
                          // Check if current page content exceeds page height
                          for (let i = 1; i <= pageCount; i++) {
                            const pageContent = document.getElementById('pageContent' + i);
                            if (pageContent) {
                              const contentHeight = pageContent.scrollHeight;
                              const pageHeight = pageContent.offsetHeight;
                              
                              if (contentHeight > pageHeight) {
                                // Content overflow - need to move excess to next page
                                moveOverflowToNextPage(i);
                                break;
                              }
                            }
                          }
                          
                          // Remove empty trailing pages
                          removeEmptyTrailingPages();
                        }
                        
                        function addPage(pageNum) {
                          const pageContainer = document.getElementById('pageContainer');
                          const pageDiv = document.createElement('div');
                          pageDiv.className = 'page';
                          pageDiv.id = 'page' + pageNum;
                          pageDiv.innerHTML = \`
                            <div class="page-content" contenteditable="true" id="pageContent\${pageNum}"></div>
                            <div class="page-number">\${pageNum}</div>
                          \`;
                          pageContainer.appendChild(pageDiv);
                          
                          const pageContent = document.getElementById('pageContent' + pageNum);
                          pageContent.addEventListener('input', handleContentChange);
                          pageContent.addEventListener('paste', handlePaste);
                          pageContent.addEventListener('keydown', handleKeyDown);
                          
                          pageCount = pageNum;
                        }
                        
                        function removePage(pageNum) {
                          const page = document.getElementById('page' + pageNum);
                          if (page) {
                            page.remove();
                            pageCount--;
                          }
                        }
                        
                        function moveOverflowToNextPage(pageNum) {
                          const pageContent = document.getElementById('pageContent' + pageNum);
                          if (!pageContent) return;
                          
                          // Create next page if it doesn't exist
                          if (pageNum === pageCount) {
                            addPage(pageNum + 1);
                          }
                          
                          const nextPageContent = document.getElementById('pageContent' + (pageNum + 1));
                          if (!nextPageContent) return;
                          
                          // Use a temporary container to measure content that fits
                          const tempDiv = document.createElement('div');
                          tempDiv.style.cssText = pageContent.style.cssText;
                          tempDiv.style.position = 'absolute';
                          tempDiv.style.visibility = 'hidden';
                          tempDiv.style.height = pageContent.offsetHeight + 'px';
                          document.body.appendChild(tempDiv);
                          
                          const originalContent = pageContent.innerText;
                          let fitContent = '';
                          let remainingContent = '';
                          
                          // Binary search to find maximum content that fits
                          let low = 0;
                          let high = originalContent.length;
                          
                          while (low < high) {
                            const mid = Math.floor((low + high + 1) / 2);
                            tempDiv.innerText = originalContent.slice(0, mid);
                            
                            if (tempDiv.scrollHeight <= tempDiv.offsetHeight) {
                              low = mid;
                            } else {
                              high = mid - 1;
                            }
                          }
                          
                          fitContent = originalContent.slice(0, low);
                          remainingContent = originalContent.slice(low);
                          
                          // Apply the split
                          pageContent.innerText = fitContent;
                          
                          // Prepend remaining content to next page
                          const nextPageText = nextPageContent.innerText || '';
                          nextPageContent.innerText = remainingContent + nextPageText;
                          
                          document.body.removeChild(tempDiv);
                          
                          // Check if next page also needs splitting
                          if (nextPageContent.scrollHeight > nextPageContent.offsetHeight) {
                            moveOverflowToNextPage(pageNum + 1);
                          }
                        }
                        
                        function removeEmptyTrailingPages() {
                          for (let i = pageCount; i > 1; i--) {
                            const pageContent = document.getElementById('pageContent' + i);
                            if (pageContent && pageContent.innerText.trim() === '') {
                              removePage(i);
                            } else {
                              break;
                            }
                          }
                        }
                        
                        function handlePaste(e) {
                          e.preventDefault();
                          const paste = e.clipboardData.getData('text/plain');
                          document.execCommand('insertText', false, paste);
                        }
                        
                        // Listen for messages from parent
                        window.addEventListener('message', function(event) {
                          if (event.data.type === 'formatCommand') {
                            document.execCommand(event.data.command, false, event.data.value);
                          } else if (event.data.type === 'insertContent') {
                            const firstPage = document.getElementById('pageContent1');
                            if (firstPage) {
                              const currentText = firstPage.innerText || '';
                              firstPage.innerText = currentText + event.data.content;
                              handleContentChange();
                            }
                          } else if (event.data.type === 'updateStyles') {
                            // Update document styles when toolbar changes
                            document.body.style.fontFamily = event.data.fontFamily;
                            const pages = document.querySelectorAll('.page-content');
                            pages.forEach(page => {
                              page.style.fontSize = event.data.fontSize + 'pt';
                              page.style.color = event.data.textColor;
                            });
                          }
                        });
                        
                        // Handle cursor navigation between pages
                        function handleKeyDown(e) {
                          const currentPage = e.target;
                          const pageNum = parseInt(currentPage.id.replace('pageContent', ''));
                          
                          // Handle cursor at end of page
                          if (e.key === 'ArrowDown' || e.key === 'End') {
                            const selection = window.getSelection();
                            const range = selection.getRangeAt(0);
                            const rect = range.getBoundingClientRect();
                            const pageRect = currentPage.getBoundingClientRect();
                            
                            // If cursor is near bottom of page, move to next page
                            if (rect.bottom >= pageRect.bottom - 20) {
                              const nextPage = document.getElementById('pageContent' + (pageNum + 1));
                              if (nextPage) {
                                e.preventDefault();
                                nextPage.focus();
                                // Set cursor to beginning of next page
                                const range = document.createRange();
                                range.setStart(nextPage, 0);
                                range.collapse(true);
                                selection.removeAllRanges();
                                selection.addRange(range);
                              }
                            }
                          }
                          
                          // Handle cursor at top of page
                          if (e.key === 'ArrowUp' || e.key === 'Home') {
                            if (pageNum > 1) {
                              const selection = window.getSelection();
                              const range = selection.getRangeAt(0);
                              const rect = range.getBoundingClientRect();
                              const pageRect = currentPage.getBoundingClientRect();
                              
                              // If cursor is near top of page, move to previous page
                              if (rect.top <= pageRect.top + 20) {
                                const prevPage = document.getElementById('pageContent' + (pageNum - 1));
                                if (prevPage) {
                                  e.preventDefault();
                                  prevPage.focus();
                                  // Set cursor to end of previous page
                                  const range = document.createRange();
                                  range.selectNodeContents(prevPage);
                                  range.collapse(false);
                                  selection.removeAllRanges();
                                  selection.addRange(range);
                                }
                              }
                            }
                          }
                        }
                        
                        // Set up event listeners for first page
                        const page1Content = document.getElementById('pageContent1');
                        page1Content.addEventListener('input', handleContentChange);
                        page1Content.addEventListener('paste', handlePaste);
                        page1Content.addEventListener('keydown', handleKeyDown);
                        
                        // Auto-focus first page
                        setTimeout(() => {
                          page1Content.focus();
                        }, 100);
                      </script>
                    </html>
                  `}

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