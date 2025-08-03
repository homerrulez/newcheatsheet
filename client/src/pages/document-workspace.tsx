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
  
  // Layout engine integration
  const [layoutEngine, setLayoutEngine] = useState<LayoutEngine>(() => {
    const engine = createLayoutEngine(pageSize, fontSize);
    console.log('🔧 Layout engine created with:', { pageSize, fontSize });
    console.log('🔧 Page config:', engine.getPageConfig());
    console.log('🔧 Current metrics:', engine.getCurrentMetrics());
    return engine;
  });
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

  // Editor setup with extensive functionality - fixed duplicate extensions
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        // Disable underline in StarterKit since we're importing it separately
        underline: false,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline, // Keep only this underline instance
      // Removed TextStyle - FontSize extension already includes this functionality
      Color,
      FontFamily,
      FontSize, // This already extends TextStyle, so no need for separate TextStyle
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
  const { data: documentData, isLoading: documentLoading } = useQuery<Document>({
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
    if (documentData && editor && documentData.content && !editor.getHTML().includes(documentData.content)) {
      editor.commands.setContent(documentData.content || '<p></p>');
      setPageSize((documentData.pageSize as keyof typeof PAGE_SIZES) || 'letter');
      setFontSize(parseInt(documentData.fontSize || '12'));
      setFontFamily(documentData.fontFamily || 'Times New Roman');
      setTextColor(documentData.textColor || '#000000');
    }
  }, [documentData, editor]);

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

  // Unified Document Approach - Single editor with visual page rendering
  const [pageCount, setPageCount] = useState(1);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // State for distributed content across pages
  const [distributedPages, setDistributedPages] = useState<string[]>(['<p></p>']);

  // Distribute content across multiple pages
  const distributeContent = useCallback(() => {
    console.log('🔄 distributeContent called');
    
    if (!editor || !editorContainerRef.current) {
      console.log('❌ No editor or container ref');
      return;
    }

    const editorElement = editorContainerRef.current.querySelector('.ProseMirror');
    if (!editorElement) {
      console.log('❌ No ProseMirror element found');
      return;
    }

    const contentHeight = editorElement.scrollHeight;
    const availablePageHeight = pageHeight - (padding * 2);
    const calculatedPages = Math.max(1, Math.ceil(contentHeight / availablePageHeight));
    
    console.log('📊 Content height:', contentHeight, 'Available per page:', availablePageHeight, 'Pages:', calculatedPages);
    
    if (calculatedPages === 1) {
      // Single page - use all content
      setDistributedPages([editor.getHTML()]);
      setPageCount(1);
      return;
    }

    // COMPREHENSIVE DIAGNOSTIC LOGGING
    console.log('🔍 CONTENT DISTRIBUTION DIAGNOSTIC:');
    console.log('════════════════════════════════════════');
    
    // 1. Current state analysis
    const mainEditorContent = editor.getHTML();
    const mainEditorText = editor.getText();
    console.log('📊 CURRENT STATE:');
    console.log('- Main editor content length:', mainEditorContent.length, 'chars');
    console.log('- Main editor text length:', mainEditorText.length, 'chars'); 
    console.log('- Height-based calculation says:', calculatedPages, 'pages needed');
    console.log('- Available page height:', availablePageHeight, 'px');
    console.log('- Total content height:', contentHeight, 'px');
    console.log('- Current distributedPages state:', distributedPages.length, 'pages');
    
    // 2. Show a preview of main editor content
    console.log('📄 MAIN EDITOR CONTENT PREVIEW:');
    console.log('- HTML:', mainEditorContent.substring(0, 200) + '...');
    console.log('- Text:', mainEditorText.substring(0, 200) + '...');
    
    // 3. Test what layout engine would create
    console.log('🧪 LAYOUT ENGINE TEST:');
    try {
      // Layout engine test would go here if available
      console.log('- Layout engine not configured yet');
    } catch (layoutError) {
      console.log('- Layout engine error:', layoutError);
    }
    
    // 4. REAL CONTENT SPLITTING BY HEIGHT
    console.log('🎯 IMPLEMENTING REAL CONTENT SPLITTING:');
    
    const splitContentByHeight = (htmlContent: string, maxPageHeight: number): string[] => {
      const pages: string[] = [];
      
      try {
        // Parse HTML into individual elements
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const elements = Array.from(tempDiv.children);
        
        console.log('📄 Splitting', elements.length, 'elements across pages');
        
        // Distribute elements across pages by measuring height
        let currentPageElements: Element[] = [];
        let currentPageHeight = 0;
        
        elements.forEach((element, index) => {
          // Measure this element's height
          const testDiv = document.createElement('div');
          testDiv.style.cssText = `
            position: absolute; 
            top: -9999px; 
            left: -9999px;
            width: ${pageWidth - (padding * 2)}px; 
            font-size: ${fontSize}pt; 
            font-family: ${fontFamily}; 
            line-height: 1.6;
            color: ${textColor};
            visibility: hidden;
          `;
          testDiv.appendChild(element.cloneNode(true));
          document.body.appendChild(testDiv);
          
          const elementHeight = testDiv.offsetHeight;
          document.body.removeChild(testDiv);
          
          console.log(`Element ${index + 1}: ${elementHeight}px height, total so far: ${currentPageHeight + elementHeight}px`);
          
          // Check if element fits on current page
          if (currentPageHeight + elementHeight > maxPageHeight && currentPageElements.length > 0) {
            // Save current page and start new one
            const pageContent = currentPageElements.map(el => el.outerHTML).join('');
            pages.push(pageContent);
            console.log(`📄 Completed page ${pages.length}: ${currentPageHeight}px, ${currentPageElements.length} elements`);
            
            currentPageElements = [element];
            currentPageHeight = elementHeight;
          } else {
            // Add to current page
            currentPageElements.push(element);
            currentPageHeight += elementHeight;
          }
        });
        
        // Add final page
        if (currentPageElements.length > 0) {
          const pageContent = currentPageElements.map(el => el.outerHTML).join('');
          pages.push(pageContent);
          console.log(`📄 Final page ${pages.length}: ${currentPageHeight}px, ${currentPageElements.length} elements`);
        }
        
        return pages;
        
      } catch (error) {
        console.error('❌ Content splitting error:', error);
        // Fallback: return all content on first page
        return [htmlContent];
      }
    };
    
    console.log('🔄 Splitting content by actual height measurements...');
    const newDistributedPages = splitContentByHeight(mainEditorContent, availablePageHeight);
    
    console.log('📚 REAL CONTENT DISTRIBUTION COMPLETE:');
    newDistributedPages.forEach((page, i) => {
      console.log(`- Page ${i + 1}: ${page.length} chars - "${page.substring(0, 100)}..."`);
    });
    
    console.log('✅ Now each page contains REAL content, not placeholders!');
    console.log('════════════════════════════════════════');
    
    setDistributedPages(newDistributedPages);
    setPageCount(newDistributedPages.length);
  }, [editor, pageHeight, padding, pageWidth, fontFamily, fontSize, textColor]);

  // Calculate visual pagination based on content height (Word-style)
  useEffect(() => {
    if (editor && editorContainerRef.current) {
      const timer = setTimeout(distributeContent, 100);
      return () => clearTimeout(timer);
    }
  }, [distributeContent, editor?.getHTML(), pageHeight, padding, zoomLevel]);

  // Click-to-position mapping for multi-page editing
  const handlePageClick = useCallback((pageIndex: number, event: React.MouseEvent) => {
    console.log('🖱️ Page click mapping - Page:', pageIndex);
    
    if (!editor || pageIndex === 0) {
      // Page 1 already has direct editor, no mapping needed
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    // Add visual feedback on clicked page
    const pageElement = event.currentTarget as HTMLElement;
    const clickedContentDiv = pageElement.querySelector('.prose') as HTMLElement;
    
    if (clickedContentDiv) {
      // Brief highlight effect
      clickedContentDiv.style.transition = 'background-color 0.2s ease';
      clickedContentDiv.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'; // blue highlight
      
      // Remove highlight after brief delay
      setTimeout(() => {
        clickedContentDiv.style.backgroundColor = 'transparent';
      }, 300);
    }

    const rect = pageElement.getBoundingClientRect();
    const clickY = event.clientY - rect.top - padding; // Relative Y position within page
    
    console.log('📍 Click position:', { clickY, padding });

    // Calculate approximate document position based on page and Y coordinate
    const availablePageHeight = pageHeight - (padding * 2);
    const approximateDocumentY = (pageIndex * availablePageHeight) + Math.max(0, clickY);
    
    console.log('📊 Document position calculation:', {
      pageIndex,
      availablePageHeight,
      approximateDocumentY
    });

    // Small delay to let user see the click feedback, then focus editor
    setTimeout(() => {
      editor.commands.focus();
    }, 150);

    // Use the layout engine to find the closest node position
    try {
      const editorElement = editorContainerRef.current?.querySelector('.ProseMirror');
      if (editorElement) {
        // Create a temporary measuring approach
        const docHeight = editorElement.scrollHeight;
        const documentRatio = approximateDocumentY / docHeight;
        
        // Get document content and find approximate text position
        const fullText = editor.getText();
        const approximateCharPosition = Math.floor(fullText.length * documentRatio);
        
        console.log('🎯 Positioning cursor:', {
          docHeight,
          documentRatio,
          fullText: fullText.length,
          approximateCharPosition
        });

        // Safer cursor positioning with validation
        const doc = editor.state.doc;
        const maxValidPos = doc.content.size;
        
        console.log('📏 Document info:', {
          docSize: maxValidPos,
          textLength: fullText.length,
          approximateCharPosition
        });
        
        // Use a much simpler approach - just position proportionally
        const targetPos = Math.min(
          Math.max(1, Math.floor((approximateCharPosition / fullText.length) * maxValidPos)),
          maxValidPos - 1
        );
        
        console.log('🎯 Calculated target position:', targetPos, 'of max:', maxValidPos);
        
        // Validate position before setting
        try {
          if (targetPos >= 1 && targetPos < maxValidPos) {
            editor.commands.setTextSelection(targetPos);
            console.log('✅ Cursor positioned at validated pos:', targetPos);
          } else {
            console.log('⚠️ Invalid position, using end of document');
            editor.commands.setTextSelection(maxValidPos - 1);
          }
        } catch (positionError) {
          console.error('❌ Position setting error:', positionError);
          // Fallback to end of document
          editor.commands.setTextSelection(maxValidPos - 1);
        }

        // Scroll the editor to approximate position for visual feedback
        const scrollRatio = approximateDocumentY / docHeight;
        editorElement.scrollTop = editorElement.scrollHeight * scrollRatio;
      }
    } catch (error) {
      console.error('❌ Position mapping error:', error);
      // Fallback: just focus the editor
      editor.commands.focus();
    }
  }, [editor, pageHeight, padding]);

  // Editor diagnostics and event handlers
  useEffect(() => {
    if (editor) {
      console.log('=== EDITOR DIAGNOSTICS ===');
      console.log('Editor exists:', !!editor);
      console.log('Editor is editable:', editor?.isEditable);
      console.log('Editor is focused:', editor?.isFocused);
      console.log('Editor view DOM element:', editor?.view?.dom);
      console.log('Editor view DOM is contentEditable:', editor?.view?.dom?.contentEditable);
      console.log('Editor has selection:', !!editor?.state?.selection);

      // Event listeners for editor events
      const handleUpdate = () => {
        const timestamp = Date.now();
        console.log('EDITOR: content updated at', timestamp);
      };

      const handleSelectionUpdate = () => {
        console.log('EDITOR: selection updated');
      };

      const handleFocus = () => {
        console.log('EDITOR: gained focus');
      };

      const handleBlur = () => {
        console.log('EDITOR: lost focus');
      };

      editor.on('update', handleUpdate);
      editor.on('selectionUpdate', handleSelectionUpdate);
      editor.on('focus', handleFocus);
      editor.on('blur', handleBlur);

      return () => {
        editor.off('update', handleUpdate);
        editor.off('selectionUpdate', handleSelectionUpdate);
        editor.off('focus', handleFocus);
        editor.off('blur', handleBlur);
      };
    }
  }, [editor]);

  // Global focus tracking
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      console.log('FOCUS IN:', e.target, 'active element:', window.document.activeElement);
    };

    const handleFocusOut = (e: FocusEvent) => {
      console.log('FOCUS OUT:', e.target);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (window.document.activeElement === editor?.view?.dom || editor?.isFocused) {
        console.log('KEY DOWN:', e.key, 'at timestamp:', Date.now());
      }
    };

    window.document.addEventListener('focusin', handleFocusIn);
    window.document.addEventListener('focusout', handleFocusOut);
    window.document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.document.removeEventListener('focusin', handleFocusIn);
      window.document.removeEventListener('focusout', handleFocusOut);
      window.document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editor]);

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
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading document...</p>
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

            {/* Font controls */}
            <div className="flex items-center space-x-2 border-r border-gray-300 pr-4">
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
                <span className="text-xs">X₂</span>
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
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
                <span className="text-xs">X²</span>
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
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

          {/* Second toolbar line */}
          <div className="flex items-center space-x-4 overflow-x-auto">

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
              
              <Select value={pageOrientation} onValueChange={(value: 'portrait' | 'landscape') => {
                setPageOrientation(value);
                // Trigger page layout recalculation
                const newLayoutEngine = createLayoutEngine(pageSize, fontSize);
                setLayoutEngine(newLayoutEngine);
                setPageMetrics(newLayoutEngine.getCurrentMetrics());
                toast({ title: `Page orientation changed to ${value}` });
              }}>
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
              <Button 
                size="sm" 
                variant="outline"
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
                <Image className="w-4 h-4 mr-1" />
                Image
              </Button>
              <Button 
                size="sm" 
                variant="outline"
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
                <Table className="w-4 h-4 mr-1" />
                Table
              </Button>
              <Button 
                size="sm" 
                variant="outline"
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
                <Link className="w-4 h-4 mr-1" />
                Link
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  if (editor) {
                    editor.chain().focus().insertContent('<div style="page-break-before: always;"></div>').run();
                    toast({ title: "Page break inserted" });
                  }
                }}
                disabled={!editor}
              >
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
            {/* Functional AI Writing Assistant Indicator */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
              <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg rounded-xl px-4 py-2 border border-gray-200 dark:border-gray-600 shadow-lg">
                <div className="flex items-center space-x-4 text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">AI Assistant Active</span>
                  </div>
                  <div className="h-3 w-px bg-gray-300 dark:bg-gray-600"></div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600 dark:text-gray-400">
                      {(() => {
                        const text = documentData?.content || '';
                        const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
                        return `${wordCount} words`;
                      })()}
                    </span>
                  </div>
                  <div className="h-3 w-px bg-gray-300 dark:bg-gray-600"></div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600 dark:text-gray-400">
                      {(() => {
                        const text = documentData?.content || '';
                        const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
                        const readingTime = Math.max(1, Math.ceil(wordCount / 200)); // 200 words per minute
                        return `${readingTime} min read`;
                      })()}
                    </span>
                  </div>
                  <div className="h-3 w-px bg-gray-300 dark:bg-gray-600"></div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-600 dark:text-green-400 font-medium">Auto-save</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Document container */}
            <ScrollArea className="h-full bg-gray-100 dark:bg-gray-800">
              <div className="min-h-full p-8 flex flex-col items-center">


                {/* DIAGNOSTIC: Show what content is in each page container */}
                {console.log('🖼️ RENDERING PAGES:', distributedPages.length, 'pages')}
                {distributedPages.forEach((content, i) => 
                  console.log(`📄 Page ${i + 1} container content: "${content.substring(0, 100)}..." (${content.length} chars)`)
                )}
                
                {/* Render all pages with distributed content */}
                {distributedPages.map((pageContent, pageIndex) => (
                  <div
                    key={pageIndex}
                    className={`bg-white dark:bg-slate-100 shadow-2xl mb-8 relative group transition-all duration-500 cursor-text ${
                      pageIndex === 0 
                        ? 'hover:shadow-cyan-300/20' 
                        : 'hover:shadow-purple-300/20 hover:ring-1 hover:ring-purple-200'
                    }`}
                    style={{
                      width: `${pageWidth}px`,
                      minHeight: `${pageHeight}px`,
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(6, 182, 212, 0.1), 0 0 20px rgba(6, 182, 212, 0.05)',
                    }}
                    onClick={(e) => handlePageClick(pageIndex, e)}
                  >
                    {/* Page number indicator */}
                    <div className="absolute -top-6 left-0 text-xs text-gray-500 dark:text-gray-400">
                      Page {pageIndex + 1} of {pageCount}
                    </div>
                    
                    {console.log(`🖼️ RENDERING PAGE ${pageIndex + 1}:`, {
                      isFirstPage: pageIndex === 0,
                      contentLength: pageContent.length,
                      contentPreview: pageContent.substring(0, 100) + '...',
                      renderingMode: pageIndex === 0 ? 'EditorContent' : 'dangerouslySetInnerHTML'
                    })}
                    
                    {pageIndex === 0 ? (
                      /* First page with editable Tiptap editor */
                      <div
                        ref={editorContainerRef}
                        className="w-full h-full relative"
                        style={{ 
                          padding: `${padding}px`,
                          minHeight: `${pageHeight}px`,
                        }}
                      >
                        {console.log('   ✅ Showing EditorContent component (main unified editor)')}
                        {console.log('   📏 pageHeight:', pageHeight)}
                        {console.log('   📏 padding:', padding)}
                        {console.log('   📏 calculatedMaxHeight:', pageHeight - (padding * 2))}
                        {console.log('   📏 constraint height:', `${pageHeight - (padding * 2)}px`)}
                        {console.log('   🔍 CONTENT MISMATCH ANALYSIS:')}
                        {console.log('   - Page 1 (unified editor) content:', editor?.getHTML()?.length || 0, 'chars')}
                        {console.log('   - Page 1 (distributed) content:', distributedPages[0]?.length || 0, 'chars')}
                        {console.log('   - Pages 2+ show distributed content only')}
                        <div
                          className="editor-constraint-wrapper"
                          style={{
                            height: `${pageHeight - (padding * 2)}px`,
                            maxHeight: `${pageHeight - (padding * 2)}px`,
                            overflow: 'hidden',
                            border: '3px solid red', // DEBUG: Constraint boundary
                            position: 'relative',
                            display: 'block',
                          }}
                        >
                          <style>
                            {`
                              .editor-constraint-wrapper .ProseMirror {
                                height: auto !important;
                                max-height: none !important;
                                overflow: visible !important;
                              }
                            `}
                          </style>
                          <EditorContent
                            editor={editor}
                            className="w-full focus:outline-none prose prose-sm max-w-none cursor-text"
                            style={{
                              fontFamily,
                              fontSize: `${fontSize}pt`,
                              color: textColor,
                              lineHeight: '1.6',
                              height: 'auto',
                              overflow: 'visible',
                            }}
                          />
                          {/* DEBUG: Show content mismatch info */}
                          <div 
                            className="absolute top-0 right-0 bg-red-500 text-white text-xs px-1"
                            style={{ zIndex: 1000 }}
                          >
                            UNIFIED: {editor?.getHTML()?.length || 0}ch | DISTRIBUTED: {distributedPages[0]?.length || 0}ch
                          </div>
                          
                          {/* DEBUG: Visual comparison - show what distributed page 1 would look like */}
                          {distributedPages[0] && (
                            <div 
                              className="absolute bottom-0 left-0 bg-blue-500 text-white text-xs px-1 max-w-xs"
                              style={{ zIndex: 999 }}
                            >
                              P1 distributed preview: "{distributedPages[0].substring(0, 50)}..."
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Subsequent pages with clickable content - maps to unified editor */
                      <div
                        className="w-full h-full relative pointer-events-none"
                        style={{ 
                          padding: `${padding}px`,
                          minHeight: `${pageHeight}px`,
                        }}
                      >
                        {console.log('   📄 Showing distributed content HTML:', pageContent.substring(0, 200))}
                        <div 
                          className="w-full h-full prose prose-sm max-w-none"
                          style={{
                            fontFamily,
                            fontSize: `${fontSize}pt`,
                            color: textColor,
                            lineHeight: '1.6',
                            minHeight: `${pageHeight - (padding * 2)}px`,
                            overflow: 'hidden',
                          }}
                          dangerouslySetInnerHTML={{ __html: pageContent }}
                        />
                        
                        {/* Invisible overlay for click detection */}
                        <div 
                          className="absolute inset-0 bg-transparent pointer-events-auto"
                          style={{ 
                            cursor: 'text',
                          }}
                          title={`Click to edit page ${pageIndex + 1}`}
                        />
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
                      Always available • {pageCount} pages
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
            <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-gray-700 p-4">
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
      
      
      {/* AI Writing Assistant Toolbar - Only spans center panel, positioned between left history and right ChatGPT panels */}
      <div className="fixed bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 z-50" style={{ left: '25%', width: '50%' }}>
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* AI Grammar & Style Assistant */}
            <button
              onClick={async () => {
                if (!documentData?.content || documentData.content.trim().length === 0) {
                  toast({
                    title: "No content to improve",
                    description: "Please add some text to your document first.",
                  });
                  return;
                }
                
                try {
                  const response = await fetch('/api/ai/improve-writing', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      content: documentData.content,
                      preserveEquations: true,
                      preserveNotations: true 
                    })
                  });
                  
                  if (!response.ok) throw new Error('AI service unavailable');
                  
                  const { improvedContent } = await response.json();
                  await updateDocumentMutation.mutateAsync({ content: improvedContent });
                  
                  toast({
                    title: "Writing improved!",
                    description: "Grammar, spelling, and phrasing have been enhanced while preserving equations and notations.",
                  });
                } catch (error) {
                  toast({
                    title: "AI improvement failed",
                    description: "Please try again or check your connection.",
                    variant: "destructive"
                  });
                }
              }}
              className="flex items-center space-x-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-700 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">AI Improve</span>
            </button>

            {/* Word Count & Reading Time */}
            <div className="flex items-center space-x-4 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="flex items-center space-x-1">
                <Type className="w-3 h-3 text-blue-600" />
                <span className="text-xs text-blue-700 dark:text-blue-300">
                  {(() => {
                    const text = documentData?.content || '';
                    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
                    return `${wordCount} words`;
                  })()}
                </span>
              </div>
              <div className="h-3 w-px bg-blue-300 dark:bg-blue-600"></div>
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3 text-blue-600" />
                <span className="text-xs text-blue-700 dark:text-blue-300">
                  {(() => {
                    const text = documentData?.content || '';
                    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
                    const readingTime = Math.max(1, Math.ceil(wordCount / 200));
                    return `${readingTime} min`;
                  })()}
                </span>
              </div>
            </div>

            {/* AI Tone Adjustment */}
            <button
              onClick={async () => {
                if (!documentData?.content || documentData.content.trim().length === 0) {
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
                      content: documentData.content,
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
              className="flex items-center space-x-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-700 transition-colors"
            >
              <Brain className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Tone</span>
            </button>
          </div>

          <div className="flex items-center space-x-3">
            {/* Document Statistics */}
            <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
              <FileText className="w-3 h-3 text-gray-600" />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Page {Math.max(1, Math.ceil((documentData?.content?.length || 0) / 3000))}
              </span>
            </div>

            {/* Auto-save Status */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2 border border-green-200 dark:border-green-700">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-700 dark:text-green-400 font-medium">Auto-save</span>
              </div>
            </div>
          </div>
        </div>
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