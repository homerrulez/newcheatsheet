import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Save, FileSpreadsheet, Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, Copy,
  Scissors, ClipboardPaste, Undo2, Redo2, Plus, Minus, Indent, Outdent, Type, Palette
} from 'lucide-react';
import WorkspaceSidebar from '@/components/workspace-sidebar';
import ChatPanel from '@/components/chat-panel';
import { apiRequest } from '@/lib/queryClient';
import { Template } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

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
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);
  const [sections, setSections] = useState<any>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Editor state for toolbar functionality
  const [fontSize, setFontSize] = useState(12);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [textColor, setTextColor] = useState('#000000');

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
      Highlight
    ],
    content: '<p>Start editing your template content...</p>',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
    },
  });

  // Fetch current template
  const { data: template } = useQuery({
    queryKey: ['/api/templates', id],
    enabled: !!id,
  });

  useEffect(() => {
    if (template) {
      setCurrentTemplate(template as Template);
      setSections((template as Template).sections || {});
    }
  }, [template]);

  // Create new template
  const createTemplateMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/templates', {
      title: 'New Template',
      templateType: 'generic',
      sections: {}
    }),
    onSuccess: async (response) => {
      const newTemplate = await response.json();
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      setCurrentTemplate(newTemplate);
      setSections({});
      navigate(`/template/${newTemplate.id}`);
    },
  });

  // Save template
  const saveTemplateMutation = useMutation({
    mutationFn: () => {
      if (!currentTemplate) throw new Error('No template selected');
      return apiRequest('PUT', `/api/templates/${currentTemplate.id}`, {
        sections,
        updatedAt: new Date()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      toast({
        title: "Template saved",
        description: "Your template has been saved successfully.",
      });
    },
  });

  const handleAIResponse = (response: any) => {
    if (response.sections) {
      setSections(prev => ({ ...prev, ...response.sections }));
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Enhanced Microsoft Word-Style Toolbar for Templates */}
      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-b border-white/20 flex-shrink-0">
        {/* Document title bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-6 h-6 text-green-600" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{currentTemplate?.title || 'Template'}</h1>
          </div>
          <Button
            onClick={() => saveTemplateMutation.mutate()}
            disabled={saveTemplateMutation.isPending || !currentTemplate}
            className="bg-green-600 hover:bg-green-700"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Template
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

            {/* Font controls */}
            <div className="flex items-center space-x-2 border-r border-gray-300 pr-4">
              <Select 
                value={fontFamily} 
                onValueChange={(value) => {
                  if (editor) {
                    const { selection } = editor.state;
                    if (!selection.empty) {
                      editor.chain().focus().setFontFamily(value).run();
                      toast({ title: `Font changed to ${value} for selected text` });
                    } else {
                      toast({ title: "Please select text to change font family" });
                    }
                  }
                }}
              >
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
              
              <Select 
                value={fontSize.toString()} 
                onValueChange={(value) => {
                  const newSize = parseInt(value);
                  if (!isNaN(newSize) && newSize >= 8 && newSize <= 72) {
                    if (editor) {
                      const { selection } = editor.state;
                      if (!selection.empty) {
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
              <Button 
                size="sm" 
                variant="outline" 
                title="Increase Indent"
                onClick={() => {
                  if (editor?.isActive('listItem')) {
                    editor.chain().focus().sinkListItem('listItem').run();
                  }
                }}
                disabled={!editor?.isActive('listItem')}
              >
                <Indent className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                title="Decrease Indent"
                onClick={() => {
                  if (editor?.isActive('listItem')) {
                    editor.chain().focus().liftListItem('listItem').run();
                  }
                }}
                disabled={!editor?.isActive('listItem')}
              >
                <Outdent className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Second toolbar line - Template specific controls */}
          <div className="flex items-center space-x-4 overflow-x-auto">
            <div className="flex items-center space-x-2 border-r border-gray-300 pr-4">
              <span className="text-sm font-medium text-gray-700">Template Type:</span>
              <Select value={currentTemplate?.templateType || 'generic'} onValueChange={() => {}}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="generic">Generic</SelectItem>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="report">Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">{Object.keys(sections).length} sections</span>
            </div>
          </div>
        </div>
      </div>

      {/* Three-pane layout */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Panel: Template History */}
        <WorkspaceSidebar
          workspaceType="template"
          currentWorkspaceId={currentTemplate?.id}
          onNewWorkspace={() => {
            createTemplateMutation.mutate();
          }}
        />

        {/* Middle Panel: Template Editor */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Tab Interface for switching between Rich Editor and Sections */}
          <div className="border-b border-gray-200 bg-white p-2">
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-green-100 text-green-700"
                onClick={() => {}}
              >
                <Type className="w-4 h-4 mr-1" />
                Rich Text Editor
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {}}
              >
                <FileSpreadsheet className="w-4 h-4 mr-1" />
                Template Sections
              </Button>
            </div>
          </div>

          {/* Rich Text Editor Section */}
          <div className="flex-1 bg-white p-6 overflow-auto">
            <div className="max-w-4xl mx-auto">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Template Editor</h3>
                <p className="text-sm text-gray-600">Use the toolbar above to format your template content with fonts, colors, alignment, and more.</p>
              </div>
              
              {/* Tiptap Editor */}
              <div className="border border-gray-200 rounded-lg bg-white min-h-[500px]">
                <div className="p-4">
                  <EditorContent
                    editor={editor}
                    className="prose prose-lg max-w-none focus:outline-none"
                    style={{
                      fontFamily,
                      fontSize: `${fontSize}pt`,
                      color: textColor,
                      lineHeight: '1.6',
                      minHeight: '460px',
                    }}
                  />
                </div>
              </div>

              {/* Editor Status */}
              <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
                <div>
                  {editor ? `${editor.storage.characterCount?.characters() || 0} characters` : '0 characters'}
                </div>
                <div>
                  Font: {fontFamily} | Size: {fontSize}pt
                </div>
              </div>
            </div>
          </div>

          {/* Original Template Sections - Hidden for now but can be toggled */}
          <div className="hidden">
            <div className="border-b border-slate-200 p-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {currentTemplate?.title || 'New Template'}
              </h2>
            </div>
            
            <div className="flex-1 p-6">
              {currentTemplate ? (
                <div className="h-full">
                  <div className="grid gap-4 h-full">
                    {Object.keys(sections).length > 0 ? (
                      Object.entries(sections).map(([key, value]) => (
                        <div key={key} className="border border-slate-200 rounded-lg p-4">
                          <h3 className="font-semibold text-slate-900 mb-2">{key}</h3>
                          <textarea
                            value={value as string}
                            onChange={(e) => setSections(prev => ({ ...prev, [key]: e.target.value }))}
                            className="w-full h-32 p-2 border border-slate-200 rounded resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder={`Enter content for ${key}...`}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                          <h3 className="text-lg font-semibold text-slate-900 mb-2">Empty Template</h3>
                          <p className="text-slate-600 mb-4">Ask the AI assistant to create template sections</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Template Selected</h3>
                    <p className="text-slate-600 mb-4">Create a new template or select one from the sidebar</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: AI Assistant */}
        <ChatPanel
          workspaceId={currentTemplate?.id || 'new'}
          workspaceType="template"
          onAIResponse={handleAIResponse}
        />
      </div>
    </div>
  );
}