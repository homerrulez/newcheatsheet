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
import Highlight from '@tiptap/extension-highlight';

// Custom FontSize extension
const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      fontSize: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.fontSize?.replace('pt', ''),
        renderHTML: (attributes: any) => {
          if (!attributes.fontSize) return {}
          return { style: `font-size: ${attributes.fontSize}pt` }
        },
      }
    }
  }
});
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
  Indent, Outdent, Layout, Image, Table, Link, Settings, X, Wand2
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
  'a3': { width: 1123, height: 1587, name: 'A3 (11.69" × 16.54")' },
  'tabloid': { width: 1056, height: 1632, name: 'Tabloid (11" × 17")' },
  'executive': { width: 696, height: 1008, name: 'Executive (7.25" × 10.5")' },
  'ledger': { width: 1632, height: 1056, name: 'Ledger (17" × 11")' },
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
  
  // Ruler and margin states for Word-style functionality
  const [leftMargin, setLeftMargin] = useState(96); // 1 inch in pixels at 96 DPI
  const [rightMargin, setRightMargin] = useState(96); // 1 inch in pixels
  const [topMargin, setTopMargin] = useState(96); // 1 inch in pixels
  const [bottomMargin, setBottomMargin] = useState(96); // 1 inch in pixels
  const [paragraphIndent, setParagraphIndent] = useState(0); // First line indent
  const [hangingIndent, setHangingIndent] = useState(0); // Left indent for continuing lines
  const [rulerUnit, setRulerUnit] = useState<'inches' | 'cm'>('inches');
  const [isDraggingMarker, setIsDraggingMarker] = useState<string | null>(null);
  
  // AI Improve state
  const [isAiImproving, setIsAiImproving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved'); // 'saving' | 'saved' | 'error'
  const [documentStats, setDocumentStats] = useState({ words: 0, readTime: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  
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
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Highlight.configure({
        multicolor: true,
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
      
      // Execute document commands if any (now supporting multiple commands)
      if (response.documentCommands && Array.isArray(response.documentCommands)) {
        response.documentCommands.forEach((command: DocumentCommand) => {
          executeDocumentCommand(command);
        });
      } else if (response.documentCommand) {
        // Backwards compatibility for single command
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
        
      case 'center_text':
        const { text: centerText } = command.params;
        if (centerText) {
          // Find and center the specific text using Tiptap commands
          const content = editor.getHTML();
          if (content.includes(centerText)) {
            // Use Tiptap's search and select functionality
            const doc = editor.state.doc;
            let found = false;
            
            doc.descendants((node, pos) => {
              if (found) return false;
              
              if (node.isText && node.text && node.text.includes(centerText)) {
                const textStart = pos + node.text.indexOf(centerText);
                const textEnd = textStart + centerText.length;
                
                // Select the text and center it
                editor.chain()
                  .focus()
                  .setTextSelection({ from: textStart, to: textEnd })
                  .setTextAlign('center')
                  .run();
                
                found = true;
                return false;
              }
            });
            
            toast({ title: `Centered text: "${centerText}"` });
          }
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
          // Check if the content is already HTML formatted
          const isHTML = addText.includes('<') && addText.includes('>');
          const contentToAdd = isHTML ? addText : `<p>${addText}</p>`;
          
          if (position === 'end') {
            editor.commands.focus('end');
            editor.commands.insertContent(contentToAdd);
          } else if (position === 'start') {
            editor.commands.focus('start');
            editor.commands.insertContent(contentToAdd);
          } else {
            editor.commands.focus();
            editor.commands.insertContent(contentToAdd);
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
        
      case 'delete_text':
        const { text: deleteText } = command.params;
        if (deleteText) {
          const content = editor.getHTML();
          const updatedContent = content.replace(new RegExp(deleteText, 'gi'), '');
          editor.commands.setContent(updatedContent);
          toast({ title: `Deleted text: "${deleteText}"` });
        }
        break;
        
      case 'clear_all':
        editor.commands.clearContent();
        toast({ title: "Document cleared" });
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

  // Calculate page metrics - with error protection
  const currentPageSize = PAGE_SIZES[pageSize] || PAGE_SIZES.letter;
  // Swap dimensions for landscape orientation
  let baseWidth = currentPageSize.width;
  let baseHeight = currentPageSize.height;
  if (pageOrientation === 'landscape') {
    [baseWidth, baseHeight] = [baseHeight, baseWidth];
  }
  const pageWidth = baseWidth * (zoomLevel / 100);
  const pageHeight = baseHeight * (zoomLevel / 100);
  const padding = 64 * (zoomLevel / 100); // 64px padding scaled with zoom

  // True Content Distribution using Layout Engine
  const [pageContent, setPageContent] = useState<Array<{ pageNumber: number; content: string; wordCount: number; characterCount: number; isFull: boolean }>>([
    { pageNumber: 1, content: '', wordCount: 0, characterCount: 0, isFull: false }
  ]);
  const editorRef = useRef<HTMLDivElement>(null);

  // Content distribution effect - splits content across real pages
  useEffect(() => {
    if (editor && layoutEngine) {
      const distributeContent = () => {
        const htmlContent = editor.getHTML();
        
        // Use layout engine to split content into pages
        const layoutResult = layoutEngine.LAYOUT_TEXT(htmlContent);
        
        if (layoutResult.pages.length > 0) {
          setPageContent(layoutResult.pages);
        } else {
          // Fallback: single empty page
          setPageContent([{ pageNumber: 1, content: '', wordCount: 0, characterCount: 0, isFull: false }]);
        }
      };

      // Distribute content when it changes
      const timer = setTimeout(distributeContent, 100);
      return () => clearTimeout(timer);
    }
  }, [editor?.getHTML(), layoutEngine, pageHeight, padding, zoomLevel]);

  // Page count is now derived from distributed content
  const derivedPageCount = pageContent.length;

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

  // AI Improve functionality
  const aiImproveMutation = useMutation({
    mutationFn: async () => {
      if (!editor || !id) throw new Error('Editor or document ID not available');
      
      const content = editor.getHTML();
      if (!content.trim()) throw new Error('No content to improve');

      const response = await apiRequest('/api/ai/improve-content', {
        method: 'POST',
        body: JSON.stringify({
          content,
          documentId: id,
          instruction: 'Improve this content while maintaining its structure and meaning. Focus on clarity, grammar, and readability.'
        }),
      });
      return response;
    },
    onMutate: () => {
      setIsAiImproving(true);
    },
    onSuccess: (response: any) => {
      if (response.improvedContent && editor) {
        editor.commands.setContent(response.improvedContent);
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

  // Calculate document statistics
  useEffect(() => {
    if (!editor) return;
    
    const updateStats = () => {
      const text = editor.getText();
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const readTime = Math.max(1, Math.ceil(words / 200)); // 200 words per minute
      setDocumentStats({ words, readTime });
    };

    updateStats();
    const interval = setInterval(updateStats, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, [editor]);

  if (documentLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: 'linear-gradient(to bottom, #fbe8f0 0%, #f5e1f6 25%, #f3f2fb 50%, #f0f8ff 75%, #d7f1fb 90%, #c9eaf4 100%)' }}>
      
      {/* Enhanced Microsoft Word-Style Toolbar with Soft Blue Background */}
      <div className="border-b border-pink-200/30 flex-shrink-0" style={{ 
        background: 'linear-gradient(to right, #fcf2f7 0%, #f9f1f8 25%, #f8f4fc 50%, #f5f9ff 75%, #eef8fd 100%)',
        boxShadow: '0 4px 16px rgba(255, 255, 255, 0.6) inset, 0 2px 8px rgba(0, 0, 0, 0.05)'
      }}>



        {/* Main toolbar content - 2 lines */}
        <div className="p-3 space-y-3">
          {/* First toolbar line */}
          <div className="flex items-center justify-center space-x-3 overflow-x-auto px-4">
            {/* AI Features - First section */}
            <div className="flex items-center space-x-2 border-r border-gray-400 dark:border-gray-500 pr-3">
              <button className="flex items-center space-x-1 px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700">
                <Type className="w-4 h-4 text-blue-600" />
                <span className="text-xs">{documentStats.words} words</span>
              </button>
              <button className="flex items-center space-x-1 px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700">
                <Clock className="w-4 h-4 text-green-600" />
                <span className="text-xs">{documentStats.readTime} min</span>
              </button>
              <button 
                onClick={async () => {
                  if (!document?.content || document.content.trim().length === 0) {
                    toast({
                      title: "No content to adjust",
                      description: "Please add some text to your document first.",
                    });
                    return;
                  }
                  
                  try {
                    const response = await fetch('/api/ai/adjust-tone', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        content: document.content,
                        targetTone: 'professional',
                        preserveEquations: true 
                      })
                    });
                    
                    if (!response.ok) throw new Error('AI service unavailable');
                    
                    const { adjustedContent } = await response.json();
                    await updateDocumentMutation.mutateAsync({ content: adjustedContent });
                    
                    toast({
                      title: "Tone adjusted!",
                      description: "Your writing tone has been made more professional while preserving technical content.",
                    });
                  } catch (error) {
                    toast({
                      title: "Tone adjustment failed",
                      description: "Please try again or check your connection.",
                      variant: "destructive"
                    });
                  }
                }}
                className="flex items-center space-x-1 px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700"
              >
                <span className="w-4 h-4 text-center">🎭</span>
                <span className="text-xs">Tone</span>
              </button>
            </div>

            {/* File operations */}
            <div className="flex items-center space-x-2 border-r border-gray-400 dark:border-gray-500 pr-3">
              <button 
                className="flex items-center space-x-1 px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700"
                onClick={() => {
                  if (!editor) {
                    toast({ title: "Editor not ready", variant: "destructive" });
                    return;
                  }
                  try {
                    const content = editor.getHTML() || '';
                    navigator.clipboard.writeText(content);
                    toast({ title: "Content copied to clipboard" });
                  } catch (error) {
                    toast({ title: "Copy failed", description: "Please use Ctrl+C", variant: "destructive" });
                  }
                }}
              >
                <Copy className="w-4 h-4 text-orange-500" />
                <span className="text-xs">Copy</span>
              </button>
              <button 
                className="flex items-center space-x-1 px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700"
                onClick={() => {
                  if (!editor) {
                    toast({ title: "Editor not ready", variant: "destructive" });
                    return;
                  }
                  try {
                    // If no selection, select all
                    if (editor.state.selection.empty) {
                      editor.chain().focus().selectAll().run();
                    }
                    
                    const content = editor.getHTML() || '';
                    navigator.clipboard.writeText(content);
                    editor.chain().focus().deleteSelection().run();
                    toast({ title: "Content cut to clipboard" });
                  } catch (error) {
                    toast({ title: "Cut failed", description: "Please use Ctrl+X", variant: "destructive" });
                  }
                }}
              >
                <Scissors className="w-4 h-4 text-red-500" />
                <span className="text-xs">Cut</span>
              </button>
              <button 
                className="flex items-center space-x-1 px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    editor?.chain().focus().insertContent(text).run();
                    toast({ title: "Content pasted" });
                  } catch (err) {
                    toast({ title: "Paste failed", description: "Please use Ctrl+V instead", variant: "destructive" });
                  }
                }}
              >
                <ClipboardPaste className="w-4 h-4 text-green-500" />
                <span className="text-xs">Paste</span>
              </button>
              <button 
                className="flex items-center space-x-1 px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700 disabled:opacity-50"
                onClick={() => editor?.chain().focus().undo().run()}
                disabled={!editor?.can().undo()}
              >
                <Undo2 className="w-4 h-4 text-blue-500" />
                <span className="text-xs">Undo</span>
              </button>
              <button 
                className="flex items-center space-x-1 px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700 disabled:opacity-50"
                onClick={() => editor?.chain().focus().redo().run()}
                disabled={!editor?.can().redo()}
              >
                <Redo2 className="w-4 h-4 text-blue-500" />
                <span className="text-xs">Redo</span>
              </button>
            </div>

            {/* Font controls */}
            <div className="flex items-center space-x-2 border-r border-gray-400 dark:border-gray-500 pr-3">
              <Select 
                value={fontFamily} 
                onValueChange={(value) => {
                  if (editor) {
                    const { selection } = editor.state;
                    if (!selection.empty) {
                      // Apply font family to selected text only
                      editor.chain().focus().setFontFamily(value).run();
                      toast({ title: `Font changed to ${value} for selected text` });
                    } else {
                      toast({ title: "Please select text to change font family" });
                    }
                  }
                }}
              >
                <SelectTrigger className="w-36 border-none bg-transparent hover:bg-gray-100 text-gray-700">
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
              
              <Select 
                value={fontSize.toString()} 
                onValueChange={(value) => {
                  const newSize = parseInt(value);
                  if (!isNaN(newSize) && newSize >= 8 && newSize <= 72) {
                    if (editor) {
                      const { selection } = editor.state;
                      if (!selection.empty) {
                        // Apply size to selected text only using custom FontSize extension
                        editor.chain().focus().setMark('textStyle', { fontSize: newSize.toString() }).run();
                        toast({ title: `Font size changed to ${newSize}pt for selected text` });
                      } else {
                        toast({ title: "Please select text to change font size" });
                      }
                    }
                  }
                }}
              >
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
                  <SelectItem value="22">22</SelectItem>
                  <SelectItem value="24">24</SelectItem>
                  <SelectItem value="26">26</SelectItem>
                  <SelectItem value="28">28</SelectItem>
                  <SelectItem value="36">36</SelectItem>
                  <SelectItem value="48">48</SelectItem>
                  <SelectItem value="72">72</SelectItem>
                </SelectContent>
              </Select>
              
              <button 
                className="px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700 disabled:opacity-50"
                onClick={() => {
                  const newSize = Math.min(72, fontSize + 2);
                  
                  if (editor) {
                    const { selection } = editor.state;
                    if (!selection.empty) {
                      // Apply size to selected text only using custom FontSize extension
                      editor.chain().focus().setMark('textStyle', { fontSize: newSize.toString() }).run();
                      toast({ title: `Font size increased to ${newSize}pt for selected text` });
                    } else {
                      toast({ title: "Please select text to change font size" });
                    }
                  }
                }}
                disabled={fontSize >= 72}
              >
                <Plus className="w-3 h-3 text-blue-600" />
              </button>
              <button 
                className="px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700 disabled:opacity-50"
                onClick={() => {
                  const newSize = Math.max(8, fontSize - 2);
                  
                  if (editor) {
                    const { selection } = editor.state;
                    if (!selection.empty) {
                      // Apply size to selected text only using custom FontSize extension
                      editor.chain().focus().setMark('textStyle', { fontSize: newSize.toString() }).run();
                      toast({ title: `Font size decreased to ${newSize}pt for selected text` });
                    } else {
                      toast({ title: "Please select text to change font size" });
                    }
                  }
                }}
                disabled={fontSize <= 8}
              >
                <Minus className="w-3 h-3 text-blue-600" />
              </button>
            </div>

            {/* Text formatting */}
            <div className="flex items-center space-x-1 border-r border-gray-400 dark:border-gray-500 pr-3">
              <button
                className={`px-2 py-1 rounded transition-colors ${
                  editor?.isActive('bold') 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
                onClick={() => editor?.chain().focus().toggleBold().run()}
              >
                <Bold className="w-4 h-4 text-blue-600 font-bold" />
              </button>
              <button
                className={`px-2 py-1 rounded transition-colors ${
                  editor?.isActive('italic') 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
                onClick={() => editor?.chain().focus().toggleItalic().run()}
              >
                <Italic className="w-4 h-4 text-blue-600" />
              </button>
              <button
                className={`px-2 py-1 rounded transition-colors ${
                  editor?.isActive('underline') 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
              >
                <UnderlineIcon className="w-4 h-4 text-blue-600" />
              </button>
              <button
                className={`px-2 py-1 rounded transition-colors ${
                  editor?.isActive('strike') 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
                onClick={() => editor?.chain().focus().toggleStrike().run()}
              >
                <Strikethrough className="w-4 h-4 text-red-600" />
              </button>
              <button 
                className="px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700 disabled:opacity-50"
                title="Subscript"
                onClick={() => {
                  if (!editor) return;
                  const { selection } = editor.state;
                  const selectedText = editor.state.doc.textBetween(selection.from, selection.to, ' ');
                  
                  if (selectedText.trim()) {
                    // Replace selected text with subscript version
                    editor.chain().focus().deleteSelection().insertContent(`<sub>${selectedText}</sub>`).run();
                  } else {
                    // Insert placeholder subscript
                    editor.chain().focus().insertContent('<sub>text</sub>').run();
                  }
                }}
                disabled={!editor}
              >
                <span className="text-xs text-blue-600">X₂</span>
              </button>
              <button 
                className="px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700 disabled:opacity-50"
                title="Superscript"
                onClick={() => {
                  if (!editor) return;
                  const { selection } = editor.state;
                  const selectedText = editor.state.doc.textBetween(selection.from, selection.to, ' ');
                  
                  if (selectedText.trim()) {
                    // Replace selected text with superscript version
                    editor.chain().focus().deleteSelection().insertContent(`<sup>${selectedText}</sup>`).run();
                  } else {
                    // Insert placeholder superscript
                    editor.chain().focus().insertContent('<sup>text</sup>').run();
                  }
                }}
                disabled={!editor}
              >
                <span className="text-xs text-blue-600">X²</span>
              </button>
              <button 
                className="px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700 disabled:opacity-50"
                title="Highlight"
                onClick={() => {
                  if (!editor) return;
                  const { selection } = editor.state;
                  
                  if (!selection.empty) {
                    // Apply proper highlighting to selected text only
                    editor.chain().focus().toggleHighlight({ color: '#ffff00' }).run();
                    toast({ title: "Text highlighted" });
                  } else {
                    toast({ title: "Please select text to highlight" });
                  }
                }}
                disabled={!editor}
              >
                <div className="w-4 h-4 bg-yellow-400 border rounded" />
              </button>
              <input
                type="color"
                value={textColor}
                onChange={(e) => {
                  const newColor = e.target.value;
                  if (editor) {
                    const { selection } = editor.state;
                    if (!selection.empty) {
                      // Apply color to selected text only
                      editor.chain().focus().setColor(newColor).run();
                      toast({ title: "Color changed for selected text" });
                    } else {
                      toast({ title: "Please select text to change color" });
                    }
                  }
                }}
                className="w-8 h-6 border rounded cursor-pointer"
                title="Font Color"
                disabled={!editor}
              />
            </div>

            {/* Text alignment */}
            <div className="flex items-center space-x-1 border-r border-gray-400 dark:border-gray-500 pr-3">
              <button
                className={`px-2 py-1 rounded transition-colors ${
                  editor?.isActive({ textAlign: 'left' }) 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
                onClick={() => editor?.chain().focus().setTextAlign('left').run()}
              >
                <AlignLeft className="w-4 h-4 text-green-600" />
              </button>
              <button
                className={`px-2 py-1 rounded transition-colors ${
                  editor?.isActive({ textAlign: 'center' }) 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
                onClick={() => editor?.chain().focus().setTextAlign('center').run()}
              >
                <AlignCenter className="w-4 h-4 text-green-600" />
              </button>
              <button
                className={`px-2 py-1 rounded transition-colors ${
                  editor?.isActive({ textAlign: 'right' }) 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
                onClick={() => editor?.chain().focus().setTextAlign('right').run()}
              >
                <AlignRight className="w-4 h-4 text-green-600" />
              </button>
              <button
                className={`px-2 py-1 rounded transition-colors ${
                  editor?.isActive({ textAlign: 'justify' }) 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
                onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
              >
                <AlignJustify className="w-4 h-4 text-green-600" />
              </button>
            </div>

            {/* Lists and indentation */}
            <div className="flex items-center space-x-1">
              <button
                className={`px-2 py-1 rounded transition-colors ${
                  editor?.isActive('bulletList') 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
              >
                <List className="w-4 h-4 text-purple-600" />
              </button>
              <button
                className={`px-2 py-1 rounded transition-colors ${
                  editor?.isActive('orderedList') 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              >
                <ListOrdered className="w-4 h-4 text-purple-600" />
              </button>
              <button 
                className="px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700 disabled:opacity-50"
                title="Increase Indent"
                onClick={() => {
                  if (editor?.isActive('listItem')) {
                    editor.chain().focus().sinkListItem('listItem').run();
                  }
                }}
                disabled={!editor?.isActive('listItem')}
              >
                <Indent className="w-4 h-4 text-orange-600" />
              </button>
              <button 
                className="px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700 disabled:opacity-50"
                title="Decrease Indent"
                onClick={() => {
                  if (editor?.isActive('listItem')) {
                    editor.chain().focus().liftListItem('listItem').run();
                  }
                }}
                disabled={!editor?.isActive('listItem')}
              >
                <Outdent className="w-4 h-4 text-orange-600" />
              </button>
            </div>
          </div>

          {/* Second toolbar line */}
          <div className="flex items-center justify-center space-x-3 overflow-x-auto px-4">

            {/* Page Layout Controls */}
            <div className="flex items-center space-x-2 border-r border-gray-300 pr-4">
              <Select value={pageSize} onValueChange={(value: keyof typeof PAGE_SIZES) => {
                try {
                  setPageSize(value);
                  // Update layout engine with new page size
                  const newLayoutEngine = createLayoutEngine(value, fontSize);
                  setLayoutEngine(newLayoutEngine);
                  setPageMetrics(newLayoutEngine.getCurrentMetrics());
                  
                  toast({ title: `Page size changed to ${value}` });
                } catch (error) {
                  console.error('Error updating page size:', error);
                  toast({ 
                    title: "Error changing page size", 
                    description: "Please try again", 
                    variant: "destructive" 
                  });
                }
              }}>
                <SelectTrigger className="w-36 border-none bg-transparent hover:bg-gray-100 text-gray-700">
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
              
              <Select value={pageOrientation} onValueChange={(value: 'portrait' | 'landscape') => {
                setPageOrientation(value);
                // Trigger page layout recalculation
                const newLayoutEngine = createLayoutEngine(pageSize, fontSize);
                setLayoutEngine(newLayoutEngine);
                setPageMetrics(newLayoutEngine.getCurrentMetrics());
                toast({ title: `Page orientation changed to ${value}` });
              }}>
                <SelectTrigger className="w-24 border-none bg-transparent hover:bg-gray-100 text-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">Portrait</SelectItem>
                  <SelectItem value="landscape">Landscape</SelectItem>
                </SelectContent>
              </Select>
              
              <button className="flex items-center space-x-1 px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700">
                <Layout className="w-4 h-4 text-blue-600" />
                <span className="text-xs">Margins</span>
              </button>
              
              <button 
                className="px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700"
                onClick={() => setRulerUnit(rulerUnit === 'inches' ? 'cm' : 'inches')}
                title="Toggle ruler units"
              >
                <span className="text-xs text-blue-600">{rulerUnit === 'inches' ? 'in' : 'cm'}</span>
              </button>
              
              {/* Page Metrics Display */}
              <div className="text-xs text-gray-500 dark:text-gray-400 px-2 border-l border-gray-300">
                <div>{pageMetrics.charactersPerLine} chars/line</div>
                <div>{pageMetrics.linesPerPage} lines/page</div>
              </div>
            </div>

            {/* Insert options */}
            <div className="flex items-center space-x-1 border-r border-gray-300 pr-4">
              <button 
                className="flex items-center space-x-1 px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700 disabled:opacity-50"
                onClick={() => {
                  if (editor) {
                    // Create hidden file input for image upload
                    const input = window.document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e: Event) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          const imageSrc = e.target?.result as string;
                          editor.chain().focus().insertContent(`<img src="${imageSrc}" alt="${file.name}" style="max-width: 100%; height: auto;" />`).run();
                          toast({ title: "Image inserted successfully" });
                        };
                        reader.readAsDataURL(file);
                      }
                    };
                    input.click();
                  }
                }}
                disabled={!editor}
              >
                <Image className="w-4 h-4 text-green-600" />
                <span className="text-xs">Image</span>
              </button>
              <button 
                className="flex items-center space-x-1 px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700 disabled:opacity-50"
                onClick={() => {
                  if (editor) {
                    // Insert a simple HTML table since Tiptap table extension might not be available
                    const tableHTML = `
                      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
                        <thead>
                          <tr>
                            <th style="border: 1px solid #ccc; padding: 8px; background-color: #f5f5f5;">Header 1</th>
                            <th style="border: 1px solid #ccc; padding: 8px; background-color: #f5f5f5;">Header 2</th>
                            <th style="border: 1px solid #ccc; padding: 8px; background-color: #f5f5f5;">Header 3</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style="border: 1px solid #ccc; padding: 8px;">Cell 1</td>
                            <td style="border: 1px solid #ccc; padding: 8px;">Cell 2</td>
                            <td style="border: 1px solid #ccc; padding: 8px;">Cell 3</td>
                          </tr>
                          <tr>
                            <td style="border: 1px solid #ccc; padding: 8px;">Cell 4</td>
                            <td style="border: 1px solid #ccc; padding: 8px;">Cell 5</td>
                            <td style="border: 1px solid #ccc; padding: 8px;">Cell 6</td>
                          </tr>
                        </tbody>
                      </table>
                    `;
                    editor.chain().focus().insertContent(tableHTML).run();
                    toast({ title: "Table inserted" });
                  }
                }}
                disabled={!editor}
              >
                <Table className="w-4 h-4 text-blue-600" />
                <span className="text-xs">Table</span>
              </button>
              <button 
                className="flex items-center space-x-1 px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700 disabled:opacity-50"
                onClick={() => {
                  if (editor) {
                    const url = prompt('Enter URL:');
                    if (url) {
                      editor.chain().focus().setLink({ href: url }).run();
                      toast({ title: "Link added" });
                    }
                  }
                }}
                disabled={!editor}
              >
                <Link className="w-4 h-4 text-purple-600" />
                <span className="text-xs">Link</span>
              </button>
              <button 
                className="flex items-center space-x-1 px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700 disabled:opacity-50"
                onClick={() => {
                  if (editor) {
                    editor.chain().focus().insertContent('<div style="page-break-before: always;"></div>').run();
                    toast({ title: "Page break inserted" });
                  }
                }}
                disabled={!editor}
              >
                <FileText className="w-4 h-4 text-orange-600" />
                <span className="text-xs">Page Break</span>
              </button>
            </div>

            {/* Zoom controls */}
            <div className="flex items-center space-x-2">
              <button 
                className="flex items-center space-x-1 px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700"
                onClick={() => {
                  if (!document?.content || document.content.trim().length === 0) {
                    toast({
                      title: "No content to download",
                      description: "Please add some text to your document first.",
                    });
                    return;
                  }
                  
                  // Create a clean HTML document for download
                  const cleanContent = document.content
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
                    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ''); // Remove styles
                  
                  const blob = new Blob([
                    `<!DOCTYPE html>
                    <html>
                    <head>
                      <meta charset="UTF-8">
                      <title>${document.title || 'Document'}</title>
                      <style>
                        body { font-family: ${fontFamily}, serif; font-size: ${fontSize}pt; color: ${textColor}; line-height: 1.6; margin: 40px; }
                        @media print { body { margin: 0; } }
                      </style>
                    </head>
                    <body>
                      ${cleanContent}
                    </body>
                    </html>`
                  ], { type: 'text/html' });
                  
                  const url = URL.createObjectURL(blob);
                  const a = window.document.createElement('a');
                  a.href = url;
                  a.download = `${document.title || 'Document'}.html`;
                  a.click();
                  URL.revokeObjectURL(url);
                  
                  toast({ 
                    title: "Document downloaded",
                    description: `${document.title || 'Document'}.html has been saved to your downloads.`
                  });
                }}
              >
                <Save className="w-4 h-4 text-green-600" />
                <span className="text-xs">Download</span>
              </button>

              <button 
                className="px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700"
                onClick={() => setZoomLevel(Math.max(25, zoomLevel - 25))}
              >
                <Minus className="w-4 h-4 text-blue-600" />
              </button>
              <span className="text-sm font-medium w-16 text-center text-gray-700">{zoomLevel}%</span>
              <button 
                className="px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700"
                onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
              >
                <Plus className="w-4 h-4 text-blue-600" />
              </button>
              <Select value={zoomLevel.toString()} onValueChange={(value) => setZoomLevel(parseInt(value))}>
                <SelectTrigger className="w-20 border-none bg-transparent hover:bg-gray-100 text-gray-700">
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
        <ResizablePanel defaultSize={17} minSize={12} maxSize={25}>
          <div className="h-full border-4 border-r-4 border-t-4 border-b-4 shadow-lg" style={{ 
            background: 'linear-gradient(to bottom, #fdf4f9 0%, #fbf1f7 25%, #f9f6fc 50%, #f7faff 75%, #f2f9fd 90%, #eef6fa 100%)',
            borderImage: 'linear-gradient(45deg, #60a5fa, #3b82f6, #1d4ed8, #60a5fa) 1',
            boxShadow: '0 8px 24px rgba(255, 255, 255, 0.4) inset, 0 4px 16px rgba(0, 0, 0, 0.08)'
          }}>
            <div className="p-4 border-b border-pink-200/30 dark:border-slate-600" style={{ 
              background: 'linear-gradient(to right, #fdf4f9 0%, #fbf1f7 50%, #f9f6fc 100%)',
              boxShadow: '0 4px 12px rgba(255, 255, 255, 0.5) inset'
            }}>
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

            
            {/* Microsoft Word-Style Floating Horizontal Ruler */}
            <div className="relative h-12 flex justify-center bg-gray-300 dark:bg-gray-700">
              <div 
                className="relative bg-gradient-to-b from-gray-100 via-gray-150 to-gray-200 border border-gray-300 shadow-sm"
                style={{ 
                  width: `${pageWidth}px`,
                  height: '28px',
                  marginTop: '8px',
                  marginBottom: '8px'
                }}
                onMouseMove={(e) => {
                  if (isDraggingMarker) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const relativeX = e.clientX - rect.left;
                    
                    if (isDraggingMarker === 'leftMargin') {
                      setLeftMargin(Math.max(0, Math.min(relativeX, pageWidth - rightMargin - 48)));
                    } else if (isDraggingMarker === 'rightMargin') {
                      setRightMargin(Math.max(0, Math.min(pageWidth - relativeX, pageWidth - leftMargin - 48)));
                    } else if (isDraggingMarker === 'paragraphIndent') {
                      setParagraphIndent(Math.max(0, Math.min(relativeX - leftMargin, pageWidth - leftMargin - rightMargin - 24)));
                    } else if (isDraggingMarker === 'hangingIndent') {
                      setHangingIndent(Math.max(0, Math.min(relativeX - leftMargin, pageWidth - leftMargin - rightMargin - 24)));
                    }
                  }
                }}
                onMouseUp={() => setIsDraggingMarker(null)}
              >
                {/* Ruler tick marks - Microsoft Word style */}
                <div className="absolute inset-0">
                  {/* Inch markings with 0.1-inch intervals */}
                  {Array.from({ length: Math.ceil(pageWidth / 9.6) + 1 }, (_, i) => {
                    const position = i * 9.6;
                    const isInchMark = i % 10 === 0;
                    const isHalfInch = i % 5 === 0 && !isInchMark;
                    
                    return (
                      <div key={i} className="absolute" style={{ left: `${position}px` }}>
                        {isInchMark ? (
                          <>
                            <div className="w-0.5 h-6 bg-gray-700"></div>
                            <div className="absolute top-6 text-xs text-gray-800 font-medium transform -translate-x-1/2" style={{ left: '1px', fontFamily: 'Segoe UI, sans-serif' }}>
                              {Math.floor(i / 10)}
                            </div>
                          </>
                        ) : isHalfInch ? (
                          <div className="w-px h-4 bg-gray-600"></div>
                        ) : (
                          <div className="w-px h-2 bg-gray-500"></div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Microsoft Word-style draggable margin markers */}
                <div 
                  className="absolute top-0 w-3 h-7 bg-blue-600 hover:bg-blue-700 cursor-ew-resize border border-blue-800 shadow-sm transition-colors"
                  style={{ left: `${leftMargin}px`, transform: 'translateX(-50%)' }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsDraggingMarker('leftMargin');
                  }}
                  title="Left Margin"
                />
                
                <div 
                  className="absolute top-0 w-3 h-7 bg-blue-600 hover:bg-blue-700 cursor-ew-resize border border-blue-800 shadow-sm transition-colors"
                  style={{ left: `${pageWidth - rightMargin}px`, transform: 'translateX(-50%)' }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsDraggingMarker('rightMargin');
                  }}
                  title="Right Margin"
                />
                
                <div 
                  className="absolute top-0 cursor-ew-resize transition-colors"
                  style={{ left: `${leftMargin + paragraphIndent}px`, transform: 'translateX(-50%)' }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsDraggingMarker('paragraphIndent');
                  }}
                  title="First Line Indent"
                >
                  <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-l-transparent border-r-transparent border-b-green-600 hover:border-b-green-700"></div>
                </div>
                
                <div 
                  className="absolute bottom-0 cursor-ew-resize transition-colors"
                  style={{ left: `${leftMargin + hangingIndent}px`, transform: 'translateX(-50%)' }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsDraggingMarker('hangingIndent');
                  }}
                  title="Hanging Indent"
                >
                  <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-green-600 hover:border-t-green-700"></div>
                </div>
              </div>
            </div>
            
            {/* Document area with vertical ruler */}
            <div className="flex-1 flex">
              {/* Microsoft Word-style Floating Vertical Ruler */}
              <div className="relative w-12 bg-gray-300 dark:bg-gray-700 flex justify-center">
                <div 
                  className="bg-gradient-to-r from-gray-100 via-gray-150 to-gray-200 border border-gray-300 shadow-sm"
                  style={{ 
                    width: '28px',
                    height: `${pageHeight}px`,
                    marginLeft: '8px',
                    marginRight: '8px'
                  }}
                  onMouseMove={(e) => {
                    if (isDraggingMarker) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const relativeY = e.clientY - rect.top;
                      
                      if (isDraggingMarker === 'topMargin') {
                        setTopMargin(Math.max(0, Math.min(relativeY, pageHeight - bottomMargin - 48)));
                      } else if (isDraggingMarker === 'bottomMargin') {
                        setBottomMargin(Math.max(0, Math.min(pageHeight - relativeY, pageHeight - topMargin - 48)));
                      }
                    }
                  }}
                  onMouseUp={() => setIsDraggingMarker(null)}
                >
                  {/* Vertical ruler tick marks */}
                  <div className="absolute inset-0">
                    {Array.from({ length: Math.ceil(pageHeight / 9.6) + 1 }, (_, i) => {
                      const position = i * 9.6;
                      const isInchMark = i % 10 === 0;
                      const isHalfInch = i % 5 === 0 && !isInchMark;
                      
                      return (
                        <div key={i} className="absolute" style={{ top: `${position}px` }}>
                          {isInchMark ? (
                            <>
                              <div className="h-0.5 w-6 bg-gray-700"></div>
                              <div className="absolute left-6 text-xs text-gray-800 font-medium transform -translate-y-1/2 rotate-90" style={{ top: '1px', fontFamily: 'Segoe UI, sans-serif', transformOrigin: 'left center' }}>
                                {Math.floor(i / 10)}
                              </div>
                            </>
                          ) : isHalfInch ? (
                            <div className="h-px w-4 bg-gray-600"></div>
                          ) : (
                            <div className="h-px w-2 bg-gray-500"></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Microsoft Word-style draggable margin markers */}
                  <div 
                    className="absolute left-0 h-3 w-7 bg-blue-600 hover:bg-blue-700 cursor-ns-resize border border-blue-800 shadow-sm transition-colors"
                    style={{ top: `${topMargin}px`, transform: 'translateY(-50%)' }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setIsDraggingMarker('topMargin');
                    }}
                    title="Top Margin"
                  />
                  
                  <div 
                    className="absolute left-0 h-3 w-7 bg-blue-600 hover:bg-blue-700 cursor-ns-resize border border-blue-800 shadow-sm transition-colors"
                    style={{ top: `${pageHeight - bottomMargin}px`, transform: 'translateY(-50%)' }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setIsDraggingMarker('bottomMargin');
                    }}
                    title="Bottom Margin"
                  />
                </div>
              </div>
              
              {/* Document content area */}
              <div className="flex-1 relative overflow-auto" style={{
                background: `
                  linear-gradient(135deg, 
                    #f5f0f5 0%, #f5f0f5 12.5%, 
                    #faf5fa 12.5%, #faf5fa 25%,
                    #f5f0f5 25%, #f5f0f5 37.5%,
                    #faf5fa 37.5%, #faf5fa 50%,
                    #f5f0f5 50%, #f5f0f5 62.5%,
                    #faf5fa 62.5%, #faf5fa 75%,
                    #f5f0f5 75%, #f5f0f5 87.5%,
                    #faf5fa 87.5%, #faf5fa 100%
                  ),
                  linear-gradient(to bottom, 
                    #f8f5f8 0%, 
                    #f5f2f5 30%, 
                    #f0f5f5 70%, 
                    #e8f2f5 100%
                  )
                `,
                backgroundSize: '40px 40px, 100% 100%'
              }}>
                <ScrollArea className="h-full" style={{
                  background: 'transparent'
                }}>
                  <div className="flex justify-center py-8 px-4 min-h-full">
                    {/* Document pages content */}
                    <div className="relative">
                      {/* Render pages with real distributed content */}
                      {pageContent.map((page, pageIndex) => (
                        <div
                          key={page.pageNumber}
                          className="bg-white dark:bg-slate-100 shadow-2xl mb-8 relative group hover:shadow-cyan-300/20 transition-all duration-500"
                          style={{
                            width: `${pageWidth}px`,
                            height: `${pageHeight}px`,
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(6, 182, 212, 0.1), 0 0 20px rgba(6, 182, 212, 0.05)',
                            minHeight: `${pageHeight}px`,
                            paddingLeft: `${leftMargin}px`,
                            paddingRight: `${rightMargin}px`,
                            paddingTop: `${topMargin}px`,
                            paddingBottom: `${bottomMargin}px`
                          }}
                        >
                          {/* Apply paragraph indents to content */}
                          <div
                            style={{
                              textIndent: `${paragraphIndent}px`,
                              marginLeft: `${hangingIndent}px`
                            }}
                          >
                            <EditorContent 
                              editor={editor} 
                              className="prose prose-lg max-w-none dark:prose-invert focus:outline-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Right panel - Always-On ChatGPT Interface (increased by 30%) */}
        <ResizablePanel defaultSize={33} minSize={25} maxSize={45}>
          <div className="h-full border-4 border-l-4 border-t-4 border-b-4 shadow-lg flex flex-col" style={{ 
            background: 'white',
            borderImage: 'linear-gradient(45deg, #60a5fa, #3b82f6, #1d4ed8, #60a5fa) 1',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(255, 255, 255, 0.6) inset'
          }}>
            {/* ChatGPT Assistant Header - Fixed at top */}
            <div className="flex-shrink-0 border-b border-gray-200/30 dark:border-slate-600 p-4" style={{ 
              background: 'white',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
            }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">ChatGPT Assistant</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-light">
                      Always available • {derivedPageCount} pages
                    </p>
                  </div>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="AI Active"></div>
              </div>
              
              {/* Smart AI Suggestions - Compact */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Quick Actions</h4>
                <div className="grid grid-cols-1 gap-1">
                  <button className="w-full text-left p-2 text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700 transition-all duration-300 text-gray-700 dark:text-gray-300">
                    💡 Rephrase selection
                  </button>
                  <button className="w-full text-left p-2 text-xs bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-700 transition-all duration-300 text-gray-700 dark:text-gray-300">
                    📝 Add summary
                  </button>
                  <button className="w-full text-left p-2 text-xs bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700 transition-all duration-300 text-gray-700 dark:text-gray-300">
                    🎯 Check tone
                  </button>
                </div>
              </div>
            </div>
            
            {/* Chat messages area - Flexible middle section with independent scroll */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              <div className="space-y-2">
                {chatMessages.length === 0 && (
                  <div className="text-center py-6">
                    <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2 text-sm">
                      Ready to Help!
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                      Try natural language requests:
                    </p>
                    <div className="text-xs text-gray-500 dark:text-gray-500 space-y-1">
                      <p>"create a title about Ali"</p>
                      <p>"make the text bold"</p>
                      <p>"add a paragraph"</p>
                    </div>
                  </div>
                )}
                
                {chatMessages.map((message: ChatMessage) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-2`}
                  >
                    <div
                      className={`max-w-[85%] p-2 rounded-lg text-xs ${
                        message.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white border shadow-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Chat input - Fixed at bottom */}
            <div className="flex-shrink-0 border-t border-gray-200/30 dark:border-gray-700 p-4" style={{ 
              background: 'white',
              boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.04)'
            }}>
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Textarea
                    placeholder="Ask me to help with your document..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 min-h-[50px] max-h-[50px] resize-none text-sm"
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
                    <Send className="w-3 h-3" />
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
      
      
      {/* Floating AI Improve Button at bottom of document */}
      <div className="fixed bottom-6 right-8 z-50">
        <button
          onClick={async () => {
            if (!document?.content || document.content.trim().length === 0) {
              toast({
                title: "No content to improve",
                description: "Please add some text to your document first.",
              });
              return;
            }
            
            try {
              setIsAiImproving(true);
              const response = await fetch('/api/ai/improve-writing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: document.content })
              });
              
              if (!response.ok) throw new Error('AI service unavailable');
              
              const { improvedContent } = await response.json();
              await updateDocumentMutation.mutateAsync({ content: improvedContent });
              
              toast({
                title: "Content improved!",
                description: "Your document has been enhanced for clarity and readability.",
              });
            } catch (error) {
              toast({
                title: "AI improve failed",
                description: "Please try again or check your connection.",
                variant: "destructive"
              });
            } finally {
              setIsAiImproving(false);
            }
          }}
          disabled={isAiImproving || !document?.content}
          className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 backdrop-blur-sm border border-white/20"
        >
          <Sparkles className="w-5 h-5" />
          <span className="font-medium">
            {isAiImproving ? 'Improving...' : 'AI Improve'}
          </span>
        </button>
      </div>


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