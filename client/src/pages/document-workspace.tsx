import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Save, FileText, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, ZoomIn, ZoomOut, Printer } from 'lucide-react';
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
  const editorRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Calculate pages based on content
  const calculatePages = useCallback(() => {
    if (!editorRef.current) return 1;
    const lineHeight = fontSize * 1.2;
    const pageHeight = 792; // 11 inches at 72 DPI
    const marginTop = 72; // 1 inch
    const marginBottom = 72; // 1 inch
    const usableHeight = pageHeight - marginTop - marginBottom;
    const linesPerPage = Math.floor(usableHeight / lineHeight);
    const lines = content.split('\n').length;
    return Math.max(1, Math.ceil(lines / linesPerPage));
  }, [content, fontSize]);

  const formatText = (command: string, value?: string) => {
    if (editorRef.current && editorRef.current.focus) {
      editorRef.current.focus();
      document.execCommand(command, false, value);
      setContent(editorRef.current.innerHTML);
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

      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-2">
        <div className="flex items-center space-x-1">
          {/* Font controls */}
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-sm"
          >
            <option value="Times New Roman">Times New Roman</option>
            <option value="Arial">Arial</option>
            <option value="Calibri">Calibri</option>
            <option value="Georgia">Georgia</option>
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
          </select>

          <Separator orientation="vertical" className="h-6" />

          {/* Formatting buttons */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => formatText('bold')}
            className="p-2"
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => formatText('italic')}
            className="p-2"
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => formatText('underline')}
            className="p-2"
          >
            <Underline className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Alignment buttons */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => formatText('justifyLeft')}
            className="p-2"
          >
            <AlignLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => formatText('justifyCenter')}
            className="p-2"
          >
            <AlignCenter className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => formatText('justifyRight')}
            className="p-2"
          >
            <AlignRight className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* List buttons */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => formatText('insertUnorderedList')}
            className="p-2"
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => formatText('insertOrderedList')}
            className="p-2"
          >
            <ListOrdered className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Zoom controls */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoomLevel(prev => Math.min(200, prev + 10))}
            className="p-2"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <span className="text-sm text-slate-600 px-2">{zoomLevel}%</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))}
            className="p-2"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.print()}
            className="p-2"
          >
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
          <div className="flex-1 overflow-auto p-8" style={{ backgroundColor: '#f8f9fa' }}>
            {currentDocument ? (
              <div className="max-w-4xl mx-auto">
                {/* Render multiple pages */}
                {Array.from({ length: calculatePages() }, (_, pageIndex) => (
                  <div
                    key={pageIndex}
                    className="document-page bg-white shadow-lg mb-8 mx-auto relative"
                    style={{
                      width: '8.5in',
                      minHeight: '11in',
                      padding: '1in',
                      transform: `scale(${zoomLevel / 100})`,
                      transformOrigin: 'top center',
                      marginBottom: pageIndex === calculatePages() - 1 ? '2rem' : '4rem'
                    }}
                  >
                    {/* Page number */}
                    <div className="absolute bottom-4 right-4 text-xs text-slate-400">
                      Page {pageIndex + 1}
                    </div>

                    {/* Content editor */}
                    {pageIndex === 0 && (
                      <div
                        ref={editorRef}
                        contentEditable
                        className="w-full h-full outline-none"
                        style={{
                          fontFamily: fontFamily,
                          fontSize: `${fontSize}pt`,
                          lineHeight: '1.2',
                          minHeight: '9in'
                        }}
                        onInput={(e) => {
                          setContent(e.currentTarget.innerHTML);
                        }}
                        dangerouslySetInnerHTML={{ __html: content }}
                        data-placeholder="Start writing your document..."
                      />
                    )}

                    {/* Additional pages show overflow content */}
                    {pageIndex > 0 && (
                      <div
                        className="w-full h-full"
                        style={{
                          fontFamily: fontFamily,
                          fontSize: `${fontSize}pt`,
                          lineHeight: '1.2',
                          color: '#333',
                          minHeight: '9in'
                        }}
                      >
                        {/* This would contain overflow content from previous pages */}
                        <div className="text-slate-400 italic">
                          [Continued from previous page...]
                        </div>
                      </div>
                    )}
                  </div>
                ))}
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