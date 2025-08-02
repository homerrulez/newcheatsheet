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
  Brain, Sparkles, Command, ChevronDown, ChevronRight,
  Strikethrough, Scissors, ClipboardPaste, Minus,
  Indent, Outdent, Layout, Image, Table, Link, Settings, X
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Document, ChatSession, ChatMessage, DocumentCommand } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { LayoutEngine, createLayoutEngine } from '@/lib/layout-engine';
import { DocumentCommandInterface, createDocumentInterface } from '@/lib/document-commands';

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
  const [pageOrientation, setPageOrientation] = useState('portrait');
  
  // Layout engine integration
  const [layoutEngine, setLayoutEngine] = useState<LayoutEngine>(() => 
    createLayoutEngine(pageSize, fontSize)
  );
  const [documentInterface, setDocumentInterface] = useState<DocumentCommandInterface>(() => 
    createDocumentInterface('', pageSize, fontSize)
  );
  const [pageMetrics, setPageMetrics] = useState(() => 
    layoutEngine.getCurrentMetrics()
  );
  
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

  // Create new chat session
  const createNewChatSession = async () => {
    try {
      const content = editor?.getHTML() || '<p></p>';
      const smartTitle = generateSmartTitle(content);
      
      const response = await fetch(`/api/documents/${id}/chat-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: smartTitle,
          documentSnapshot: content,
        }),
      });
      if (response.ok) {
        const newSession = await response.json();
        setDefaultSessionId(newSession.id);
        refetchSessions();
        toast({ title: "New chat session created" });
      }
    } catch (error) {
      console.error('Failed to create chat session:', error);
      toast({ title: "Failed to create chat session", variant: "destructive" });
    }
  };

  // Load document version from history
  const loadDocumentVersion = (historyItem: any) => {
    if (editor && historyItem.content) {
      editor.commands.setContent(historyItem.content);
      toast({ title: `Loaded version: ${historyItem.title}` });
    }
  };

  // Share chat session
  const shareSession = async (sessionItem: any) => {
    try {
      const shareUrl = `${window.location.origin}/document/${id}/chat/${sessionItem.id}`;
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Share link copied to clipboard" });
    } catch (error) {
      toast({ title: "Failed to copy share link", variant: "destructive" });
    }
  };

  // Download version as text file
  const downloadVersion = (historyItem: any) => {
    const textContent = historyItem.content.replace(/<[^>]*>/g, '');
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${historyItem.title}.txt`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Version downloaded" });
  };

  // Delete chat session
  const deleteSession = async (sessionItem: any) => {
    try {
      if (confirm(`Delete chat session "${sessionItem.title}"?`)) {
        const response = await fetch(`/api/chat-sessions/${sessionItem.id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          if (defaultSessionId === sessionItem.id) {
            setDefaultSessionId(null);
          }
          refetchSessions();
          toast({ title: "Chat session deleted" });
        }
      }
    } catch (error) {
      toast({ title: "Failed to delete session", variant: "destructive" });
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
  const saveRename = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat-sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: renameTitle }),
      });
      if (response.ok) {
        setRenamingHistoryId(null);
        refetchSessions();
        toast({ title: "Chat session renamed" });
      }
    } catch (error) {
      toast({ title: "Failed to rename session", variant: "destructive" });
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
      {/* Enhanced Microsoft Word-Style Toolbar */}
      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-b border-white/20">
        {/* Document title bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{document?.title || 'Document'}</h1>
          </div>
          <Button variant="outline" size="sm">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>



        {/* Main toolbar content - 2 lines */}
        <div className="p-3 space-y-3">
          {/* First toolbar line */}
          <div className="flex items-center space-x-4 overflow-x-auto">
            {/* File operations */}
            <div className="flex items-center space-x-2 border-r border-gray-300 pr-4">
              <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText('')}>
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </Button>
              <Button size="sm" variant="outline">
                <Scissors className="w-4 h-4 mr-1" />
                Cut
              </Button>
              <Button size="sm" variant="outline">
                <ClipboardPaste className="w-4 h-4 mr-1" />
                Paste
              </Button>
              <Button size="sm" variant="outline">
                <Undo2 className="w-4 h-4 mr-1" />
                Undo
              </Button>
              <Button size="sm" variant="outline">
                <Redo2 className="w-4 h-4 mr-1" />
                Redo
              </Button>
            </div>

            {/* Font controls */}
            <div className="flex items-center space-x-2 border-r border-gray-300 pr-4">
              <Select value={fontFamily} onValueChange={setFontFamily}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                  <SelectItem value="Arial">Arial</SelectItem>
                  <SelectItem value="Calibri">Calibri</SelectItem>
                  <SelectItem value="Georgia">Georgia</SelectItem>
                  <SelectItem value="Verdana">Verdana</SelectItem>
                  <SelectItem value="Helvetica">Helvetica</SelectItem>
                  <SelectItem value="Courier New">Courier New</SelectItem>
                  <SelectItem value="Comic Sans MS">Comic Sans MS</SelectItem>
                  <SelectItem value="Impact">Impact</SelectItem>
                  <SelectItem value="Trebuchet MS">Trebuchet MS</SelectItem>
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
                  <SelectItem value="22">22</SelectItem>
                  <SelectItem value="24">24</SelectItem>
                  <SelectItem value="26">26</SelectItem>
                  <SelectItem value="28">28</SelectItem>
                  <SelectItem value="36">36</SelectItem>
                  <SelectItem value="48">48</SelectItem>
                  <SelectItem value="72">72</SelectItem>
                </SelectContent>
              </Select>
              
              <Button size="sm" variant="outline" onClick={() => setFontSize(Math.min(72, fontSize + 2))}>
                <Plus className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setFontSize(Math.max(8, fontSize - 2))}>
                <Minus className="w-3 h-3" />
              </Button>
            </div>

            {/* Text formatting */}
            <div className="flex items-center space-x-1 border-r border-gray-300 pr-4">
              <Button
                size="sm"
                variant={editor?.isActive('bold') ? 'default' : 'outline'}
                onClick={() => editor?.chain().focus().toggleBold().run()}
              >
                <Bold className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={editor?.isActive('italic') ? 'default' : 'outline'}
                onClick={() => editor?.chain().focus().toggleItalic().run()}
              >
                <Italic className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={editor?.isActive('underline') ? 'default' : 'outline'}
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
              >
                <UnderlineIcon className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={editor?.isActive('strike') ? 'default' : 'outline'}
                onClick={() => editor?.chain().focus().toggleStrike().run()}
              >
                <Strikethrough className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" title="Subscript">
                <span className="text-xs">X₂</span>
              </Button>
              <Button size="sm" variant="outline" title="Superscript">
                <span className="text-xs">X²</span>
              </Button>
              <div className="w-8 h-6 bg-yellow-200 border rounded cursor-pointer" title="Highlight"></div>
              <div className="w-8 h-6 bg-black border rounded cursor-pointer" title="Font Color"></div>
            </div>

            {/* Text alignment */}
            <div className="flex items-center space-x-1 border-r border-gray-300 pr-4">
              <Button
                size="sm"
                variant={editor?.isActive({ textAlign: 'left' }) ? 'default' : 'outline'}
                onClick={() => editor?.chain().focus().setTextAlign('left').run()}
              >
                <AlignLeft className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={editor?.isActive({ textAlign: 'center' }) ? 'default' : 'outline'}
                onClick={() => editor?.chain().focus().setTextAlign('center').run()}
              >
                <AlignCenter className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={editor?.isActive({ textAlign: 'right' }) ? 'default' : 'outline'}
                onClick={() => editor?.chain().focus().setTextAlign('right').run()}
              >
                <AlignRight className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={editor?.isActive({ textAlign: 'justify' }) ? 'default' : 'outline'}
                onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
              >
                <AlignJustify className="w-4 h-4" />
              </Button>
            </div>

            {/* Lists and indentation */}
            <div className="flex items-center space-x-1">
              <Button
                size="sm"
                variant={editor?.isActive('bulletList') ? 'default' : 'outline'}
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={editor?.isActive('orderedList') ? 'default' : 'outline'}
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              >
                <ListOrdered className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" title="Increase Indent">
                <Indent className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" title="Decrease Indent">
                <Outdent className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Second toolbar line */}
          <div className="flex items-center space-x-4 overflow-x-auto">

            {/* Page Layout Controls */}
            <div className="flex items-center space-x-2 border-r border-gray-300 pr-4">
              <Select value={pageSize} onValueChange={(value: keyof typeof PAGE_SIZES) => {
                setPageSize(value);
                // Auto-scale font size based on page size change
                const scaledFontSize = layoutEngine.getScaledFontSize();
                if (scaledFontSize !== fontSize) {
                  setFontSize(scaledFontSize);
                }
                // Update layout engine with new page size
                const newLayoutEngine = createLayoutEngine(value, fontSize);
                setLayoutEngine(newLayoutEngine);
                setPageMetrics(newLayoutEngine.getCurrentMetrics());
              }}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Page Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="letter">Letter (8.5" × 11")</SelectItem>
                  <SelectItem value="legal">Legal (8.5" × 14")</SelectItem>
                  <SelectItem value="a4">A4 (8.27" × 11.69")</SelectItem>
                  <SelectItem value="a3">A3 (11.69" × 16.54")</SelectItem>
                  <SelectItem value="tabloid">Tabloid (11" × 17")</SelectItem>
                  <SelectItem value="executive">Executive (7.25" × 10.5")</SelectItem>
                  <SelectItem value="ledger">Ledger (17" × 11")</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={pageOrientation} onValueChange={setPageOrientation}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">Portrait</SelectItem>
                  <SelectItem value="landscape">Landscape</SelectItem>
                </SelectContent>
              </Select>
              
              <Button size="sm" variant="outline">
                <Layout className="w-4 h-4 mr-1" />
                Margins
              </Button>
              
              {/* Page Metrics Display */}
              <div className="text-xs text-gray-500 dark:text-gray-400 px-2 border-l border-gray-300">
                <div>{pageMetrics.charactersPerLine} chars/line</div>
                <div>{pageMetrics.linesPerPage} lines/page</div>
              </div>
            </div>

            {/* Insert options */}
            <div className="flex items-center space-x-1 border-r border-gray-300 pr-4">
              <Button size="sm" variant="outline">
                <Image className="w-4 h-4 mr-1" />
                Image
              </Button>
              <Button size="sm" variant="outline">
                <Table className="w-4 h-4 mr-1" />
                Table
              </Button>
              <Button size="sm" variant="outline">
                <Link className="w-4 h-4 mr-1" />
                Link
              </Button>
              <Button size="sm" variant="outline">
                <FileText className="w-4 h-4 mr-1" />
                Page Break
              </Button>
            </div>

            {/* Zoom controls */}
            <div className="flex items-center space-x-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setZoomLevel(Math.max(25, zoomLevel - 25))}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium w-16 text-center">{zoomLevel}%</span>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Select value={zoomLevel.toString()} onValueChange={(value) => setZoomLevel(parseInt(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50%</SelectItem>
                  <SelectItem value="75">75%</SelectItem>
                  <SelectItem value="100">100%</SelectItem>
                  <SelectItem value="125">125%</SelectItem>
                  <SelectItem value="150">150%</SelectItem>
                  <SelectItem value="200">200%</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                            <span className="font-medium text-gray-900 dark:text-white truncate">
                              {sessionItem.title}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="p-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              startRenaming(sessionItem);
                            }}
                            title="Rename session"
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="p-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              shareSession(sessionItem);
                            }}
                            title="Share session link"
                          >
                            <Share className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="p-1 text-red-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSession(sessionItem);
                            }}
                            title="Delete session"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(sessionItem.createdAt || Date.now()).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {chatSessions.length === 0 && (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      No chat sessions yet
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={createNewChatSession}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Create First Chat
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
            {/* ChatGPT Assistant - Always at top */}
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-lg border border-white/20 p-4 m-4 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">ChatGPT Assistant</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Always available • {pageCount} pages
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Chat messages area - Proper height */}
              <div className="mb-4">
                <ScrollArea className="h-[45rem] border rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                  <div className="space-y-2">
                    {chatMessages.length === 0 && (
                      <div className="text-center py-8">
                        <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                          Ready to Help!
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Try natural language requests:
                        </p>
                        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                          <p>"create a title about Ali and make it adventurous"</p>
                          <p>"make the text bold"</p>
                          <p>"add a paragraph about nature"</p>
                        </div>
                      </div>
                    )}
                    
                    {chatMessages.map((message: ChatMessage) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] p-3 rounded-lg text-sm ${
                            message.role === 'user'
                              ? 'bg-blue-500 text-white'
                              : 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white border shadow-sm'
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              
              {/* Chat input - Always visible */}
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Textarea
                    placeholder="Ask me to help with your document..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 min-h-[60px] max-h-[60px] resize-none text-sm"
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
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 self-end"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Try: "create a title", "make text bold", "add paragraph"
                </p>
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