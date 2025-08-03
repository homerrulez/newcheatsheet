import React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import QuillEditor, { QuillEditorRef } from '@/components/quill-editor';
import QuillToolbar from '@/components/quill-toolbar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare, Save, Plus, Brain, Send, MoreVertical, 
  Edit3, Trash2, ChevronDown, ChevronRight
} from 'lucide-react';
import debounce from 'lodash.debounce';

// Page size configurations
const PAGE_SIZES = {
  letter: { width: 816, height: 1056 }, // 8.5" × 11" at 96 DPI
  legal: { width: 816, height: 1344 }, // 8.5" × 14" at 96 DPI
  a4: { width: 794, height: 1123 }, // 8.27" × 11.69" at 96 DPI
  a3: { width: 1123, height: 1587 }, // 11.69" × 16.54" at 96 DPI
  tabloid: { width: 1056, height: 1632 }, // 11" × 17" at 96 DPI
  executive: { width: 696, height: 1008 }, // 7.25" × 10.5" at 96 DPI
  ledger: { width: 1632, height: 1056 }, // 17" × 11" at 96 DPI
};

// Types
interface Document {
  id: string;
  title: string;
  content?: string;
  createdAt: string;
  pageSize?: string;
  fontSize?: string;
  fontFamily?: string;
  textColor?: string;
}

interface ChatSession {
  id: string;
  title: string;
  documentId: string;
  createdAt: string;
  documentSnapshot?: string;
}

interface ChatMessage {
  id: string;
  sessionId: string;
  content: string;
  isUser: boolean;
  createdAt: string;
}

interface DocumentCommand {
  type: string;
  params: any;
}

export default function DocumentWorkspace() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Document formatting state
  const [pageSize, setPageSize] = useState<keyof typeof PAGE_SIZES>('letter');
  const [pageOrientation, setPageOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [fontSize, setFontSize] = useState(12);
  const [fontFamily, setFontFamily] = useState('Times New Roman');
  const [textColor, setTextColor] = useState('#000000');
  const [zoomLevel, setZoomLevel] = useState(100);
  
  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [defaultSessionId, setDefaultSessionId] = useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  
  // Renaming state
  const [renamingHistoryId, setRenamingHistoryId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState('');

  // Quill editor setup
  const quillEditorRef = useRef<QuillEditorRef>(null);
  const [editorContent, setEditorContent] = useState<string>('');

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

  // Fetch messages for default session
  const { data: chatMessages = [], refetch: refetchMessages } = useQuery<ChatMessage[]>({
    queryKey: ['chatMessages', defaultSessionId],
    queryFn: async () => {
      const response = await fetch(`/api/chat-sessions/${defaultSessionId}/messages`);
      if (!response.ok) throw new Error('Failed to fetch chat messages');
      return response.json();
    },
    enabled: !!defaultSessionId,
  });

  // Create default session automatically when document loads
  useEffect(() => {
    if (document && !defaultSessionId && chatSessions.length === 0) {
      createDefaultSession();
    } else if (chatSessions.length > 0 && !defaultSessionId) {
      setDefaultSessionId(chatSessions[0].id);
    }
  }, [document, chatSessions, defaultSessionId]);

  // Initialize editor with document content
  useEffect(() => {
    if (document?.content && document.content !== editorContent) {
      setEditorContent(document.content || '');
      setPageSize((document.pageSize as keyof typeof PAGE_SIZES) || 'letter');
      setFontSize(parseInt(document.fontSize || '12'));
      setFontFamily(document.fontFamily || 'Times New Roman');
      setTextColor(document.textColor || '#000000');
    }
  }, [document, editorContent]);

  // Handle editor content changes
  const handleEditorChange = useCallback((content: string) => {
    setEditorContent(content);
    debouncedSave();
  }, []);

  // Create default chat session automatically
  const createDefaultSession = async () => {
    try {
      const response = await fetch(`/api/documents/${id}/chat-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Chat Session ${new Date().toLocaleDateString()}`,
          documentSnapshot: quillEditorRef.current?.getContent() || '<p></p>',
        }),
      });
      if (response.ok) {
        const session = await response.json();
        setDefaultSessionId(session.id);
        refetchSessions();
      }
    } catch (error) {
      console.error('Failed to create default session:', error);
    }
  };

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

  // Send chat message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!defaultSessionId) {
        await createDefaultSession();
      }
      
      const documentContent = quillEditorRef.current?.getContent() || '';
      const response = await fetch(`/api/chat-sessions/${defaultSessionId}/messages`, {
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
      if (response.documentCommands && Array.isArray(response.documentCommands)) {
        response.documentCommands.forEach((command: DocumentCommand) => {
          executeDocumentCommand(command);
        });
      } else if (response.documentCommand) {
        executeDocumentCommand(response.documentCommand);
      }
      
      // Insert text response into document if it's content
      if (response.insertText && quillEditorRef.current) {
        const editor = quillEditorRef.current;
        if (response.insertAtEnd) {
          const length = editor.getLength();
          editor.insertText(length - 1, response.insertText);
        } else {
          const selection = editor.getSelection();
          const index = selection ? selection.index : 0;
          editor.insertText(index, response.insertText);
        }
        editor.focus();
      }
    },
  });

  // Execute document commands from ChatGPT
  const executeDocumentCommand = useCallback((command: DocumentCommand) => {
    if (!quillEditorRef.current) return;
    const editor = quillEditorRef.current;

    switch (command.type) {
      case 'delete_page':
        if (command.params.pageNumber === 1) {
          editor.setContent('');
          setEditorContent('');
          toast({ title: `Page ${command.params.pageNumber} cleared` });
        }
        break;
        
      case 'center_text':
        const { text: centerText } = command.params;
        if (centerText) {
          const text = editor.getText();
          const textIndex = text.indexOf(centerText);
          if (textIndex !== -1) {
            editor.formatText(textIndex, centerText.length, 'align', 'center');
            toast({ title: `Centered text: "${centerText}"` });
          }
        }
        break;
        
      case 'format_text':
        const { text, formatting } = command.params;
        if (text && formatting) {
          const fullText = editor.getText();
          const textIndex = fullText.indexOf(text);
          if (textIndex !== -1) {
            if (formatting.bold) {
              editor.formatText(textIndex, text.length, 'bold', true);
            }
            if (formatting.italic) {
              editor.formatText(textIndex, text.length, 'italic', true);
            }
            if (formatting.underline) {
              editor.formatText(textIndex, text.length, 'underline', true);
            }
            toast({ title: `Formatted text: "${text}"` });
          }
        }
        break;
        
      case 'add_text':
        const { text: addText, position, pageNumber } = command.params;
        if (addText) {
          if (position === 'end') {
            const length = editor.getLength();
            editor.insertText(length - 1, addText);
          } else if (position === 'start') {
            editor.insertText(0, addText);
          } else {
            const selection = editor.getSelection();
            const index = selection ? selection.index : 0;
            editor.insertText(index, addText);
          }
          toast({ title: pageNumber ? `Added text to page ${pageNumber}` : "Text added to document" });
        }
        break;
        
      case 'replace_text':
        const { targetText, newText } = command.params;
        if (targetText && newText) {
          const text = editor.getText();
          const textIndex = text.indexOf(targetText);
          if (textIndex !== -1) {
            editor.deleteText(textIndex, targetText.length);
            editor.insertText(textIndex, newText);
            toast({ title: `Replaced "${targetText}" with "${newText}"` });
          }
        }
        break;
        
      case 'delete_text':
        const { text: deleteText } = command.params;
        if (deleteText) {
          const text = editor.getText();
          const textIndex = text.indexOf(deleteText);
          if (textIndex !== -1) {
            editor.deleteText(textIndex, deleteText.length);
            toast({ title: `Deleted text: "${deleteText}"` });
          }
        }
        break;
        
      case 'clear_all':
        editor.setContent('');
        setEditorContent('');
        toast({ title: "Document cleared" });
        break;
    }
    
    // Save changes after executing command
    debouncedSave();
  }, [quillEditorRef, toast]);

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(() => {
      if (quillEditorRef.current) {
        updateDocumentMutation.mutate({
          content: quillEditorRef.current.getContent(),
          pageSize,
          fontSize: fontSize.toString(),
          fontFamily,
          textColor,
        });
      }
    }, 1000),
    [quillEditorRef, pageSize, fontSize, fontFamily, textColor]
  );

  // Create new chat session
  const createNewChatSession = async () => {
    try {
      const response = await fetch(`/api/documents/${id}/chat-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `New Chat ${new Date().toLocaleDateString()}`,
          documentSnapshot: quillEditorRef.current?.getContent() || '<p></p>',
        }),
      });
      if (response.ok) {
        const session = await response.json();
        setDefaultSessionId(session.id);
        refetchSessions();
        toast({ title: "New chat session created" });
      }
    } catch (error) {
      toast({ title: "Failed to create chat session", variant: "destructive" });
    }
  };

  // Save rename function
  const saveRename = async (sessionId: string) => {
    if (!renameTitle.trim()) {
      setRenamingHistoryId(null);
      return;
    }
    
    try {
      const response = await fetch(`/api/chat-sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: renameTitle }),
      });
      
      if (response.ok) {
        refetchSessions();
        toast({ title: "Session renamed successfully" });
      }
    } catch (error) {
      toast({ title: "Failed to rename session", variant: "destructive" });
    }
    
    setRenamingHistoryId(null);
    setRenameTitle('');
  };

  // Calculate page metrics
  const currentPageSize = PAGE_SIZES[pageSize] || PAGE_SIZES.letter;
  const pageWidth = pageOrientation === 'landscape' ? currentPageSize.height : currentPageSize.width;
  const pageHeight = pageOrientation === 'landscape' ? currentPageSize.width : currentPageSize.height;
  const adjustedPageWidth = (pageWidth * zoomLevel) / 100;
  const adjustedPageHeight = (pageHeight * zoomLevel) / 100;
  const padding = 60;
  const pageCount = Math.max(1, Math.ceil((editorContent.length || 100) / 1000));

  if (documentLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Enhanced Microsoft Word-Style Toolbar */}
      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-b border-white/20 flex-shrink-0">
        {/* Document title bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 flex items-center justify-center">
              <img 
                src="/src/assets/studyflow-logo-new.svg" 
                alt="StudyFlow" 
                className="w-8 h-8"
              />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{document?.title || 'Document'}</h1>
          </div>
          <Button variant="outline" size="sm">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>

        {/* Document Toolbar - Professional Quill Toolbar */}
        <QuillToolbar
          editorRef={quillEditorRef}
          fontSize={fontSize}
          setFontSize={setFontSize}
          fontFamily={fontFamily}
          setFontFamily={setFontFamily}
          textColor={textColor}
          setTextColor={setTextColor}
          onToast={toast}
        />
      </div>

      {/* Main content area */}
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left panel - Document History */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <div className="h-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-r border-white/20">
            <div className="p-4 border-b border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Chat Sessions
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    All conversations with your document
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={createNewChatSession}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  New Chat
                </Button>
              </div>
            </div>
            
            <ScrollArea className="h-full p-4">
              <div className="space-y-2">
                {chatSessions.map((sessionItem: any) => (
                  <div key={sessionItem.id} className="group">
                    <div 
                      className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer ${ 
                        defaultSessionId === sessionItem.id
                          ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                          : 'bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                      onClick={() => setDefaultSessionId(sessionItem.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 flex-1">
                          <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          {renamingHistoryId === sessionItem.id ? (
                            <Input
                              value={renameTitle}
                              onChange={(e) => setRenameTitle(e.target.value)}
                              className="text-sm h-6 px-1"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  saveRename(sessionItem.id);
                                } else if (e.key === 'Escape') {
                                  setRenamingHistoryId(null);
                                }
                              }}
                              onBlur={() => saveRename(sessionItem.id)}
                              autoFocus
                            />
                          ) : (
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {sessionItem.title}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenamingHistoryId(sessionItem.id);
                              setRenameTitle(sessionItem.title);
                            }}
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(sessionItem.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Center panel - Document Editor with Live Pagination */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-cyan-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 overflow-hidden">
            <ScrollArea className="h-full">
              <div 
                className="flex flex-col items-center py-8 px-4"
                style={{ 
                  minHeight: '100%',
                  background: 'transparent'
                }}
              >
                {/* Render pages with AI glow and proper content distribution */}
                {Array.from({ length: pageCount }, (_, pageIndex) => (
                  <div
                    key={pageIndex}
                    className="bg-white dark:bg-slate-100 shadow-2xl mb-8 relative group hover:shadow-cyan-300/20 transition-all duration-500"
                    style={{
                      width: `${adjustedPageWidth}px`,
                      height: `${adjustedPageHeight}px`,
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(6, 182, 212, 0.1), 0 0 20px rgba(6, 182, 212, 0.05)',
                      minHeight: `${adjustedPageHeight}px`,
                    }}
                  >
                    {/* Page number indicator */}
                    <div className="absolute -top-6 left-0 text-xs text-gray-500 dark:text-gray-400">
                      Page {pageIndex + 1}
                    </div>
                    
                    {/* Page content */}
                    <div
                      className="w-full h-full relative"
                      style={{ 
                        padding: `${padding}px`,
                        overflow: 'hidden'
                      }}
                    >
                      {pageIndex === 0 ? (
                        // Single continuous editor that flows across pages visually
                        <div 
                          className="w-full h-full"
                          style={{
                            maxHeight: 'none',
                            overflow: 'visible'
                          }}
                        >
                          <QuillEditor
                            ref={quillEditorRef}
                            value={editorContent}
                            onChange={handleEditorChange}
                            className="w-full focus:outline-none prose prose-sm max-w-none"
                            style={{
                              fontFamily,
                              fontSize: `${fontSize}pt`,
                              color: textColor,
                              lineHeight: '1.6',
                              minHeight: `${adjustedPageHeight - (padding * 2)}px`,
                            }}
                          />
                        </div>
                      ) : (
                        // Subsequent pages show continuation indicator
                        <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600 italic">
                          <div className="text-center">
                            <div className="w-8 h-8 border-2 border-dashed border-gray-300 rounded-full mb-2 mx-auto"></div>
                            <p className="text-sm">Content continues here...</p>
                          </div>
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

        {/* Right panel - Always-On ChatGPT Interface */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <div className="h-full bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-gray-700 flex flex-col">
            {/* ChatGPT Assistant Header */}
            <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">ChatGPT Assistant</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-light">
                      Always available • {pageCount} pages
                    </p>
                  </div>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="AI Active"></div>
              </div>
            </div>
            
            {/* Chat messages area */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              <div className="space-y-2">
                {chatMessages.map((message: ChatMessage) => (
                  <div key={message.id} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      message.isUser 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <span className="text-xs opacity-70 mt-1 block">
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Chat input */}
            <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex space-x-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Chat with your document..."
                  className="flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (chatInput.trim()) {
                        sendMessageMutation.mutate(chatInput);
                      }
                    }
                  }}
                />
                <Button 
                  onClick={() => {
                    if (chatInput.trim()) {
                      sendMessageMutation.mutate(chatInput);
                    }
                  }}
                  disabled={sendMessageMutation.isPending || !chatInput.trim()}
                  size="sm"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}