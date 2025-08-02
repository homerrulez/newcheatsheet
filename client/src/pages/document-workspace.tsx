import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Save, FileText, Bold, Italic, Underline as UnderlineIcon, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, ZoomIn, ZoomOut, Printer, Type, Palette, 
  Undo2, Redo2, History, MessageSquare, Plus, Clock, Send,
  Edit3, Share, Trash2, Copy, Download, Eye, MoreVertical,
  Brain, Sparkles, Command, ChevronDown, ChevronRight
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Document, ChatSession, ChatMessage, DocumentCommand } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

// Page sizes (in inches, converted to pixels at 96 DPI)
const PAGE_SIZES = {
  'letter': { width: 816, height: 1056, name: 'Letter (8.5" × 11")' },
  'legal': { width: 816, height: 1344, name: 'Legal (8.5" × 14")' },
  'a4': { width: 794, height: 1123, name: 'A4 (8.27" × 11.69")' },
  'tabloid': { width: 1056, height: 1632, name: 'Tabloid (11" × 17")' },
} as const;

export default function DocumentWorkspace() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Document state
  const [zoomLevel, setZoomLevel] = useState(100);
  const [fontSize, setFontSize] = useState(12);
  const [fontFamily, setFontFamily] = useState('Times New Roman');
  const [textColor, setTextColor] = useState('#000000');
  const [pageSize, setPageSize] = useState<keyof typeof PAGE_SIZES>('letter');
  
  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('');
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  // Editor setup with extensive functionality
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Color,
      TextStyle,
      FontFamily.configure({
        types: ['textStyle'],
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-full',
        style: `font-family: ${fontFamily}; font-size: ${fontSize}pt; color: ${textColor}; line-height: 1.6;`,
      },
    },
    onUpdate: ({ editor }) => {
      // Auto-save document changes
      debouncedSave();
    },
  });

  // Fetch document
  const { data: document, isLoading: documentLoading } = useQuery<Document>({
    queryKey: ['document', id],
    queryFn: async () => {
      const response = await fetch(`/api/documents/${id}`);
      if (!response.ok) throw new Error('Failed to fetch document');
      return response.json();
    },
    enabled: !!id,
  });

  // Fetch chat sessions for this document
  const { data: chatSessions = [], refetch: refetchSessions } = useQuery<ChatSession[]>({
    queryKey: ['chatSessions', id],
    queryFn: async () => {
      const response = await fetch(`/api/documents/${id}/chat-sessions`);
      if (!response.ok) throw new Error('Failed to fetch chat sessions');
      return response.json();
    },
    enabled: !!id,
  });

  // Fetch messages for selected session
  const { data: chatMessages = [], refetch: refetchMessages } = useQuery<ChatMessage[]>({
    queryKey: ['chatMessages', selectedSessionId],
    queryFn: async () => {
      const response = await fetch(`/api/chat-sessions/${selectedSessionId}/messages`);
      if (!response.ok) throw new Error('Failed to fetch chat messages');
      return response.json();
    },
    enabled: !!selectedSessionId,
  });

  // Update document mutation
  const updateDocumentMutation = useMutation({
    mutationFn: async (updates: Partial<Document>) => {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update document');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] });
    },
  });

  // Create chat session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (data: { title: string; documentSnapshot: string }) => {
      const response = await fetch(`/api/documents/${id}/chat-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create chat session');
      return response.json();
    },
    onSuccess: (session: ChatSession) => {
      setSelectedSessionId(session.id);
      setIsCreatingSession(false);
      setSessionTitle('');
      refetchSessions();
      toast({ title: "Chat session created successfully" });
    },
  });

  // Send chat message mutation with document command parsing
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const documentContent = editor?.getHTML() || '';
      const response = await fetch(`/api/chat-sessions/${selectedSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: message, 
          documentContent,
          documentId: id 
        }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: (response: any) => {
      refetchMessages();
      setChatInput('');
      
      // Execute document commands if any
      if (response.documentCommand) {
        executeDocumentCommand(response.documentCommand);
      }
      
      // Insert text response into document if it's content
      if (response.insertText && editor) {
        if (response.insertAtEnd) {
          editor.commands.focus('end');
          editor.commands.insertContent(response.insertText);
        } else {
          editor.commands.focus();
          editor.commands.insertContent(response.insertText);
        }
      }
    },
  });

  // Execute document commands from ChatGPT
  const executeDocumentCommand = useCallback((command: DocumentCommand) => {
    if (!editor) return;

    switch (command.type) {
      case 'delete_page':
        // For simplicity, we'll clear content or remove sections
        if (command.params.pageNumber === 1) {
          editor.commands.clearContent();
          toast({ title: `Page ${command.params.pageNumber} cleared` });
        }
        break;
        
      case 'format_text':
        const { text, formatting } = command.params;
        if (text && formatting) {
          // Find and format specific text
          const content = editor.getHTML();
          let newContent = content;
          
          if (formatting.bold) {
            newContent = newContent.replace(new RegExp(text, 'gi'), `<strong>${text}</strong>`);
          }
          if (formatting.italic) {
            newContent = newContent.replace(new RegExp(`(?<!<strong>)${text}(?!</strong>)`, 'gi'), `<em>${text}</em>`);
          }
          if (formatting.underline) {
            newContent = newContent.replace(new RegExp(text, 'gi'), `<u>${text}</u>`);
          }
          
          editor.commands.setContent(newContent);
          toast({ title: `Formatted text: "${text}"` });
        }
        break;
        
      case 'add_text':
        const { text: addText, position, pageNumber } = command.params;
        if (addText) {
          if (position === 'end') {
            editor.commands.focus('end');
            editor.commands.insertContent(`<p>${addText}</p>`);
          } else if (position === 'start') {
            editor.commands.focus('start');
            editor.commands.insertContent(`<p>${addText}</p>`);
          } else {
            editor.commands.focus();
            editor.commands.insertContent(`<p>${addText}</p>`);
          }
          toast({ title: pageNumber ? `Added text to page ${pageNumber}` : "Text added to document" });
        }
        break;
        
      case 'replace_text':
        const { targetText, newText } = command.params;
        if (targetText && newText) {
          const content = editor.getHTML();
          const updatedContent = content.replace(new RegExp(targetText, 'gi'), newText);
          editor.commands.setContent(updatedContent);
          toast({ title: `Replaced "${targetText}" with "${newText}"` });
        }
        break;
    }
    
    // Save changes after executing command
    debouncedSave();
  }, [editor, toast]);

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(() => {
      if (editor) {
        updateDocumentMutation.mutate({
          content: editor.getHTML(),
          pageSize,
          fontSize: fontSize.toString(),
          fontFamily,
          textColor,
        });
      }
    }, 1000),
    [editor, pageSize, fontSize, fontFamily, textColor]
  );

  // Initialize editor with document content
  useEffect(() => {
    if (document && editor && document.content && !editor.getHTML().includes(document.content)) {
      editor.commands.setContent(document.content || '<p></p>');
      setPageSize((document.pageSize as keyof typeof PAGE_SIZES) || 'letter');
      setFontSize(parseInt(document.fontSize || '12'));
      setFontFamily(document.fontFamily || 'Times New Roman');
      setTextColor(document.textColor || '#000000');
    }
  }, [document, editor]);

  // Update editor props when formatting changes
  useEffect(() => {
    if (editor) {
      editor.setOptions({
        editorProps: {
          attributes: {
            class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-full',
            style: `font-family: ${fontFamily}; font-size: ${fontSize}pt; color: ${textColor}; line-height: 1.6;`,
          },
        },
      });
    }
  }, [editor, fontFamily, fontSize, textColor]);

  // Calculate page metrics
  const pageWidth = PAGE_SIZES[pageSize].width * (zoomLevel / 100);
  const pageHeight = PAGE_SIZES[pageSize].height * (zoomLevel / 100);
  const padding = 64 * (zoomLevel / 100); // 64px padding scaled with zoom

  // Calculate number of pages based on content height
  const [pageCount, setPageCount] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      const contentHeight = contentRef.current.scrollHeight;
      const availableHeight = pageHeight - (padding * 2);
      const calculatedPages = Math.max(1, Math.ceil(contentHeight / availableHeight));
      setPageCount(calculatedPages);
    }
  }, [editor?.getHTML(), pageHeight, padding, zoomLevel]);

  // Handle session creation
  const handleCreateSession = () => {
    if (sessionTitle.trim() && editor) {
      createSessionMutation.mutate({
        title: sessionTitle.trim(),
        documentSnapshot: editor.getHTML(),
      });
    }
  };

  // Handle send message
  const handleSendMessage = () => {
    if (chatInput.trim() && selectedSessionId) {
      sendMessageMutation.mutate(chatInput.trim());
    }
  };

  // Toggle session expansion
  const toggleSessionExpansion = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  if (documentLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900">
      {/* Top toolbar */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-white/20 p-4 shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{document?.title || 'Document'}</h1>
            </div>
            
            {/* Formatting toolbar */}
            <div className="flex items-center space-x-2 ml-8">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor?.chain().focus().toggleBold().run()}
                className={editor?.isActive('bold') ? 'bg-blue-100 dark:bg-blue-900' : ''}
              >
                <Bold className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                className={editor?.isActive('italic') ? 'bg-blue-100 dark:bg-blue-900' : ''}
              >
                <Italic className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
                className={editor?.isActive('underline') ? 'bg-blue-100 dark:bg-blue-900' : ''}
              >
                <UnderlineIcon className="w-4 h-4" />
              </Button>
              
              <Separator orientation="vertical" className="h-6" />
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor?.chain().focus().setTextAlign('left').run()}
                className={editor?.isActive({ textAlign: 'left' }) ? 'bg-blue-100 dark:bg-blue-900' : ''}
              >
                <AlignLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor?.chain().focus().setTextAlign('center').run()}
                className={editor?.isActive({ textAlign: 'center' }) ? 'bg-blue-100 dark:bg-blue-900' : ''}
              >
                <AlignCenter className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => editor?.chain().focus().setTextAlign('right').run()}
                className={editor?.isActive({ textAlign: 'right' }) ? 'bg-blue-100 dark:bg-blue-900' : ''}
              >
                <AlignRight className="w-4 h-4" />
              </Button>
              
              <Separator orientation="vertical" className="h-6" />
              
              <Select value={fontSize.toString()} onValueChange={(value) => setFontSize(parseInt(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72].map(size => (
                    <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={fontFamily} onValueChange={setFontFamily}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                  <SelectItem value="Arial">Arial</SelectItem>
                  <SelectItem value="Helvetica">Helvetica</SelectItem>
                  <SelectItem value="Georgia">Georgia</SelectItem>
                  <SelectItem value="Verdana">Verdana</SelectItem>
                  <SelectItem value="Courier New">Courier New</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoomLevel(Math.max(25, zoomLevel - 25))}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium w-12 text-center">{zoomLevel}%</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            <Button variant="outline" size="sm">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left panel - Chat Sessions History */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <div className="h-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-r border-white/20">
            <div className="p-4 border-b border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <History className="w-5 h-5 mr-2" />
                  Chat History
                </h2>
                <Button
                  size="sm"
                  onClick={() => setIsCreatingSession(true)}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              {isCreatingSession && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Input
                    placeholder="Session title..."
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    className="mb-2"
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateSession()}
                  />
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={handleCreateSession} disabled={!sessionTitle.trim()}>
                      Create
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      setIsCreatingSession(false);
                      setSessionTitle('');
                    }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            <ScrollArea className="h-full p-4">
              <div className="space-y-2">
                {chatSessions.map((session: ChatSession) => (
                  <div key={session.id} className="group">
                    <div
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                        selectedSessionId === session.id
                          ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                          : 'bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                      onClick={() => {
                        setSelectedSessionId(session.id);
                        toggleSessionExpansion(session.id);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {expandedSessions.has(session.id) ? (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          )}
                          <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="font-medium text-gray-900 dark:text-white truncate">
                            {session.title}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="sm" variant="ghost" className="p-1">
                            <Share className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="p-1">
                            <Edit3 className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="p-1 text-red-500">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(session.createdAt || Date.now()).toLocaleDateString()}
                      </div>
                    </div>
                    
                    {expandedSessions.has(session.id) && selectedSessionId === session.id && (
                      <div className="mt-2 ml-6 space-y-1">
                        {chatMessages.slice(0, 3).map((message: ChatMessage, index: number) => (
                          <div key={message.id} className="text-xs p-2 bg-gray-50 dark:bg-slate-800 rounded">
                            <div className="flex items-center space-x-1 mb-1">
                              {message.role === 'user' ? (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              ) : (
                                <Brain className="w-3 h-3 text-purple-500" />
                              )}
                              <span className="font-medium text-gray-600 dark:text-gray-300">
                                {message.role === 'user' ? 'You' : 'AI'}
                              </span>
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 truncate">
                              {message.content}
                            </p>
                          </div>
                        ))}
                        {chatMessages.length > 3 && (
                          <div className="text-xs text-gray-500 text-center py-1">
                            +{chatMessages.length - 3} more messages
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Center panel - Document Editor */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full relative">
            {/* Page status bar */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
              <Badge variant="secondary" className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                Page 1 of {pageCount} • {PAGE_SIZES[pageSize].name}
              </Badge>
            </div>
            
            {/* Document container */}
            <ScrollArea className="h-full bg-gray-100 dark:bg-gray-800">
              <div className="min-h-full p-8 flex flex-col items-center">
                {/* Render pages */}
                {Array.from({ length: pageCount }, (_, pageIndex) => (
                  <div
                    key={pageIndex}
                    className="bg-white dark:bg-slate-100 shadow-2xl mb-8 relative"
                    style={{
                      width: `${pageWidth}px`,
                      height: `${pageHeight}px`,
                      minHeight: `${pageHeight}px`,
                    }}
                  >
                    {/* Page number indicator */}
                    <div className="absolute -top-6 left-0 text-xs text-gray-500 dark:text-gray-400">
                      Page {pageIndex + 1}
                    </div>
                    
                    {/* Page content */}
                    <div
                      ref={pageIndex === 0 ? contentRef : undefined}
                      className="w-full h-full relative overflow-hidden"
                      style={{ padding: `${padding}px` }}
                    >
                      {pageIndex === 0 ? (
                        // First page gets the editor
                        <EditorContent
                          editor={editor}
                          className="w-full h-full focus:outline-none prose prose-sm max-w-none"
                          style={{
                            fontFamily,
                            fontSize: `${fontSize}pt`,
                            color: textColor,
                            lineHeight: '1.6',
                          }}
                        />
                      ) : (
                        // Subsequent pages show overflow content (simplified)
                        <div className="text-gray-400 dark:text-gray-600 italic text-center pt-20">
                          Additional content would appear here...
                        </div>
                      )}
                    </div>
                    
                    {/* Page break indicator */}
                    {pageIndex < pageCount - 1 && (
                      <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-gray-400">
                        ••• Page Break •••
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Right panel - ChatGPT Integration */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <div className="h-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-l border-white/20 flex flex-col">
            {/* Chat header */}
            <div className="p-4 border-b border-white/20">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <Brain className="w-5 h-5 mr-2 text-purple-600" />
                ChatGPT Assistant
              </h2>
              {selectedSessionId && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Document control commands available
                </p>
              )}
            </div>
            
            {selectedSessionId ? (
              <>
                {/* Chat messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {chatMessages.map((message: ChatMessage) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            message.role === 'user'
                              ? 'bg-blue-600 text-white ml-4'
                              : 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white mr-4 border border-gray-200 dark:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center space-x-2 mb-1">
                            {message.role === 'user' ? (
                              <div className="w-4 h-4 bg-white/20 rounded-full"></div>
                            ) : (
                              <Sparkles className="w-4 h-4 text-purple-500" />
                            )}
                            <span className="text-xs opacity-75">
                              {message.role === 'user' ? 'You' : 'ChatGPT'}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          {message.documentCommand && (
                            <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded text-xs">
                              <Command className="w-3 h-3 inline mr-1" />
                              Document command executed
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                {/* Chat input */}
                <div className="p-4 border-t border-white/20">
                  <div className="flex space-x-2">
                    <Textarea
                      placeholder="Ask ChatGPT to edit your document... Try: 'Make the title bold' or 'Add a conclusion paragraph'"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="flex-1 min-h-[60px] resize-none"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim() || sendMessageMutation.isPending}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <strong>Commands:</strong> "delete page 2", "make 'text' bold", "add paragraph to page 3"
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Start a Chat Session
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Create a new chat session to get AI assistance with your document
                  </p>
                  <Button
                    onClick={() => setIsCreatingSession(true)}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Chat Session
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(func: T, delay: number): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  }) as T;
}