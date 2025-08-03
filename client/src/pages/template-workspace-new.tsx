import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
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
  Indent, Outdent, Layout, Image, Table, Link as LinkIcon, Settings, X,
  FileSpreadsheet, ArrowLeft
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Template, ChatSession, ChatMessage } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

export default function TemplateWorkspace() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Document state
  const [fontSize, setFontSize] = useState(12);
  const [fontFamily, setFontFamily] = useState('Times New Roman');
  const [textColor, setTextColor] = useState('#000000');
  
  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [defaultSessionId, setDefaultSessionId] = useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  // Editor setup
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
      FontFamily,
      FontSize,
      Highlight
    ],
    content: '<p>Start editing your template content...</p>',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
    },
  });

  // Fetch template data
  const { data: template, isLoading: templateLoading, refetch: refetchTemplate } = useQuery({
    queryKey: ['template', id],
    queryFn: () => apiRequest(`/api/templates/${id}`),
    enabled: !!id && id !== 'new',
  });

  // Fetch all templates for left panel
  const { data: templates, refetch: refetchTemplates } = useQuery({
    queryKey: ['templates'],
    queryFn: () => apiRequest('/api/templates'),
  });

  // Fetch chat sessions
  const { data: chatSessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ['template-chat-sessions', id],
    queryFn: () => apiRequest(`/api/templates/${id}/chat-sessions`),
    enabled: !!id && id !== 'new',
  });

  // Fetch chat messages
  const { data: chatMessages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['chat-messages', defaultSessionId],
    queryFn: () => apiRequest(`/api/chat-sessions/${defaultSessionId}/messages`),
    enabled: !!defaultSessionId,
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (updates: Partial<Template>) => {
      const response = await fetch(`/api/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update template');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template', id] });
    },
  });

  // Create new chat session
  const createNewChatSession = async () => {
    if (!id || id === 'new') return;
    
    try {
      const response = await fetch(`/api/templates/${id}/chat-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Chat Session ${new Date().toLocaleDateString()}`,
          templateSnapshot: editor?.getHTML() || '<p></p>',
        }),
      });
      if (response.ok) {
        const session = await response.json();
        setDefaultSessionId(session.id);
        refetchSessions();
      }
    } catch (error) {
      console.error('Failed to create chat session:', error);
    }
  };

  // Send chat message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      // If no default session, create one first
      if (!defaultSessionId) {
        await createNewChatSession();
      }
      
      const templateContent = editor?.getHTML() || '';
      const response = await fetch(`/api/chat-sessions/${defaultSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: message, 
          templateContent,
          templateId: id 
        }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: (response: any) => {
      refetchMessages();
      setChatInput('');
      
      // Insert text response into template if it's content
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

  // Handle sending chat message
  const handleSendMessage = () => {
    if (!chatInput.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(chatInput);
  };

  // Set default session when sessions are loaded
  useEffect(() => {
    if (chatSessions.length > 0 && !defaultSessionId) {
      setDefaultSessionId(chatSessions[0].id);
    }
  }, [template, chatSessions, defaultSessionId]);

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `New Template ${new Date().toLocaleDateString()}`,
          content: '<p>Start building your template...</p>',
        }),
      });
      if (!response.ok) throw new Error('Failed to create template');
      return response.json();
    },
    onSuccess: (newTemplate) => {
      refetchTemplates();
      window.location.href = `/template/${newTemplate.id}`;
    },
  });

  if (templateLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading template...</p>
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
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{template?.title || 'Template'}</h1>
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
              <Button 
                size="sm" 
                variant="outline" 
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
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </Button>
              <Button 
                size="sm" 
                variant="outline"
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
                <Scissors className="w-4 h-4 mr-1" />
                Cut
              </Button>
              <Button 
                size="sm" 
                variant="outline"
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
                <ClipboardPaste className="w-4 h-4 mr-1" />
                Paste
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => editor?.chain().focus().undo().run()}
                disabled={!editor?.can().undo()}
              >
                <Undo2 className="w-4 h-4 mr-1" />
                Undo
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => editor?.chain().focus().redo().run()}
                disabled={!editor?.can().redo()}
              >
                <Redo2 className="w-4 h-4 mr-1" />
                Redo
              </Button>
            </div>

            {/* Font selection and size controls */}
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
              
              <Button 
                size="sm" 
                variant="outline" 
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
                <Plus className="w-3 h-3" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
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
                <Minus className="w-3 h-3" />
              </Button>
            </div>

            {/* Text formatting */}
            <div className="flex items-center space-x-1 border-r border-gray-300 pr-4">
              <Button
                size="sm"
                variant={editor?.isActive('bold') ? 'default' : 'outline'}
                onClick={() => {
                  if (!editor) return;
                  const { selection } = editor.state;
                  if (!selection.empty) {
                    editor.chain().focus().toggleBold().run();
                    toast({ title: "Bold formatting applied to selected text" });
                  } else {
                    toast({ title: "Please select text to format" });
                  }
                }}
              >
                <Bold className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={editor?.isActive('italic') ? 'default' : 'outline'}
                onClick={() => {
                  if (!editor) return;
                  const { selection } = editor.state;
                  if (!selection.empty) {
                    editor.chain().focus().toggleItalic().run();
                    toast({ title: "Italic formatting applied to selected text" });
                  } else {
                    toast({ title: "Please select text to format" });
                  }
                }}
              >
                <Italic className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={editor?.isActive('underline') ? 'default' : 'outline'}
                onClick={() => {
                  if (!editor) return;
                  const { selection } = editor.state;
                  if (!selection.empty) {
                    editor.chain().focus().toggleUnderline().run();
                    toast({ title: "Underline formatting applied to selected text" });
                  } else {
                    toast({ title: "Please select text to format" });
                  }
                }}
              >
                <UnderlineIcon className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={editor?.isActive('strike') ? 'default' : 'outline'}
                onClick={() => {
                  if (!editor) return;
                  const { selection } = editor.state;
                  if (!selection.empty) {
                    editor.chain().focus().toggleStrike().run();
                    toast({ title: "Strikethrough formatting applied to selected text" });
                  } else {
                    toast({ title: "Please select text to format" });
                  }
                }}
              >
                <Strikethrough className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                title="Highlight"
                onClick={() => {
                  if (!editor) return;
                  const { selection } = editor.state;
                  
                  if (!selection.empty) {
                    editor.chain().focus().toggleHighlight({ color: '#ffff00' }).run();
                    toast({ title: "Text highlighted" });
                  } else {
                    toast({ title: "Please select text to highlight" });
                  }
                }}
                disabled={!editor}
              >
                <div className="w-4 h-4 bg-yellow-300 border rounded" />
              </Button>
              <input
                type="color"
                value={textColor}
                onChange={(e) => {
                  const newColor = e.target.value;
                  if (editor) {
                    const { selection } = editor.state;
                    if (!selection.empty) {
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
            <div className="flex items-center space-x-1 border-r border-gray-300 pr-4">
              <Button
                size="sm"
                variant={editor?.isActive({ textAlign: 'left' }) ? 'default' : 'outline'}
                onClick={() => {
                  if (!editor) return;
                  const { selection } = editor.state;
                  if (!selection.empty) {
                    editor.chain().focus().setTextAlign('left').run();
                    toast({ title: "Text aligned left" });
                  } else {
                    toast({ title: "Please select text to align" });
                  }
                }}
              >
                <AlignLeft className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={editor?.isActive({ textAlign: 'center' }) ? 'default' : 'outline'}
                onClick={() => {
                  if (!editor) return;
                  const { selection } = editor.state;
                  if (!selection.empty) {
                    editor.chain().focus().setTextAlign('center').run();
                    toast({ title: "Text aligned center" });
                  } else {
                    toast({ title: "Please select text to align" });
                  }
                }}
              >
                <AlignCenter className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={editor?.isActive({ textAlign: 'right' }) ? 'default' : 'outline'}
                onClick={() => {
                  if (!editor) return;
                  const { selection } = editor.state;
                  if (!selection.empty) {
                    editor.chain().focus().setTextAlign('right').run();
                    toast({ title: "Text aligned right" });
                  } else {
                    toast({ title: "Please select text to align" });
                  }
                }}
              >
                <AlignRight className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={editor?.isActive({ textAlign: 'justify' }) ? 'default' : 'outline'}
                onClick={() => {
                  if (!editor) return;
                  const { selection } = editor.state;
                  if (!selection.empty) {
                    editor.chain().focus().setTextAlign('justify').run();
                    toast({ title: "Text justified" });
                  } else {
                    toast({ title: "Please select text to justify" });
                  }
                }}
              >
                <AlignJustify className="w-4 h-4" />
              </Button>
            </div>

            {/* Lists and indentation */}
            <div className="flex items-center space-x-1">
              <Button
                size="sm"
                variant={editor?.isActive('bulletList') ? 'default' : 'outline'}
                onClick={() => {
                  if (!editor) return;
                  editor.chain().focus().toggleBulletList().run();
                  toast({ title: "Bullet list toggled" });
                }}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={editor?.isActive('orderedList') ? 'default' : 'outline'}
                onClick={() => {
                  if (!editor) return;
                  editor.chain().focus().toggleOrderedList().run();
                  toast({ title: "Numbered list toggled" });
                }}
              >
                <ListOrdered className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (!editor) return;
                  // Add indentation
                  editor.chain().focus().insertContent('&nbsp;&nbsp;&nbsp;&nbsp;').run();
                  toast({ title: "Indentation added" });
                }}
              >
                <Indent className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (!editor) return;
                  // Remove indentation (simplified)
                  const { selection } = editor.state;
                  const text = editor.state.doc.textBetween(selection.from - 4, selection.from, ' ');
                  if (text === '    ') {
                    editor.chain().focus().deleteRange({ from: selection.from - 4, to: selection.from }).run();
                    toast({ title: "Indentation removed" });
                  }
                }}
              >
                <Outdent className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left panel - Template History */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <div className="h-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-r border-white/20">
            <div className="p-4 border-b border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <FileSpreadsheet className="w-5 h-5 mr-2" />
                    Templates
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    All your template documents
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => createTemplateMutation.mutate()}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  New Template
                </Button>
              </div>
            </div>
            
            <ScrollArea className="h-full p-4">
              <div className="space-y-2">
                {templates?.map((template: any) => (
                  <div key={template.id} className="group">
                    <div 
                      className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                        id === template.id
                          ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                          : 'bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                      onClick={() => window.location.href = `/template/${template.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 flex-1">
                          <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="font-medium text-gray-900 dark:text-white truncate">
                            {template.title}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(template.createdAt || Date.now()).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {!templates?.length && (
                  <div className="text-center py-8">
                    <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      No templates yet
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => createTemplateMutation.mutate()}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Create First Template
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Middle panel - Document Editor */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full bg-gray-100 dark:bg-gray-800">
            <ScrollArea className="h-full bg-gray-100 dark:bg-gray-800">
              <div className="min-h-full p-8 flex flex-col items-center">
                {/* Single Page Container - Letter Size */}
                <div
                  className="bg-white dark:bg-slate-100 shadow-2xl mb-8 relative group hover:shadow-cyan-300/20 transition-all duration-500"
                  style={{
                    width: '816px',
                    height: '1056px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(6, 182, 212, 0.1), 0 0 20px rgba(6, 182, 212, 0.05)',
                    minHeight: '1056px',
                  }}
                >
                  {/* Page number indicator */}
                  <div className="absolute -top-6 left-0 text-xs text-gray-500 dark:text-gray-400">
                    Template • Page 1
                  </div>
                  
                  {/* Page content */}
                  <div
                    className="w-full h-full relative"
                    style={{ 
                      padding: '72px',
                      overflow: 'hidden'
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
                        minHeight: '912px',
                      }}
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Right panel - Always-On ChatGPT Interface */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <div className="h-full bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-gray-700 flex flex-col">
            {/* ChatGPT Assistant Header - Fixed at top */}
            <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">ChatGPT Assistant</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-light">
                      Always available • Template helper
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
                    💡 Create structure
                  </button>
                  <button className="w-full text-left p-2 text-xs bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-700 transition-all duration-300 text-gray-700 dark:text-gray-300">
                    📝 Add template fields
                  </button>
                  <button className="w-full text-left p-2 text-xs bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700 transition-all duration-300 text-gray-700 dark:text-gray-300">
                    🎯 Format layout
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
                      <p>"create a report template"</p>
                      <p>"add placeholder fields"</p>
                      <p>"format this layout"</p>
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
            <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-gray-700 p-4">
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Textarea
                    placeholder="Ask me to help with your template..."
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
                  Try: "create structure", "add fields", "format layout"
                </p>
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}