import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, FileText, Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, ZoomIn, ZoomOut, Printer, Type, Palette, Highlighter, Strikethrough, Subscript, Superscript, Indent, Outdent, Copy, Scissors, Clipboard, Undo2, Redo2 } from 'lucide-react';
import WorkspaceSidebar from '@/components/workspace-sidebar';
import ChatPanel from '@/components/chat-panel';
import { apiRequest } from '@/lib/queryClient';
import { Document } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

// Page size configurations (in inches)
const PAGE_SIZES = {
  'letter': { width: 8.5, height: 11, name: 'Letter' },
  'legal': { width: 8.5, height: 14, name: 'Legal' },
  'a4': { width: 8.27, height: 11.69, name: 'A4' },
  'tabloid': { width: 11, height: 17, name: 'Tabloid' },
  'half-letter': { width: 5.5, height: 8.5, name: 'Half Letter' },
  'index': { width: 4, height: 6, name: '4" × 6"' }
};

export default function DocumentWorkspace() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [fontSize, setFontSize] = useState(12);
  const [fontFamily, setFontFamily] = useState('Times New Roman');
  const [textColor, setTextColor] = useState('#000000');
  const [pageSize, setPageSize] = useState<keyof typeof PAGE_SIZES>('letter');
  const [pages, setPages] = useState<{ content: string; id: string }[]>([{ content: '', id: '1' }]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const pagesContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Initialize Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
    ],
    content: pages[activePageIndex]?.content || '',
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      updatePageContent(activePageIndex, content);
      checkForPageOverflow();
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
        style: `font-family: ${fontFamily}; font-size: ${fontSize * zoomLevel / 100}pt; color: ${textColor};`
      },
    },
  });

  // Update page content
  const updatePageContent = useCallback((pageIndex: number, content: string) => {
    setPages(prev => prev.map((page, index) => 
      index === pageIndex ? { ...page, content } : page
    ));
  }, []);

  // Check if content overflows current page and move to next page
  const checkForPageOverflow = useCallback(() => {
    if (!editor || typeof document === 'undefined') return;

    const editorElement = document.querySelector('.ProseMirror');
    if (!editorElement) return;

    const currentPageSize = PAGE_SIZES[pageSize];
    const pageHeightPx = (currentPageSize.height - 2) * (zoomLevel / 100) * 96; // Convert inches to pixels (96 DPI)
    
    if (editorElement.scrollHeight > pageHeightPx) {
      // Content overflows - need to split content
      splitContentToNextPage();
    }
  }, [editor, pageSize, zoomLevel]);

  // Split overflowing content to next page
  const splitContentToNextPage = useCallback(() => {
    if (!editor) return;

    const currentContent = editor.getHTML();
    const textContent = editor.getText();
    
    // Simple content splitting based on approximate character limit
    const currentPageSize = PAGE_SIZES[pageSize];
    const charsPerPage = Math.floor((currentPageSize.height - 2) * (currentPageSize.width - 2) * 150 / (fontSize || 12));
    
    if (textContent.length > charsPerPage) {
      const cutPoint = charsPerPage;
      const remainingContent = textContent.slice(cutPoint);
      const currentPageContent = textContent.slice(0, cutPoint);
      
      // Update current page with truncated content
      editor.commands.setContent(`<p>${currentPageContent}</p>`);
      
      // Create or update next page
      if (activePageIndex + 1 >= pages.length) {
        setPages(prev => [...prev, { content: `<p>${remainingContent}</p>`, id: String(prev.length + 1) }]);
      } else {
        updatePageContent(activePageIndex + 1, `<p>${remainingContent}</p>`);
      }
    }
  }, [editor, pageSize, fontSize, activePageIndex, pages.length, updatePageContent]);

  // Format text using Tiptap commands
  const formatText = (command: string, value?: string) => {
    if (!editor) return;

    switch (command) {
      case 'bold':
        editor.chain().focus().toggleBold().run();
        break;
      case 'italic':
        editor.chain().focus().toggleItalic().run();
        break;
      case 'underline':
        editor.chain().focus().toggleUnderline().run();
        break;
      case 'justifyLeft':
        editor.chain().focus().setTextAlign('left').run();
        break;
      case 'justifyCenter':
        editor.chain().focus().setTextAlign('center').run();
        break;
      case 'justifyRight':
        editor.chain().focus().setTextAlign('right').run();
        break;
      case 'justifyFull':
        editor.chain().focus().setTextAlign('justify').run();
        break;
      case 'insertUnorderedList':
        editor.chain().focus().toggleBulletList().run();
        break;
      case 'insertOrderedList':
        editor.chain().focus().toggleOrderedList().run();
        break;
      case 'undo':
        editor.chain().focus().undo().run();
        break;
      case 'redo':
        editor.chain().focus().redo().run();
        break;
      case 'foreColor':
        // Color functionality to be implemented later
        break;
      case 'fontName':
        // Font family functionality to be implemented later
        break;
    }
  };

  // Switch to different page
  const switchToPage = useCallback((pageIndex: number) => {
    if (pageIndex >= 0 && pageIndex < pages.length && editor) {
      setActivePageIndex(pageIndex);
      editor.commands.setContent(pages[pageIndex].content);
    }
  }, [pages, editor]);

  // Fetch current document
  const { data: document } = useQuery({
    queryKey: ['/api/documents', id],
    enabled: !!id,
  });

  // Save document mutation
  const saveDocumentMutation = useMutation({
    mutationFn: async (documentData: Partial<Document>) => {
      if (id && id !== 'new') {
        return apiRequest(`/api/documents/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(documentData),
        });
      } else {
        return apiRequest('/api/documents', {
          method: 'POST',
          body: JSON.stringify(documentData),
        });
      }
    },
    onSuccess: (savedDocument) => {
      if (id === 'new') {
        navigate(`/document/${savedDocument.id}`);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({ title: 'Document saved successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to save document', variant: 'destructive' });
    },
  });

  // Auto-save functionality
  useEffect(() => {
    if (currentDocument && pages.length > 0) {
      const allContent = pages.map(page => page.content).join('\n<!-- PAGE_BREAK -->\n');
      const saveTimeout = setTimeout(() => {
        saveDocumentMutation.mutate({
          ...currentDocument,
          content: allContent,
        });
      }, 2000);

      return () => clearTimeout(saveTimeout);
    }
  }, [pages, currentDocument, saveDocumentMutation]);

  // Load document content into pages
  useEffect(() => {
    if (document) {
      setCurrentDocument(document as Document);
      const content = (document as Document).content || '';
      
      if (content.includes('<!-- PAGE_BREAK -->')) {
        const pageContents = content.split('\n<!-- PAGE_BREAK -->\n');
        setPages(pageContents.map((content, index) => ({ content, id: String(index + 1) })));
      } else {
        setPages([{ content, id: '1' }]);
      }
    }
  }, [document]);

  // Update editor when switching pages
  useEffect(() => {
    if (editor && pages[activePageIndex]) {
      editor.commands.setContent(pages[activePageIndex].content);
    }
  }, [editor, activePageIndex, pages]);

  // Update editor styles when font/color changes
  useEffect(() => {
    if (editor && typeof document !== 'undefined') {
      const editorElement = document.querySelector('.ProseMirror') as HTMLElement;
      if (editorElement) {
        editorElement.style.fontFamily = fontFamily;
        editorElement.style.fontSize = `${fontSize * zoomLevel / 100}pt`;
        editorElement.style.color = textColor;
      }
    }
  }, [editor, fontFamily, fontSize, textColor, zoomLevel]);

  const currentPageSize = PAGE_SIZES[pageSize];

  return (
    <div className="flex h-screen bg-gray-50">
      <WorkspaceSidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Document Header */}
        <div className="bg-white border-b border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="text-lg font-semibold text-slate-800">
                  {currentDocument?.title || 'New Document'}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const allContent = pages.map(page => page.content).join('\n<!-- PAGE_BREAK -->\n');
                  saveDocumentMutation.mutate({
                    ...currentDocument,
                    content: allContent,
                  });
                }}
                disabled={saveDocumentMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {saveDocumentMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
            
            <div className="text-sm text-slate-600">
              Page {activePageIndex + 1} of {pages.length} • {currentPageSize.width}" × {currentPageSize.height}"
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white border-b border-slate-200 p-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Undo/Redo */}
            <Button variant="ghost" size="sm" onClick={() => formatText('undo')}>
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => formatText('redo')}>
              <Redo2 className="w-4 h-4" />
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            {/* Basic Formatting */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => formatText('bold')}
              className={editor?.isActive('bold') ? 'bg-slate-200' : ''}
            >
              <Bold className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => formatText('italic')}
              className={editor?.isActive('italic') ? 'bg-slate-200' : ''}
            >
              <Italic className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => formatText('underline')}
              className={editor?.isActive('underline') ? 'bg-slate-200' : ''}
            >
              <UnderlineIcon className="w-4 h-4" />
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            {/* Alignment */}
            <Button variant="ghost" size="sm" onClick={() => formatText('justifyLeft')}>
              <AlignLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => formatText('justifyCenter')}>
              <AlignCenter className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => formatText('justifyRight')}>
              <AlignRight className="w-4 h-4" />
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            {/* Lists */}
            <Button variant="ghost" size="sm" onClick={() => formatText('insertUnorderedList')}>
              <List className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => formatText('insertOrderedList')}>
              <ListOrdered className="w-4 h-4" />
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            {/* Font Controls */}
            <Select value={fontFamily} onValueChange={setFontFamily}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                <SelectItem value="Arial">Arial</SelectItem>
                <SelectItem value="Calibri">Calibri</SelectItem>
                <SelectItem value="Georgia">Georgia</SelectItem>
                <SelectItem value="Verdana">Verdana</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={fontSize.toString()} onValueChange={(value) => setFontSize(parseInt(value))}>
              <SelectTrigger className="w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="8">8</SelectItem>
                <SelectItem value="9">9</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="11">11</SelectItem>
                <SelectItem value="12">12</SelectItem>
                <SelectItem value="14">14</SelectItem>
                <SelectItem value="16">16</SelectItem>
                <SelectItem value="18">18</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="24">24</SelectItem>
                <SelectItem value="28">28</SelectItem>
                <SelectItem value="32">32</SelectItem>
              </SelectContent>
            </Select>
            
            <input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="w-8 h-8 border border-slate-300 rounded cursor-pointer"
              title="Text Color"
            />
            
            <Separator orientation="vertical" className="h-6" />
            
            {/* Page Size */}
            <Select value={pageSize} onValueChange={(value: keyof typeof PAGE_SIZES) => setPageSize(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAGE_SIZES).map(([key, size]) => (
                  <SelectItem key={key} value={key}>{size.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Zoom */}
            <Button variant="ghost" size="sm" onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-600 min-w-[3rem] text-center">{zoomLevel}%</span>
            <Button variant="ghost" size="sm" onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Document Pages */}
          <div className="flex-1 overflow-auto bg-gray-100 p-8" ref={pagesContainerRef}>
            <div className="flex flex-col items-center gap-6">
              {pages.map((page, index) => (
                <div
                  key={page.id}
                  className={`bg-white shadow-lg relative ${index === activePageIndex ? 'ring-2 ring-blue-500' : ''}`}
                  style={{
                    width: `${currentPageSize.width * zoomLevel / 100}in`,
                    height: `${currentPageSize.height * zoomLevel / 100}in`,
                    maxHeight: `${currentPageSize.height * zoomLevel / 100}in`,
                    overflow: 'hidden'
                  }}
                  onClick={() => switchToPage(index)}
                >
                  {/* Page Content */}
                  <div
                    className="w-full h-full p-4 overflow-hidden"
                    style={{
                      fontSize: `${fontSize * zoomLevel / 100}pt`,
                      fontFamily,
                      color: textColor,
                      lineHeight: 1.5
                    }}
                  >
                    {index === activePageIndex ? (
                      <EditorContent editor={editor} className="h-full overflow-hidden" />
                    ) : (
                      <div 
                        dangerouslySetInnerHTML={{ __html: page.content || '<p>Start writing...</p>' }}
                        className="h-full overflow-hidden"
                      />
                    )}
                  </div>
                  
                  {/* Page Number */}
                  <div className="absolute bottom-4 right-4 text-xs text-gray-500">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Panel */}
          <div className="w-96 border-l border-slate-200 bg-white">
            <ChatPanel 
              workspaceType="document" 
              workspaceId={currentDocument?.id || 'new'} 
              onContentInsert={(content) => {
                if (editor) {
                  editor.chain().focus().insertContent(content).run();
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}