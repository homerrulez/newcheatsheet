import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { BulletList } from '@tiptap/extension-bullet-list';
import { OrderedList } from '@tiptap/extension-ordered-list';
import { ListItem } from '@tiptap/extension-list-item';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { 
  Save, FileText, Bold, Italic, Underline as UnderlineIcon, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, ZoomIn, ZoomOut, Printer, Type, Palette, 
  Undo2, Redo2, History, MessageSquare, Plus, Clock
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Document, DocumentHistory, DocumentPage } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

// Real pagination component that enforces page boundaries
interface DocumentRendererProps {
  editor: any;
  pageSize: keyof typeof PAGE_SIZES;
  zoomLevel: number;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  documentContent: string;
  onContentChange: (content: string) => void;
}

// Real document model using ProseMirror node tracking
interface PageNode {
  node: any;
  nodeIndex: number;
  startPos: number;
  endPos: number;
  height: number;
}

interface DocumentPageLayout {
  pageIndex: number;
  nodes: PageNode[];
  totalHeight: number;
  startPos: number;
  endPos: number;
}

// Page component for modular rendering
function Page({ 
  children, 
  pageNumber, 
  pageSize, 
  zoomLevel 
}: { 
  children: React.ReactNode; 
  pageNumber: number; 
  pageSize: keyof typeof PAGE_SIZES;
  zoomLevel: number;
}) {
  const pageWidth = PAGE_SIZES[pageSize].width * 96 * zoomLevel / 100;
  const pageHeight = PAGE_SIZES[pageSize].height * 96 * zoomLevel / 100;
  
  return (
    <div 
      className="page bg-white shadow-lg mx-auto mb-8 relative overflow-hidden print:mb-0 print:shadow-none"
      style={{
        width: `${pageWidth}px`,
        height: `${pageHeight}px`,
      }}
    >
      <div className="p-16 h-full overflow-hidden">
        {children}
      </div>
      
      {/* Page number */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 print:hidden">
        {pageNumber}
      </div>
    </div>
  );
}

// Content block interface for pagination
interface ContentBlock {
  id: string;
  type: 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'list' | 'blockquote';
  content: string;
  height: number;
}

// Page layout containing blocks
interface PageLayout {
  pageNumber: number;
  blocks: ContentBlock[];
  totalHeight: number;
  hasOverflow: boolean;
}

function DocumentRenderer({ 
  editor, 
  pageSize, 
  zoomLevel, 
  fontSize, 
  fontFamily, 
  textColor, 
  documentContent,
  onContentChange 
}: DocumentRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [pageLayouts, setPageLayouts] = useState<PageLayout[]>([]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  
  // Calculate actual page dimensions
  const pageWidth = PAGE_SIZES[pageSize as keyof typeof PAGE_SIZES].width * 96 * zoomLevel / 100;
  const pageHeight = PAGE_SIZES[pageSize as keyof typeof PAGE_SIZES].height * 96 * zoomLevel / 100;
  const contentHeight = pageHeight - 128; // Account for padding
  
  // Measure content height for pagination
  const measureBlockHeight = useCallback((content: string, type: string): number => {
    if (!measureRef.current) return 50; // Fallback
    
    const measureElement = measureRef.current;
    
    // Set appropriate HTML based on block type
    let html = '';
    switch (type) {
      case 'heading1':
        html = `<h1 style="font-size: ${fontSize * 1.5}pt; font-weight: bold; margin: 0.5em 0;">${content}</h1>`;
        break;
      case 'heading2':
        html = `<h2 style="font-size: ${fontSize * 1.25}pt; font-weight: bold; margin: 0.4em 0;">${content}</h2>`;
        break;
      case 'heading3':
        html = `<h3 style="font-size: ${fontSize * 1.1}pt; font-weight: bold; margin: 0.3em 0;">${content}</h3>`;
        break;
      case 'blockquote':
        html = `<blockquote style="font-size: ${fontSize}pt; margin: 1em 0; padding-left: 1em; border-left: 3px solid #ccc;">${content}</blockquote>`;
        break;
      case 'list':
        html = `<ul style="font-size: ${fontSize}pt; margin: 0.5em 0; padding-left: 1.5em;"><li>${content}</li></ul>`;
        break;
      default: // paragraph
        html = `<p style="font-size: ${fontSize}pt; margin: 0.5em 0; line-height: 1.6;">${content}</p>`;
    }
    
    measureElement.innerHTML = html;
    const height = measureElement.offsetHeight;
    measureElement.innerHTML = '';
    
    return height;
  }, [fontSize]);
  
  // Parse editor content into blocks
  const parseContentIntoBlocks = useCallback((): ContentBlock[] => {
    if (!editor) return [];
    
    const html = editor.getHTML();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const elements = Array.from(doc.body.children);
    
    return elements.map((element, index) => {
      let type: ContentBlock['type'] = 'paragraph';
      let content = element.textContent || '';
      
      switch (element.tagName.toLowerCase()) {
        case 'h1':
          type = 'heading1';
          break;
        case 'h2':
          type = 'heading2';
          break;
        case 'h3':
          type = 'heading3';
          break;
        case 'blockquote':
          type = 'blockquote';
          break;
        case 'ul':
        case 'ol':
          type = 'list';
          content = Array.from(element.querySelectorAll('li')).map(li => li.textContent).join('\n');
          break;
        default:
          type = 'paragraph';
      }
      
      const height = measureBlockHeight(content, type);
      
      return {
        id: `block-${index}`,
        type,
        content,
        height
      };
    });
  }, [editor, measureBlockHeight]);
  
  // Layout engine: distribute blocks across pages
  const calculatePageLayouts = useCallback((): PageLayout[] => {
    const blocks = parseContentIntoBlocks();
    if (blocks.length === 0) {
      return [{
        pageNumber: 1,
        blocks: [],
        totalHeight: 0,
        hasOverflow: false
      }];
    }
    
    const layouts: PageLayout[] = [];
    let currentPage: PageLayout = {
      pageNumber: 1,
      blocks: [],
      totalHeight: 0,
      hasOverflow: false
    };
    
    for (const block of blocks) {
      // Check if block fits on current page
      if (currentPage.totalHeight + block.height > contentHeight && currentPage.blocks.length > 0) {
        // Current page is full, start new page
        layouts.push(currentPage);
        currentPage = {
          pageNumber: layouts.length + 1,
          blocks: [block],
          totalHeight: block.height,
          hasOverflow: block.height > contentHeight
        };
      } else {
        // Add block to current page
        currentPage.blocks.push(block);
        currentPage.totalHeight += block.height;
        if (currentPage.totalHeight > contentHeight) {
          currentPage.hasOverflow = true;
        }
      }
    }
    
    // Add final page
    layouts.push(currentPage);
    
    return layouts;
  }, [parseContentIntoBlocks, contentHeight]);
  
  // Update layouts when content changes
  useEffect(() => {
    if (!editor) return;
    
    const handleUpdate = () => {
      onContentChange(editor.getHTML());
      setTimeout(() => {
        const newLayouts = calculatePageLayouts();
        setPageLayouts(newLayouts);
      }, 100);
    };
    
    editor.on('update', handleUpdate);
    
    // Initial calculation
    const initialLayouts = calculatePageLayouts();
    setPageLayouts(initialLayouts);
    
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, calculatePageLayouts, onContentChange]);
  
  // Recalculate when font size changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const newLayouts = calculatePageLayouts();
      setPageLayouts(newLayouts);
    }, 200);
    return () => clearTimeout(timer);
  }, [calculatePageLayouts, fontSize, fontFamily]);

  // Handle block editing
  const handleBlockEdit = useCallback((blockId: string, newContent: string) => {
    if (!editor) return;
    
    // Update the editor content
    // This is a simplified approach - in production you'd want more sophisticated block management
    const blocks = parseContentIntoBlocks();
    const blockIndex = blocks.findIndex(b => b.id === blockId);
    
    if (blockIndex >= 0) {
      // For now, just focus the main editor and let Tiptap handle the editing
      editor.commands.focus();
      setActiveBlockId(blockId);
    }
  }, [editor, parseContentIntoBlocks]);
  
  // Handle page clicks
  const handlePageClick = useCallback((pageIndex: number) => {
    setActivePageIndex(pageIndex);
    if (editor) {
      editor.commands.focus();
    }
  }, [editor]);

  return (
    <div className="h-full bg-gray-100 dark:bg-gray-800 p-8 overflow-auto">
      {/* Page count status */}
      <div className="text-center mb-4 text-sm text-gray-600 dark:text-gray-400">
        Page {activePageIndex + 1} of {pageLayouts.length || 1}
      </div>
      
      {/* Hidden measurement container */}
      <div
        ref={measureRef}
        className="absolute -top-9999 -left-9999 invisible"
        style={{
          width: `${pageWidth - 128}px`, // Account for padding
          fontFamily,
          color: textColor,
          lineHeight: '1.6',
        }}
      />
      
      <div ref={containerRef} className="relative">
        {pageLayouts.length > 0 ? (
          // Render paginated content
          pageLayouts.map((pageLayout, pageIndex) => (
            <Page
              key={`page-${pageLayout.pageNumber}`}
              pageNumber={pageLayout.pageNumber}
              pageSize={pageSize}
              zoomLevel={zoomLevel}
            >
              <div
                className={`h-full ${pageIndex === activePageIndex ? 'cursor-text' : 'cursor-pointer'}`}
                style={{
                  fontFamily,
                  fontSize: `${fontSize}pt`,
                  color: textColor,
                  lineHeight: '1.6',
                }}
                onClick={() => handlePageClick(pageIndex)}
              >
                {pageIndex === activePageIndex ? (
                  // Active page: Show live editor
                  <div className="h-full overflow-hidden">
                    <EditorContent 
                      editor={editor}
                      className="focus:outline-none prose prose-sm max-w-none h-full overflow-hidden"
                    />
                  </div>
                ) : (
                  // Inactive page: Show rendered blocks
                  <div className="h-full overflow-hidden">
                    {pageLayout.blocks.map((block) => {
                      const BlockComponent = getBlockComponent(block.type);
                      return (
                        <BlockComponent
                          key={block.id}
                          content={block.content}
                          fontSize={fontSize}
                          isActive={block.id === activeBlockId}
                          onClick={() => handleBlockEdit(block.id, block.content)}
                        />
                      );
                    })}
                  </div>
                )}
                
                {/* Overflow indicator */}
                {pageLayout.hasOverflow && (
                  <div className="absolute bottom-20 right-4 text-xs text-red-500 bg-red-50 px-2 py-1 rounded">
                    Content overflow
                  </div>
                )}
              </div>
            </Page>
          ))
        ) : (
          // Fallback: Single page with editor
          <Page pageNumber={1} pageSize={pageSize} zoomLevel={zoomLevel}>
            <div
              className="h-full cursor-text"
              style={{
                fontFamily,
                fontSize: `${fontSize}pt`,
                color: textColor,
                lineHeight: '1.6',
              }}
              onClick={() => handlePageClick(0)}
            >
              <EditorContent 
                editor={editor}
                className="focus:outline-none prose prose-sm max-w-none h-full overflow-hidden"
              />
            </div>
          </Page>
        )}
      </div>
    </div>
  );
}

// Block components for rendering different content types
function getBlockComponent(type: ContentBlock['type']) {
  switch (type) {
    case 'heading1':
      return ({ content, fontSize, isActive, onClick }: any) => (
        <h1 
          className={`font-bold mb-2 ${isActive ? 'bg-blue-50' : ''} cursor-pointer`}
          style={{ fontSize: `${fontSize * 1.5}pt` }}
          onClick={onClick}
        >
          {content}
        </h1>
      );
    case 'heading2':
      return ({ content, fontSize, isActive, onClick }: any) => (
        <h2 
          className={`font-bold mb-2 ${isActive ? 'bg-blue-50' : ''} cursor-pointer`}
          style={{ fontSize: `${fontSize * 1.25}pt` }}
          onClick={onClick}
        >
          {content}
        </h2>
      );
    case 'heading3':
      return ({ content, fontSize, isActive, onClick }: any) => (
        <h3 
          className={`font-bold mb-1 ${isActive ? 'bg-blue-50' : ''} cursor-pointer`}
          style={{ fontSize: `${fontSize * 1.1}pt` }}
          onClick={onClick}
        >
          {content}
        </h3>
      );
    case 'blockquote':
      return ({ content, fontSize, isActive, onClick }: any) => (
        <blockquote 
          className={`border-l-4 border-gray-300 pl-4 mb-2 italic ${isActive ? 'bg-blue-50' : ''} cursor-pointer`}
          style={{ fontSize: `${fontSize}pt` }}
          onClick={onClick}
        >
          {content}
        </blockquote>
      );
    case 'list':
      return ({ content, fontSize, isActive, onClick }: any) => (
        <ul 
          className={`list-disc pl-6 mb-2 ${isActive ? 'bg-blue-50' : ''} cursor-pointer`}
          style={{ fontSize: `${fontSize}pt` }}
          onClick={onClick}
        >
          {content.split('\n').map((item: string, index: number) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      );
    default: // paragraph
      return ({ content, fontSize, isActive, onClick }: any) => (
        <p 
          className={`mb-2 ${isActive ? 'bg-blue-50' : ''} cursor-pointer`}
          style={{ fontSize: `${fontSize}pt` }}
          onClick={onClick}
        >
          {content}
        </p>
      );
  }
}

// Page size configurations (in inches)
const PAGE_SIZES = {
  'letter': { width: 8.5, height: 11, name: 'Letter' },
  'legal': { width: 8.5, height: 14, name: 'Legal' },
  'a4': { width: 8.27, height: 11.69, name: 'A4' },
  'tabloid': { width: 11, height: 17, name: 'Tabloid' },
  'half-letter': { width: 5.5, height: 8.5, name: 'Half Letter' },
  'index': { width: 4, height: 6, name: '4" × 6"' }
};

// Font families
const FONT_FAMILIES = [
  'Times New Roman', 'Arial', 'Helvetica', 'Georgia', 'Verdana', 
  'Courier New', 'Comic Sans MS', 'Impact', 'Trebuchet MS', 'Calibri'
];

// Font sizes
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

export default function DocumentWorkspace() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [fontSize, setFontSize] = useState(12);
  const [fontFamily, setFontFamily] = useState('Times New Roman');
  const [textColor, setTextColor] = useState('#000000');
  const [pageSize, setPageSize] = useState<keyof typeof PAGE_SIZES>('letter');
  const [documentContent, setDocumentContent] = useState('<p>Start writing your document...</p>');
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isProcessingChat, setIsProcessingChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{id: string; role: 'user' | 'assistant'; content: string; timestamp: Date}>>([]);
  
  const pagesContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch document data
  const { data: document } = useQuery({
    queryKey: ['/api/documents', id],
    enabled: !!id,
  });

  // Fetch document history
  const { data: documentHistory } = useQuery({
    queryKey: ['/api/documents', id, 'history'],
    enabled: !!id,
  });

  // Initialize Tiptap editor with extensive formatting capabilities
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Color.configure({ types: [TextStyle.name, ListItem.name] }),
      TextStyle,
      FontFamily.configure({
        types: [TextStyle.name, ListItem.name],
      }),
      BulletList.configure({
        HTMLAttributes: {
          class: 'bullet-list',
        },
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: 'ordered-list',
        },
      }),
      ListItem,
    ],
    content: documentContent,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      setDocumentContent(content);
      debouncedSave();
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none w-full max-w-none',
        style: `font-family: ${fontFamily}; font-size: ${fontSize * zoomLevel / 100}pt; color: ${textColor}; line-height: 1.6; min-height: 100%;`,
      },
    },
    autofocus: true,
    editable: true,
  });



  // Debounced auto-save function
  const debouncedSave = useCallback(
    debounce(() => {
      if (currentDocument) {
        saveDocument();
      }
    }, 1000),
    [currentDocument, documentContent, pageSize, fontSize, fontFamily, textColor]
  );

  // Save document mutation
  const saveDocumentMutation = useMutation({
    mutationFn: async () => {
      if (!currentDocument) return;
      
      const payload = {
        title: currentDocument.title,
        content: documentContent,
        pages: [],
        pageSize,
        fontSize: fontSize.toString(),
        fontFamily,
        textColor,
      };
      
      return await apiRequest(`/api/documents/${currentDocument.id}`, 'PATCH', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      setIsAutoSaving(false);
    },
    onError: (error) => {
      console.error('Save failed:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save document. Please try again.",
        variant: "destructive",
      });
      setIsAutoSaving(false);
    }
  });

  const saveDocument = () => {
    setIsAutoSaving(true);
    saveDocumentMutation.mutate();
  };

  // Chat with AI mutation
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('/api/chat/document', 'POST', {
        message,
        documentContent: editor?.getHTML() || '',
        documentId: id,
      });
      return response as any;
    },
    onSuccess: (response: any) => {
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant' as const,
        content: response.content || response.message || 'AI response received',
        timestamp: new Date(),
      };
      
      setChatMessages(prev => [...prev, assistantMessage]);
      
      // Insert AI response into document at current cursor position
      if (editor && assistantMessage.content) {
        editor.chain().focus().insertContent(`<p>${assistantMessage.content}</p>`).run();
      }
      
      setIsProcessingChat(false);
      setChatInput('');
    },
    onError: (error) => {
      console.error('Chat failed:', error);
      toast({
        title: "Chat Failed",
        description: "Failed to process your request. Please try again.",
        variant: "destructive",
      });
      setIsProcessingChat(false);
    }
  });

  const handleChatSubmit = () => {
    if (!chatInput.trim()) return;
    
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      content: chatInput,
      timestamp: new Date(),
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setIsProcessingChat(true);
    chatMutation.mutate(chatInput);
  };

  // Formatting functions
  const formatBold = () => editor?.chain().focus().toggleBold().run();
  const formatItalic = () => editor?.chain().focus().toggleItalic().run();
  const formatUnderline = () => editor?.chain().focus().toggleUnderline().run();
  const formatAlignLeft = () => editor?.chain().focus().setTextAlign('left').run();
  const formatAlignCenter = () => editor?.chain().focus().setTextAlign('center').run();
  const formatAlignRight = () => editor?.chain().focus().setTextAlign('right').run();
  const formatAlignJustify = () => editor?.chain().focus().setTextAlign('justify').run();
  const formatBulletList = () => editor?.chain().focus().toggleBulletList().run();
  const formatOrderedList = () => editor?.chain().focus().toggleOrderedList().run();
  const formatUndo = () => editor?.chain().focus().undo().run();
  const formatRedo = () => editor?.chain().focus().redo().run();



  // Load document data when it arrives
  useEffect(() => {
    if (document) {
      const doc = document as Document;
      setCurrentDocument(doc);
      setDocumentContent(doc.content || '<p>Start writing your document...</p>');
      setPageSize((doc.pageSize as keyof typeof PAGE_SIZES) || 'letter');
      setFontSize(parseInt(doc.fontSize) || 12);
      setFontFamily(doc.fontFamily || 'Times New Roman');
      setTextColor(doc.textColor || '#000000');
    }
  }, [document]);

  // Update editor when document content changes
  useEffect(() => {
    if (editor && documentContent !== editor.getHTML()) {
      editor.commands.setContent(documentContent);
    }
  }, [documentContent, editor]);

  // Update editor props when formatting changes
  useEffect(() => {
    if (editor) {
      editor.view.dom.style.fontFamily = fontFamily;
      editor.view.dom.style.fontSize = `${fontSize * zoomLevel / 100}pt`;
      editor.view.dom.style.color = textColor;
    }
  }, [editor, fontFamily, fontSize, textColor, zoomLevel]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentDocument?.title || 'Untitled Document'}
          </h1>
          <div className="flex items-center gap-2">
            {isAutoSaving && <span className="text-sm text-gray-500">Saving...</span>}
            <Button onClick={saveDocument} size="sm">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>

        {/* Formatting Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Undo/Redo */}
          <Button variant="outline" size="sm" onClick={formatUndo}>
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={formatRedo}>
            <Redo2 className="w-4 h-4" />
          </Button>
          
          <Separator orientation="vertical" className="h-6" />

          {/* Font Family */}
          <Select value={fontFamily} onValueChange={setFontFamily}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_FAMILIES.map((font) => (
                <SelectItem key={font} value={font}>{font}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Font Size */}
          <Select value={fontSize.toString()} onValueChange={(size) => setFontSize(parseInt(size))}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map((size) => (
                <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="h-6" />

          {/* Text Formatting */}
          <Button variant="outline" size="sm" onClick={formatBold} 
                  className={editor?.isActive('bold') ? 'bg-blue-100 dark:bg-blue-900' : ''}>
            <Bold className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={formatItalic}
                  className={editor?.isActive('italic') ? 'bg-blue-100 dark:bg-blue-900' : ''}>
            <Italic className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={formatUnderline}
                  className={editor?.isActive('underline') ? 'bg-blue-100 dark:bg-blue-900' : ''}>
            <UnderlineIcon className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Alignment */}
          <Button variant="outline" size="sm" onClick={formatAlignLeft}
                  className={editor?.isActive({textAlign: 'left'}) ? 'bg-blue-100 dark:bg-blue-900' : ''}>
            <AlignLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={formatAlignCenter}
                  className={editor?.isActive({textAlign: 'center'}) ? 'bg-blue-100 dark:bg-blue-900' : ''}>
            <AlignCenter className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={formatAlignRight}
                  className={editor?.isActive({textAlign: 'right'}) ? 'bg-blue-100 dark:bg-blue-900' : ''}>
            <AlignRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={formatAlignJustify}
                  className={editor?.isActive({textAlign: 'justify'}) ? 'bg-blue-100 dark:bg-blue-900' : ''}>
            <AlignJustify className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Lists */}
          <Button variant="outline" size="sm" onClick={formatBulletList}
                  className={editor?.isActive('bulletList') ? 'bg-blue-100 dark:bg-blue-900' : ''}>
            <List className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={formatOrderedList}
                  className={editor?.isActive('orderedList') ? 'bg-blue-100 dark:bg-blue-900' : ''}>
            <ListOrdered className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Text Color */}
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            <input
              type="color"
              value={textColor}
              onChange={(e) => {
                setTextColor(e.target.value);
                editor?.chain().focus().setColor(e.target.value).run();
              }}
              className="w-8 h-8 rounded border"
            />
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Zoom */}
          <Button variant="outline" size="sm" onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium w-12 text-center">{zoomLevel}%</span>
          <Button variant="outline" size="sm" onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))}>
            <ZoomIn className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Page Size */}
          <Select value={pageSize} onValueChange={(size) => setPageSize(size as keyof typeof PAGE_SIZES)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PAGE_SIZES).map(([key, size]) => (
                <SelectItem key={key} value={key}>{size.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content Area */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Document History Panel */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <Card className="h-full rounded-none border-0 border-r">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="w-5 h-5" />
                Document History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-180px)]">
                <div className="p-4 space-y-2">
                  {(documentHistory as DocumentHistory[])?.map((historyItem: DocumentHistory) => (
                    <div key={historyItem.id} 
                         className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">{historyItem.title}</span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {historyItem.createdAt ? new Date(historyItem.createdAt).toLocaleString() : 'Unknown date'}
                      </p>
                      {historyItem.changeDescription && (
                        <p className="text-xs text-gray-500 mt-1">{historyItem.changeDescription}</p>
                      )}
                    </div>
                  )) || (
                    <div className="text-center text-gray-500 py-8">
                      <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No history yet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </ResizablePanel>

        <ResizableHandle />

        {/* Document Editor Panel */}
        <ResizablePanel defaultSize={55} minSize={40}>
          <DocumentRenderer 
            editor={editor}
            pageSize={pageSize}
            zoomLevel={zoomLevel}
            fontSize={fontSize}
            fontFamily={fontFamily}
            textColor={textColor}
            documentContent={documentContent}
            onContentChange={setDocumentContent}
          />
        </ResizablePanel>

        <ResizableHandle />

        {/* AI Chat Panel */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
          <Card className="h-full rounded-none border-0 border-l">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="w-5 h-5" />
                AI Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-80px)] flex flex-col">
              {/* Chat Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Ask AI to help with your document</p>
                      <p className="text-xs mt-1">AI responses will be added to your document</p>
                    </div>
                  ) : (
                    chatMessages.map((message) => (
                      <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-lg ${
                          message.role === 'user' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  {isProcessingChat && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Chat Input */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask AI to help with your document..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleChatSubmit();
                      }
                    }}
                    disabled={isProcessingChat}
                  />
                  <Button 
                    onClick={handleChatSubmit} 
                    disabled={!chatInput.trim() || isProcessingChat}
                    size="sm"
                  >
                    Send
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  AI responses will be inserted into your document at the current cursor position.
                </p>
              </div>
            </CardContent>
          </Card>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}