import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import StandaloneDocumentEngine from '@/components/standalone-document-engine';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Textarea } from '@/components/ui/textarea';
import { 
  Save, FileText, Bold, Italic, Underline as UnderlineIcon, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, ZoomIn, ZoomOut, Printer, Type, Palette, 
  Undo2, Redo2, History, MessageSquare, Plus, Clock, Send,
  Edit3, Share, Trash2, Copy, Download, Eye, MoreVertical,
  Brain, Sparkles, Command, ChevronDown, ChevronRight,
  Strikethrough, Scissors, ClipboardPaste, Minus,
  Indent, Outdent, Layout, Image, Table, Link, Settings, X, Wand2
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Document, ChatSession, ChatMessage } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

export default function DocumentWorkspace() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Document state
  const [zoomLevel, setZoomLevel] = useState(100);
  const [fontSize, setFontSize] = useState(12);
  const [fontFamily, setFontFamily] = useState('Times New Roman');
  const [textColor, setTextColor] = useState('#000000');
  const [documentContent, setDocumentContent] = useState('');
  const [documentStats, setDocumentStats] = useState({ 
    wordCount: 0, 
    charCount: 0, 
    lineCount: 0, 
    pageCount: 1 
  });
  
  // AI Improve state
  const [isAiImproving, setIsAiImproving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved');
  
  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [defaultSessionId, setDefaultSessionId] = useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

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

  // Create default chat session automatically
  const createDefaultSession = async () => {
    try {
      const response = await fetch(`/api/documents/${id}/chat-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Chat Session' }),
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

  // Save document mutation
  const saveDocumentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest('PATCH', `/api/documents/${id}`, {
        content: content,
        title: document?.title || 'Untitled Document',
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] });
      setAutoSaveStatus('saved');
    },
  });

  // Send chat message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!defaultSessionId) {
        await createDefaultSession();
      }
      
      const response = await fetch(`/api/chat-sessions/${defaultSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: message, 
          documentContent: documentContent,
          documentId: id 
        }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: (response: any) => {
      refetchMessages();
      setChatInput('');
      
      // Insert text response into document if it's content
      if (response.insertText && window.standaloneDocumentAPI) {
        window.standaloneDocumentAPI.insertText(response.insertText);
      }
    },
  });

  // AI Improve functionality
  const aiImproveMutation = useMutation({
    mutationFn: async () => {
      if (!documentContent.trim()) throw new Error('No content to improve');

      const response = await apiRequest('POST', '/api/ai/improve-content', {
        content: documentContent,
        documentId: id,
        instruction: 'Improve this content while maintaining its structure and meaning. Focus on clarity, grammar, and readability.'
      });
      return await response.json();
    },
    onMutate: () => {
      setIsAiImproving(true);
    },
    onSuccess: (response: any) => {
      if (response.improvedContent && window.standaloneDocumentAPI) {
        window.standaloneDocumentAPI.setContent(response.improvedContent);
        toast({ title: "Content improved by AI", description: "Your document has been enhanced for clarity and readability." });
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "AI Improve failed", 
        description: error.message || "Please try again later.", 
        variant: "destructive" 
      });
    },
    onSettled: () => {
      setIsAiImproving(false);
    },
  });

  // Auto-save functionality
  const debouncedSave = useCallback(() => {
    if (documentContent && id) {
      setAutoSaveStatus('saving');
      const timeoutId = setTimeout(() => {
        saveDocumentMutation.mutate(documentContent);
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [documentContent, id, saveDocumentMutation]);

  useEffect(() => {
    const cleanup = debouncedSave();
    return cleanup;
  }, [debouncedSave]);

  // Handle document data updates from the engine
  const handleDocumentDataUpdate = useCallback((data: any) => {
    setDocumentContent(data.content);
    setDocumentStats({
      wordCount: data.stats.wordCount,
      charCount: data.stats.charCount,
      lineCount: data.stats.lineCount,
      pageCount: data.stats.pageCount
    });
  }, []);

  // Set initial content when document loads
  useEffect(() => {
    if (document?.content && window.standaloneDocumentAPI) {
      window.standaloneDocumentAPI.setContent(document.content);
    }
  }, [document?.content]);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(chatInput);
    }
  };

  // Toolbar functions
  const handlePrint = () => {
    if (window.standaloneDocumentAPI) {
      window.standaloneDocumentAPI.print();
    }
  };

  const handleSave = () => {
    if (documentContent) {
      saveDocumentMutation.mutate(documentContent);
    }
  };

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(45deg, #FFB6C1 0%, #87CEEB 100%)'
    }}>
      {/* Header with Microsoft Word-style toolbar */}
      <div className="bg-white/90 backdrop-blur-sm shadow-lg border-b border-white/20">
        <div className="px-4 py-2">
          {/* First toolbar line */}
          <div className="flex items-center justify-between space-x-3 overflow-x-auto">
            {/* File operations */}
            <div className="flex items-center space-x-1 border-r border-gray-400 dark:border-gray-500 pr-3">
              <button 
                className="px-3 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700"
                onClick={() => window.location.href = '/documents'}
              >
                <FileText className="w-6 h-6 text-blue-600" />
              </button>
              <button 
                className="px-3 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700"
                onClick={handleSave}
                disabled={saveDocumentMutation.isPending}
              >
                <Save className="w-6 h-6 text-green-600" />
              </button>
              <button 
                className="px-3 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700"
                onClick={handlePrint}
              >
                <Printer className="w-6 h-6 text-orange-600" />
              </button>
            </div>

            {/* Font controls */}
            <div className="flex items-center space-x-2 border-r border-gray-400 dark:border-gray-500 pr-3">
              <Select value={fontFamily} onValueChange={setFontFamily}>
                <SelectTrigger className="w-36 border-none bg-transparent hover:bg-gray-100 text-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                  <SelectItem value="Arial">Arial</SelectItem>
                  <SelectItem value="Helvetica">Helvetica</SelectItem>
                  <SelectItem value="Georgia">Georgia</SelectItem>
                  <SelectItem value="Verdana">Verdana</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={fontSize.toString()} onValueChange={(value) => setFontSize(parseInt(value))}>
                <SelectTrigger className="w-16 border-none bg-transparent hover:bg-gray-100 text-gray-700">
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
                  <SelectItem value="36">36</SelectItem>
                  <SelectItem value="48">48</SelectItem>
                  <SelectItem value="72">72</SelectItem>
                </SelectContent>
              </Select>
              
              <button 
                className="px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700 disabled:opacity-50"
                onClick={() => setFontSize(Math.min(72, fontSize + 2))}
                disabled={fontSize >= 72}
              >
                <Plus className="w-5 h-5 text-blue-600" />
              </button>
              <button 
                className="px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700 disabled:opacity-50"
                onClick={() => setFontSize(Math.max(8, fontSize - 2))}
                disabled={fontSize <= 8}
              >
                <Minus className="w-5 h-5 text-blue-600" />
              </button>
            </div>

            {/* Text formatting */}
            <div className="flex items-center space-x-1 border-r border-gray-400 dark:border-gray-500 pr-3">
              <button className="px-2 py-1 rounded transition-colors hover:bg-gray-100 text-gray-700">
                <Bold className="w-6 h-6 text-blue-600 font-bold" />
              </button>
              <button className="px-2 py-1 rounded transition-colors hover:bg-gray-100 text-gray-700">
                <Italic className="w-6 h-6 text-blue-600" />
              </button>
              <button className="px-2 py-1 rounded transition-colors hover:bg-gray-100 text-gray-700">
                <UnderlineIcon className="w-6 h-6 text-blue-600" />
              </button>
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-8 h-6 border rounded cursor-pointer"
                title="Font Color"
              />
            </div>

            {/* Text alignment */}
            <div className="flex items-center space-x-1 border-r border-gray-400 dark:border-gray-500 pr-3">
              <button className="px-2 py-1 rounded transition-colors hover:bg-gray-100 text-gray-700">
                <AlignLeft className="w-6 h-6 text-green-600" />
              </button>
              <button className="px-2 py-1 rounded transition-colors hover:bg-gray-100 text-gray-700">
                <AlignCenter className="w-6 h-6 text-green-600" />
              </button>
              <button className="px-2 py-1 rounded transition-colors hover:bg-gray-100 text-gray-700">
                <AlignRight className="w-6 h-6 text-green-600" />
              </button>
              <button className="px-2 py-1 rounded transition-colors hover:bg-gray-100 text-gray-700">
                <AlignJustify className="w-6 h-6 text-green-600" />
              </button>
            </div>

            {/* Lists */}
            <div className="flex items-center space-x-1">
              <button className="px-2 py-1 rounded transition-colors hover:bg-gray-100 text-gray-700">
                <List className="w-6 h-6 text-purple-600" />
              </button>
              <button className="px-2 py-1 rounded transition-colors hover:bg-gray-100 text-gray-700">
                <ListOrdered className="w-6 h-6 text-purple-600" />
              </button>
            </div>

            {/* AI Tools */}
            <div className="flex items-center space-x-2 ml-auto">
              <Button
                onClick={() => aiImproveMutation.mutate()}
                disabled={isAiImproving || !documentContent.trim()}
                className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
                size="sm"
              >
                {isAiImproving ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Wand2 className="w-4 h-4 mr-1" />
                )}
                AI Improve
              </Button>
            </div>
          </div>

          {/* Second toolbar line */}
          <div className="flex items-center justify-center space-x-3 overflow-x-auto px-4">
            <div className="flex items-center space-x-2 border-r border-gray-300 pr-4">
              <span className="text-sm text-gray-700">{document?.title || 'New Document'}</span>
              <span className="text-xs text-gray-500">
                {documentStats.wordCount} words, {documentStats.pageCount} pages
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left panel - Document History */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <div className="h-full shadow-lg border-r border-white/20" style={{
            background: 'white'
          }}>
            <div className="p-4 border-b border-white/20">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <History className="w-5 h-5 mr-2" />
                Chat History
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                AI conversations about this document
              </p>
            </div>
            
            <ScrollArea className="h-full p-4">
              <div className="space-y-2">
                {chatMessages.map((message: ChatMessage) => (
                  <div key={message.id} className="p-3 rounded-lg border bg-white/50 border-white/30">
                    <div className="flex items-start space-x-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                        {message.role === 'user' ? '👤' : '🤖'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-700">{message.content}</p>
                        <span className="text-xs text-gray-500">
                          {new Date(message.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Center panel - Document Editor */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full bg-gray-100">
            <StandaloneDocumentEngine
              onDataUpdate={handleDocumentDataUpdate}
              initialContent={document?.content}
              className="h-full"
            />
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Right panel - AI Chat */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <div className="h-full shadow-lg border-l border-white/20" style={{
            background: 'white'
          }}>
            <div className="p-4 border-b border-white/20">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Brain className="w-5 h-5 mr-2" />
                ChatGPT
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Get AI help with your document
              </p>
            </div>
            
            <div className="h-full flex flex-col">
              <div className="flex-1 p-4">
                <div className="space-y-4">
                  <form onSubmit={handleChatSubmit} className="space-y-2">
                    <Textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask ChatGPT about your document..."
                      className="min-h-[100px] resize-none"
                      disabled={sendMessageMutation.isPending}
                    />
                    <Button 
                      type="submit" 
                      disabled={!chatInput.trim() || sendMessageMutation.isPending}
                      className="w-full"
                    >
                      {sendMessageMutation.isPending ? (
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Send Message
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}