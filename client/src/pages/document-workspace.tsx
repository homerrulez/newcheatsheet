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
  const [pages, setPages] = useState<string[]>(['']);
  const measureRef = useRef<HTMLDivElement>(null);
  
  // Calculate actual page dimensions
  const pageWidth = PAGE_SIZES[pageSize].width * 96 * zoomLevel / 100;
  const pageHeight = PAGE_SIZES[pageSize].height * 96 * zoomLevel / 100;
  const contentWidth = pageWidth - 128; // 64px padding on each side
  const contentHeight = pageHeight - 128; // 64px padding top/bottom
  
  // Split content into pages based on actual height constraints
  useEffect(() => {
    if (!documentContent || !measureRef.current) return;
    
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      width: ${contentWidth}px;
      font-family: ${fontFamily};
      font-size: ${fontSize}pt;
      line-height: 1.6;
      visibility: hidden;
      overflow: hidden;
    `;
    document.body.appendChild(tempDiv);
    
    try {
      // Parse HTML content into paragraphs
      const parser = new DOMParser();
      const doc = parser.parseFromString(documentContent, 'text/html');
      const elements = Array.from(doc.body.children);
      
      const newPages: string[] = [];
      let currentPageContent = '';
      let currentPageHeight = 0;
      
      for (const element of elements) {
        tempDiv.innerHTML = currentPageContent + element.outerHTML;
        const newHeight = tempDiv.scrollHeight;
        
        if (newHeight > contentHeight && currentPageContent) {
          // Current page is full, start new page
          newPages.push(currentPageContent);
          currentPageContent = element.outerHTML;
          tempDiv.innerHTML = element.outerHTML;
          currentPageHeight = tempDiv.scrollHeight;
        } else {
          currentPageContent += element.outerHTML;
          currentPageHeight = newHeight;
        }
      }
      
      if (currentPageContent) {
        newPages.push(currentPageContent);
      }
      
      if (newPages.length === 0) {
        newPages.push('<p></p>');
      }
      
      setPages(newPages);
    } finally {
      document.body.removeChild(tempDiv);
    }
  }, [documentContent, contentWidth, contentHeight, fontFamily, fontSize]);
  
  // Handle content updates from a specific page
  const handlePageContentChange = (pageIndex: number, newContent: string) => {
    const updatedPages = [...pages];
    updatedPages[pageIndex] = newContent;
    
    // Combine all pages back into single content
    const combinedContent = updatedPages.join('');
    onContentChange(combinedContent);
  };
  
  return (
    <div className="h-full bg-gray-100 dark:bg-gray-800 p-8 overflow-auto">
      <div ref={measureRef} className="space-y-8">
        {pages.map((pageContent, pageIndex) => (
          <PageContainer
            key={pageIndex}
            pageIndex={pageIndex}
            content={pageContent}
            pageWidth={pageWidth}
            pageHeight={pageHeight}
            fontSize={fontSize}
            fontFamily={fontFamily}
            textColor={textColor}
            editor={pageIndex === 0 ? editor : null} // Only first page gets editor for now
            onContentChange={(newContent) => handlePageContentChange(pageIndex, newContent)}
          />
        ))}
      </div>
    </div>
  );
}

// Individual page container with strict boundaries
interface PageContainerProps {
  pageIndex: number;
  content: string;
  pageWidth: number;
  pageHeight: number;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  editor: any;
  onContentChange: (content: string) => void;
}

function PageContainer({ 
  pageIndex, 
  content, 
  pageWidth, 
  pageHeight, 
  fontSize, 
  fontFamily, 
  textColor, 
  editor,
  onContentChange 
}: PageContainerProps) {
  return (
    <div 
      className="mx-auto bg-white shadow-lg relative overflow-hidden"
      style={{
        width: `${pageWidth}px`,
        height: `${pageHeight}px`,
      }}
    >
      <div 
        className="absolute inset-0 p-16 overflow-hidden"
        style={{
          fontFamily,
          fontSize: `${fontSize}pt`,
          color: textColor,
          lineHeight: '1.6',
        }}
      >
        {editor && pageIndex === 0 ? (
          <EditorContent 
            editor={editor}
            className="h-full w-full focus:outline-none"
          />
        ) : (
          <div 
            className="h-full w-full"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
      </div>
      
      {/* Page number */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-gray-500">
        {pageIndex + 1}
      </div>
    </div>
  );
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
      return response as { content: string };
    },
    onSuccess: (response) => {
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant' as const,
        content: response.content,
        timestamp: new Date(),
      };
      
      setChatMessages(prev => [...prev, assistantMessage]);
      
      // Insert AI response into document at current cursor position
      if (editor && response.content) {
        editor.chain().focus().insertContent(response.content).run();
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