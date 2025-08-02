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
  const editorRef = useRef<HTMLDivElement>(null);
  const pagesContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Calculate pages based on actual content height
  const calculatePages = useCallback(() => {
    if (!editorRef.current) return 1;
    
    // Create a temporary element to measure content height
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = `
      position: absolute;
      visibility: hidden;
      width: 612px;
      font-family: ${fontFamily};
      font-size: ${fontSize}pt;
      line-height: 1.15;
      padding: 0;
      margin: 0;
    `;
    tempDiv.innerHTML = content || 'A';
    document.body.appendChild(tempDiv);
    
    const contentHeight = tempDiv.scrollHeight;
    document.body.removeChild(tempDiv);
    
    const pageHeight = 648; // 9 inches usable height (11in - 2in margins)
    const pages = Math.max(1, Math.ceil(contentHeight / pageHeight));
    
    return pages;
  }, [content, fontSize, fontFamily]);

  const formatText = (command: string, value?: string) => {
    if (editorRef.current && editorRef.current.focus) {
      editorRef.current.focus();
      document.execCommand(command, false, value);
      setContent(editorRef.current.innerHTML);
    }
  };

  const handleContentChange = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      
      // Auto-pagination: split content across pages if needed
      const pages = calculatePages();
      if (pages > 1) {
        // This will trigger re-render with proper page distribution
      }
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
              Page {calculatePages()} of {calculatePages()}
            </div>
          </div>
          
          {/* Document Editor Area */}
          <div className="flex-1 overflow-auto p-8" style={{ backgroundColor: '#f8f9fa' }} ref={pagesContainerRef}>
            {currentDocument ? (
              <div className="max-w-4xl mx-auto">
                {/* Single continuous editor that flows across pages */}
                <div
                  className="document-page bg-white shadow-lg mx-auto relative"
                  style={{
                    width: '8.5in',
                    minHeight: `${calculatePages() * 11}in`,
                    padding: '1in',
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: 'top center',
                    marginBottom: '4rem',
                    backgroundImage: calculatePages() > 1 ? `repeating-linear-gradient(transparent, transparent 10.5in, #e2e8f0 10.5in, #e2e8f0 11in)` : 'none',
                    backgroundSize: '100% 11in'
                  }}
                >
                  {/* Page numbers overlay */}
                  {Array.from({ length: calculatePages() }, (_, pageIndex) => (
                    <div
                      key={pageIndex}
                      className="absolute text-xs text-slate-400 pointer-events-none"
                      style={{
                        bottom: `${(calculatePages() - pageIndex - 1) * 11 + 0.25}in`,
                        right: '0.25in'
                      }}
                    >
                      Page {pageIndex + 1}
                    </div>
                  ))}

                  {/* Content editor - single continuous area */}
                  <div
                    ref={editorRef}
                    contentEditable
                    className="w-full outline-none"
                    style={{
                      fontFamily: fontFamily,
                      fontSize: `${fontSize}pt`,
                      lineHeight: '1.15',
                      minHeight: `${calculatePages() > 1 ? (calculatePages() * 9) : 9}in`,
                      color: textColor
                    }}
                    onInput={handleContentChange}
                    onPaste={(e) => {
                      // Handle paste to maintain formatting
                      setTimeout(handleContentChange, 10);
                    }}
                    dangerouslySetInnerHTML={{ __html: content }}
                    data-placeholder="Start writing your document..."
                  />
                </div>
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