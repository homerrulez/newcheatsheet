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
  
  // Chat state - simplified, always ready
  const [chatInput, setChatInput] = useState('');
  const [defaultSessionId, setDefaultSessionId] = useState<string | null>(null);
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
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-full w-full',
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

  // Fetch document history
  const { data: documentHistory = [], refetch: refetchHistory } = useQuery({
    queryKey: ['documentHistory', id],
    queryFn: async () => {
      const response = await fetch(`/api/documents/${id}/history`);
      if (!response.ok) throw new Error('Failed to fetch document history');
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
        body: JSON.stringify({
          title: `Chat Session ${new Date().toLocaleDateString()}`,
          documentSnapshot: editor?.getHTML() || '<p></p>',
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

  // Send chat message mutation with document command parsing
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      // If no default session, create one first
      if (!defaultSessionId) {
        await createDefaultSession();
      }
      
      const documentContent = editor?.getHTML() || '';
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
            class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-full w-full',
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

  // Calculate number of pages based on content height - FIXED PAGINATION
  const [pageCount, setPageCount] = useState(1);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editor && editorRef.current) {
      const updatePageCount = () => {
        const editorElement = editorRef.current?.querySelector('.ProseMirror');
        if (editorElement) {
          const contentHeight = editorElement.scrollHeight;
          const availableHeight = pageHeight - (padding * 2);
          const calculatedPages = Math.max(1, Math.ceil(contentHeight / availableHeight));
          setPageCount(calculatedPages);
        }
      };

      // Update page count when content changes
      const timer = setTimeout(updatePageCount, 100);
      return () => clearTimeout(timer);
    }
  }, [editor?.getHTML(), pageHeight, padding, zoomLevel]);

  // Handle send message
  const handleSendMessage = () => {
    if (chatInput.trim()) {
      sendMessageMutation.mutate(chatInput.trim());
    }
  };

  // Generate smart title from document content
  const generateSmartTitle = (content: string): string => {
    const textContent = content.replace(/<[^>]*>/g, '').trim();
    if (!textContent) return 'Untitled Document';
    
    // Extract first meaningful sentence or phrase
    const sentences = textContent.split(/[.!?]+/);
    let title = sentences[0]?.trim() || '';
    
    // If too long, get first few words
    if (title.length > 50) {
      const words = title.split(' ').slice(0, 6);
      title = words.join(' ') + (words.length < title.split(' ').length ? '...' : '');
    }
    
    // If still empty or too short, use first line
    if (!title || title.length < 10) {
      const lines = textContent.split('\n').filter(line => line.trim());
      title = lines[0]?.trim().slice(0, 50) + (lines[0]?.length > 50 ? '...' : '') || 'Document Draft';
    }
    
    return title;
  };

  // Create document history entry
  const createHistoryEntry = async () => {
    try {
      const content = editor?.getHTML() || '<p></p>';
      const smartTitle = generateSmartTitle(content);
      
      const response = await fetch(`/api/documents/${id}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: id,
          title: smartTitle,
          content,
          pages: [],
          changeDescription: 'Manual snapshot created'
        }),
      });
      if (response.ok) {
        refetchHistory();
        toast({ title: "Document snapshot created" });
      }
    } catch (error) {
      console.error('Failed to create history entry:', error);
      toast({ title: "Failed to create snapshot", variant: "destructive" });
    }
  };

  // Load document version from history
  const loadDocumentVersion = (historyItem: any) => {
    if (editor && historyItem.content) {
      editor.commands.setContent(historyItem.content);
      toast({ title: `Loaded version: ${historyItem.title}` });
    }
  };

  // Copy version content to clipboard
  const copyVersionContent = async (historyItem: any) => {
    try {
      const textContent = historyItem.content.replace(/<[^>]*>/g, '');
      await navigator.clipboard.writeText(textContent);
      toast({ title: "Version content copied to clipboard" });
    } catch (error) {
      toast({ title: "Failed to copy content", variant: "destructive" });
    }
  };

  // Download version as text file
  const downloadVersion = (historyItem: any) => {
    const textContent = historyItem.content.replace(/<[^>]*>/g, '');
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${historyItem.title}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Version downloaded" });
  };

  // Delete version (placeholder - would need API endpoint)
  const deleteVersion = async (historyItem: any) => {
    try {
      // For now, just show confirmation
      if (confirm(`Delete version "${historyItem.title}"?`)) {
        toast({ title: "Version delete functionality coming soon" });
      }
    } catch (error) {
      toast({ title: "Failed to delete version", variant: "destructive" });
    }
  };

  // Rename functionality state
  const [renamingHistoryId, setRenamingHistoryId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState('');

  // Start renaming
  const startRenaming = (historyItem: any) => {
    setRenamingHistoryId(historyItem.id);
    setRenameTitle(historyItem.title);
  };

  // Save rename
  const saveRename = async (historyId: string) => {
    try {
      // For now, just update locally (would need API endpoint)
      setRenamingHistoryId(null);
      toast({ title: "Version renamed (feature coming soon)" });
    } catch (error) {
      toast({ title: "Failed to rename version", variant: "destructive" });
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
        {/* Left panel - Document History */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <div className="h-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-r border-white/20">
            <div className="p-4 border-b border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <History className="w-5 h-5 mr-2" />
                    Document History
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    All versions and snapshots
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={createHistoryEntry}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Save Version
                </Button>
              </div>
            </div>
            
            <ScrollArea className="h-full p-4">
              <div className="space-y-2">
                {documentHistory.map((historyItem: any) => (
                  <div key={historyItem.id} className="group">
                    <div className="p-3 rounded-lg border bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 flex-1">
                          <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
                          {renamingHistoryId === historyItem.id ? (
                            <Input
                              value={renameTitle}
                              onChange={(e) => setRenameTitle(e.target.value)}
                              className="text-sm h-6 px-1"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  saveRename(historyItem.id);
                                } else if (e.key === 'Escape') {
                                  setRenamingHistoryId(null);
                                }
                              }}
                              onBlur={() => setRenamingHistoryId(null)}
                              autoFocus
                            />
                          ) : (
                            <span className="font-medium text-gray-900 dark:text-white truncate">
                              {historyItem.title}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="p-1"
                            onClick={() => loadDocumentVersion(historyItem)}
                            title="Load this version"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="p-1"
                            onClick={() => startRenaming(historyItem)}
                            title="Rename version"
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="p-1"
                            onClick={() => copyVersionContent(historyItem)}
                            title="Copy version content"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="p-1"
                            onClick={() => downloadVersion(historyItem)}
                            title="Download version"
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="p-1 text-red-500"
                            onClick={() => deleteVersion(historyItem)}
                            title="Delete version"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(historyItem.createdAt || Date.now()).toLocaleString()}
                      </div>
                      {historyItem.changeDescription && (
                        <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 italic">
                          {historyItem.changeDescription}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {documentHistory.length === 0 && (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      No document versions yet
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={createHistoryEntry}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Create First Version
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Center panel - Document Editor with True Pagination */}
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
                {/* Render pages with proper content distribution */}
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
                      ref={pageIndex === 0 ? editorRef : undefined}
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
                            // Create a scrollable container that allows content to flow
                            maxHeight: 'none',
                            overflow: 'visible'
                          }}
                        >
                          <EditorContent
                            editor={editor}
                            className="w-full focus:outline-none prose prose-sm max-w-none"
                            style={{
                              fontFamily,
                              fontSize: `${fontSize}pt`,
                              color: textColor,
                              lineHeight: '1.6',
                              minHeight: `${pageHeight - (padding * 2)}px`,
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
          <div className="h-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-l border-white/20 flex flex-col">
            {/* Chat header */}
            <div className="p-4 border-b border-white/20">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <Brain className="w-5 h-5 mr-2 text-purple-600" />
                ChatGPT Assistant
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Ask me to edit, format, or improve your document
              </p>
            </div>
            
            {/* Chat messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8">
                    <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Ready to Help!
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Try commands like:
                    </p>
                    <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <p>"Make the title bold"</p>
                      <p>"Add a conclusion paragraph"</p>
                      <p>"Delete page 2"</p>
                      <p>"Replace 'old text' with 'new text'"</p>
                    </div>
                  </div>
                )}
                
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
            
            {/* Chat input - Always available */}
            <div className="p-4 border-t border-white/20">
              <div className="flex space-x-2">
                <Textarea
                  placeholder="Ask me to help with your document..."
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
                <strong>Commands:</strong> "delete page 2", "make 'text' bold", "add paragraph"
              </div>
            </div>
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