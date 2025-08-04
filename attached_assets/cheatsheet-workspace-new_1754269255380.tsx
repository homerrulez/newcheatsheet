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
import AutoResizeMathBox from '@/components/auto-resize-math-box';
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
  Grid3X3, ArrowLeft
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { CheatSheet, ChatSession, ChatMessage } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Box interface
interface Box {
  id: string;
  title: string;
  content: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

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

export default function CheatSheetWorkspace() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Box state
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  
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
    content: '<p>Start editing your cheat sheet content...</p>',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
    },
  });

  // Fetch cheat sheet data
  const { data: cheatSheet, isLoading: cheatSheetLoading, refetch: refetchCheatSheet } = useQuery({
    queryKey: ['cheatsheet', id],
    queryFn: async () => {
      const response = await fetch(`/api/cheatsheets/${id}`);
      if (!response.ok) throw new Error('Failed to fetch cheat sheet');
      return response.json();
    },
    enabled: !!id && id !== 'new',
  });

  // Fetch all cheat sheets for left panel
  const { data: cheatSheets, refetch: refetchCheatSheets } = useQuery({
    queryKey: ['cheatsheets'],
    queryFn: async () => {
      const response = await fetch('/api/cheatsheets');
      if (!response.ok) throw new Error('Failed to fetch cheat sheets');
      return response.json();
    },
  });

  // Fetch chat sessions
  const { data: chatSessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ['cheatsheet-chat-sessions', id],
    queryFn: async () => {
      const response = await fetch(`/api/cheatsheets/${id}/chat-sessions`);
      if (!response.ok) throw new Error('Failed to fetch chat sessions');
      return response.json();
    },
    enabled: !!id && id !== 'new',
  });

  // Fetch chat messages
  const { data: chatMessages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['chat-messages', defaultSessionId],
    queryFn: async () => {
      const response = await fetch(`/api/chat-sessions/${defaultSessionId}/messages`);
      if (!response.ok) throw new Error('Failed to fetch chat messages');
      return response.json();
    },
    enabled: !!defaultSessionId,
  });

  // Update cheat sheet mutation
  const updateCheatSheetMutation = useMutation({
    mutationFn: async (updates: Partial<CheatSheet>) => {
      const response = await fetch(`/api/cheatsheets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update cheat sheet');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cheatsheet', id] });
    },
  });

  // Create new chat session
  const createNewChatSession = async () => {
    if (!id || id === 'new') return;
    
    try {
      const response = await fetch(`/api/cheatsheets/${id}/chat-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Chat Session ${new Date().toLocaleDateString()}`,
          cheatSheetSnapshot: editor?.getHTML() || '<p></p>',
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

  // FIXED: Tetris-style placement algorithm with proper state handling
  const findOptimalPosition = (newBoxWidth: number, newBoxHeight: number, existingBoxes: Box[]) => {
    console.log('🔍 findOptimalPosition called for new box:');
    console.log('   - New box size:', `${newBoxWidth}x${newBoxHeight}`);
    console.log('   - Existing boxes count:', existingBoxes.length);
    
    const PAGE_WIDTH = 816;
    const MARGIN = 40;
    const SPACING = 8;
    const usableWidth = PAGE_WIDTH - (2 * MARGIN);
    
    if (existingBoxes.length === 0) {
      console.log('   ✅ First box placed at: (40, 40)');
      return { x: MARGIN, y: MARGIN };
    }
    
    // Sort existing boxes by Y position first, then X position for row detection
    const sortedBoxes = [...existingBoxes].sort((a, b) => {
      if (Math.abs(a.y - b.y) < SPACING) return a.x - b.x;
      return a.y - b.y;
    });
    
    console.log('   📋 Analyzing existing boxes for placement...');
    
    // Try to fit in existing rows first (fill horizontal space)
    const usedYPositions = [...new Set(existingBoxes.map(box => box.y))].sort((a, b) => a - b);
    
    for (const rowY of usedYPositions) {
      const rowBoxes = existingBoxes.filter(box => Math.abs(box.y - rowY) < SPACING);
      const rowHeight = Math.max(...rowBoxes.map(box => box.height));
      
      console.log(`   🔍 Checking row at Y=${rowY}, height=${rowHeight}, boxes=${rowBoxes.length}`);
      
      // Check if new box can fit in height of this row
      if (newBoxHeight <= rowHeight + SPACING) {
        // Find rightmost box in this row
        const rightmostBox = rowBoxes.reduce((max, box) => 
          (box.x + box.width > max.x + max.width) ? box : max
        );
        const testX = rightmostBox.x + rightmostBox.width + SPACING;
        
        console.log(`   🧮 Testing position X=${testX} in existing row`);
        
        // Check if it fits horizontally within page bounds
        if (testX + newBoxWidth <= MARGIN + usableWidth) {
          // Verify no conflicts with other boxes
          const hasConflict = existingBoxes.some(box => {
            const xOverlaps = !(testX + newBoxWidth <= box.x || testX >= box.x + box.width);
            const yOverlaps = !(rowY + newBoxHeight <= box.y || rowY >= box.y + box.height);
            return xOverlaps && yOverlaps;
          });
          
          if (!hasConflict) {
            console.log(`   ✅ Found space in existing row: (${testX}, ${rowY})`);
            return { x: testX, y: rowY };
          } else {
            console.log(`   ❌ Conflict detected in row at X=${testX}`);
          }
        } else {
          console.log(`   ❌ Box would exceed page width: ${testX + newBoxWidth} > ${MARGIN + usableWidth}`);
        }
      } else {
        console.log(`   ❌ Box too tall for row: ${newBoxHeight} > ${rowHeight + SPACING}`);
      }
    }
    
    // No space in existing rows, create new row
    const maxY = existingBoxes.length > 0 
      ? Math.max(...existingBoxes.map(box => box.y + box.height))
      : MARGIN;
    
    const newRowY = maxY + SPACING;
    console.log(`   ✅ Creating new row at Y=${newRowY}: (${MARGIN}, ${newRowY})`);
    
    return { x: MARGIN, y: newRowY };
  };

  // Advanced content-based dynamic sizing system
  const calculateContentSize = (title: string, content: string) => {
    console.log('📐 Calculating size for:', title);
    console.log('   - Content length:', content.length, 'chars');
    
    // Analyze content complexity and length
    const titleLength = title.length;
    const contentLength = content.length;
    const newlineCount = (content.match(/\n/g) || []).length;
    const hasLaTeX = /\\[a-zA-Z]+|\$.*\$|\\\(.*\\\)/.test(content);
    const hasComplexMath = /\^|\{|\}|_|\\frac|\\sqrt|\\sum|\\int/.test(content);
    const wordCount = content.split(/\s+/).length;
    
    // Base dimensions
    let width = 180;
    let height = 120;
    
    // Title contribution
    if (titleLength > 20) width += Math.min(100, (titleLength - 20) * 3);
    if (titleLength > 30) height += 25;
    
    // Content length adjustments
    if (contentLength > 50) {
      width += Math.min(120, Math.floor((contentLength - 50) / 8));
    }
    
    // Line-based height calculation
    const estimatedLines = Math.max(1, newlineCount + Math.ceil(contentLength / 40));
    height += estimatedLines * 22;
    
    // LaTeX and math adjustments
    if (hasLaTeX) {
      width += 40;
      height += 30;
    }
    if (hasComplexMath) {
      width += 60;
      height += 40;
    }
    
    // Word density adjustments
    if (wordCount > 15) {
      height += Math.min(80, (wordCount - 15) * 4);
    }
    
    // Ensure reasonable bounds
    width = Math.max(160, Math.min(450, width));
    height = Math.max(100, Math.min(500, height));
    
    const finalSize = { width: Math.round(width), height: Math.round(height) };
    console.log('   - Calculated size:', `${finalSize.width}x${finalSize.height}`);
    
    return finalSize;
  };

  // FIXED: Bulk box creation with proper state handling
  const createMultipleBoxes = (mathFormulas: any[], requestedCount: number) => {
    console.log('🚀 Creating multiple boxes:', requestedCount);
    console.log('   - Current boxes count:', boxes.length);
    
    const numToCreate = Math.min(requestedCount, mathFormulas.length);
    const newBoxes: Box[] = [];
    
    for (let i = 0; i < numToCreate; i++) {
      const formula = mathFormulas[i];
      console.log(`📦 Creating box ${i + 1}:`, formula.title);
      
      const { width, height } = calculateContentSize(formula.title, formula.content);
      console.log('   - Calculated size:', `${width}x${height}`);
      
      // CRITICAL FIX: Use accumulated boxes for position calculation
      const currentBoxes = [...boxes, ...newBoxes];
      const position = findOptimalPosition(width, height, currentBoxes);
      console.log('   - Final position:', `(${position.x}, ${position.y})`);
      
      const newBox: Box = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        title: formula.title,
        content: formula.content,
        color: formula.color,
        x: position.x,
        y: position.y,
        width,
        height
      };
      
      newBoxes.push(newBox);
      console.log('   - Box created with ID:', newBox.id);
      console.log('   - Previous boxes count:', currentBoxes.length - 1, 'New count:', currentBoxes.length);
    }
    
    // Update state once with all new boxes
    setBoxes(prev => {
      const updated = [...prev, ...newBoxes];
      console.log('🎯 State updated - Total boxes:', updated.length);
      return updated;
    });
    
    console.log('✅ Bulk creation complete:', newBoxes.length, 'boxes added');
    return newBoxes.length;
  };

  // Send chat message mutation with FIXED bulk creation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      // If no default session, create one first
      if (!defaultSessionId) {
        await createNewChatSession();
      }
      
      const cheatSheetContent = JSON.stringify({ boxes }); // Send current boxes state
      const response = await fetch(`/api/chat-sessions/${defaultSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: message, 
          cheatSheetContent,
          cheatSheetId: id,
          workspaceType: 'cheatsheet' // Specify this is a cheat sheet workspace
        }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: (response: any) => {
      refetchMessages();
      setChatInput('');
      
      // Handle box creation from ChatGPT
      if (response.createBox) {
        const { title, content, color = '#f0f9ff', x = 150, y = 150 } = response.createBox;
        addBox(title, content, color, x, y);
        toast({ title: `Created box: ${title}` });
      }
      
      // Handle multiple boxes creation
      if (response.createBoxes && Array.isArray(response.createBoxes)) {
        response.createBoxes.forEach((boxData: any, index: number) => {
          const { title, content, color = '#f0f9ff' } = boxData;
          const x = 150 + (index * 220); // Stagger boxes horizontally
          const y = 150 + (index * 50); // Slightly offset vertically
          addBox(title, content, color, x, y);
        });
        toast({ title: `Created ${response.createBoxes.length} boxes` });
      }
      
      // Parse response content for box creation patterns and commands if no structured response
      if (response.content && !response.createBox && !response.createBoxes) {
        const content = response.content.toLowerCase();
        const originalMessage = chatInput.toLowerCase();
        
        // Enhanced box creation for multiple items with FIXED implementation
        const numberMatch = originalMessage.match(/(\d+)/);
        const requestedCount = numberMatch ? parseInt(numberMatch[1]) : 1;
        
        // Check if user wants multiple math equations/formulas
        if ((originalMessage.includes('math') || originalMessage.includes('formula') || originalMessage.includes('equation') || originalMessage.includes('physics')) && requestedCount > 1) {
          const mathFormulas = [
            { title: 'Newton\'s Second Law', content: 'F = ma', color: 'from-blue-50 to-blue-100' },
            { title: 'Gravitational Force', content: 'F = G(m₁m₂)/r²', color: 'from-green-50 to-green-100' },
            { title: 'Kinetic Energy', content: 'KE = ½mv²', color: 'from-red-50 to-red-100' },
            { title: 'Work Done', content: 'W = Fd cos θ', color: 'from-purple-50 to-purple-100' },
            { title: 'Ohm\'s Law', content: 'V = IR', color: 'from-yellow-50 to-yellow-100' },
            { title: 'Wave Speed', content: 'v = fλ', color: 'from-indigo-50 to-indigo-100' },
            { title: 'Mass-Energy', content: 'E = mc²', color: 'from-pink-50 to-pink-100' },
            { title: 'Coulomb\'s Law', content: 'F = k|q₁q₂|/r²', color: 'from-cyan-50 to-cyan-100' },
            { title: 'Momentum', content: 'p = mv', color: 'from-orange-50 to-orange-100' },
            { title: 'Ideal Gas Law', content: 'PV = nRT', color: 'from-teal-50 to-teal-100' },
            { title: 'Power Rule', content: 'd/dx x^n = nx^(n-1)', color: 'from-blue-50 to-blue-100' },
            { title: 'Product Rule', content: 'd/dx [u(x)v(x)] = u\'(x)v(x) + u(x)v\'(x)', color: 'from-green-50 to-green-100' },
            { title: 'Quotient Rule', content: 'd/dx [u(x)/v(x)] = [u\'(x)v(x) - u(x)v\'(x)] / [v(x)]²', color: 'from-purple-50 to-purple-100' },
            { title: 'Chain Rule', content: 'd/dx f(g(x)) = f\'(g(x)) · g\'(x)', color: 'from-pink-50 to-pink-100' },
            { title: 'Sum Rule', content: 'd/dx [f(x) + g(x)] = f\'(x) + g\'(x)', color: 'from-yellow-50 to-yellow-100' },
            { title: 'Exponential', content: 'd/dx e^x = e^x', color: 'from-red-50 to-red-100' },
            { title: 'Logarithm', content: 'd/dx ln x = 1/x', color: 'from-orange-50 to-orange-100' },
            { title: 'Sine Function', content: 'd/dx sin x = cos x', color: 'from-teal-50 to-teal-100' },
            { title: 'Cosine Function', content: 'd/dx cos x = -sin x', color: 'from-indigo-50 to-indigo-100' },
            { title: 'Tangent Function', content: 'd/dx tan x = sec² x', color: 'from-cyan-50 to-cyan-100' },
            { title: 'Pythagorean Theorem', content: 'a² + b² = c²', color: 'from-blue-50 to-blue-100' },
            { title: 'Quadratic Formula', content: 'x = (-b ± √(b² - 4ac)) / 2a', color: 'from-green-50 to-green-100' },
            { title: 'Distance Formula', content: 'd = √[(x₂-x₁)² + (y₂-y₁)²]', color: 'from-purple-50 to-purple-100' },
            { title: 'Slope Formula', content: 'm = (y₂-y₁)/(x₂-x₁)', color: 'from-pink-50 to-pink-100' },
            { title: 'Area of Circle', content: 'A = πr²', color: 'from-yellow-50 to-yellow-100' },
            { title: 'Circumference', content: 'C = 2πr', color: 'from-red-50 to-red-100' },
            { title: 'Volume of Sphere', content: 'V = (4/3)πr³', color: 'from-orange-50 to-orange-100' },
            { title: 'Surface Area Sphere', content: 'SA = 4πr²', color: 'from-teal-50 to-teal-100' },
            { title: 'Law of Cosines', content: 'c² = a² + b² - 2ab cos C', color: 'from-indigo-50 to-indigo-100' },
            { title: 'Law of Sines', content: 'a/sin A = b/sin B = c/sin C', color: 'from-cyan-50 to-cyan-100' }
          ];
          
          // FIXED: Use the new bulk creation function
          const createdCount = createMultipleBoxes(mathFormulas, requestedCount);
          toast({ title: `Created ${createdCount} formula boxes with proper Tetris layout!` });
          return;
        }
        
        // Rest of the existing command handling code...
        // [All the other command handling code remains the same]
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
  }, [cheatSheet, chatSessions, defaultSessionId]);

  // Intelligent horizontal-first layout engine (proper Tetris style)
  const relayoutAllBoxes = () => {
    if (boxes.length === 0) return;
    
    console.log('🔄 Re-layouting all boxes...');
    const repositionedBoxes: Box[] = [];
    
    // Sort boxes by height first (shorter boxes fill gaps better), then by width
    const sortedBoxes = [...boxes].sort((a, b) => {
      if (a.height !== b.height) return a.height - b.height;
      return a.width - b.width;
    });
    
    sortedBoxes.forEach((box, index) => {
      const position = findOptimalPosition(box.width, box.height, repositionedBoxes);
      repositionedBoxes.push({
        ...box,
        x: position.x,
        y: position.y
      });
      console.log(`📦 Repositioned box ${index + 1}: ${box.title} -> (${position.x}, ${position.y})`);
    });
    
    setBoxes(repositionedBoxes);
    console.log('✅ Re-layout complete');
  };

  // Box management functions with intelligent placement
  const addBox = (title: string, content: string, color: string = 'from-blue-50 to-blue-100', x?: number, y?: number) => {
    const { width, height } = calculateContentSize(title, content);
    
    // Use provided coordinates or find optimal position
    const position = (x !== undefined && y !== undefined) 
      ? { x, y } 
      : findOptimalPosition(width, height, boxes);
    
    const newBox: Box = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title,
      content,
      color,
      x: position.x,
      y: position.y,
      width,
      height
    };
    
    setBoxes(prev => [...prev, newBox]);
    return newBox.id;
  };

  const updateBox = (id: string, updates: Partial<Box>) => {
    setBoxes(prev => prev.map(box => 
      box.id === id ? { ...box, ...updates } : box
    ));
  };

  const deleteBox = (id: string) => {
    setBoxes(prev => prev.filter(box => box.id !== id));
    if (selectedBox === id) {
      setSelectedBox(null);
    }
  };

  // Get box number for ChatGPT commands
  const getBoxNumber = (boxId: string): number => {
    const boxIndex = boxes.findIndex(box => box.id === boxId);
    return boxIndex + 1; // 1-based numbering for user-friendly commands
  };

  const saveCheatSheet = () => {
    // Auto-save functionality - update the cheat sheet with current boxes
    if (id && id !== 'new') {
      updateCheatSheetMutation.mutate({
        content: JSON.stringify(boxes),
      });
    }
  };

  // Create cheat sheet mutation
  const createCheatSheetMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/cheatsheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `New Cheat Sheet ${new Date().toLocaleDateString()}`,
          content: '<p>Start building your cheat sheet...</p>',
        }),
      });
      if (!response.ok) throw new Error('Failed to create cheat sheet');
      return response.json();
    },
    onSuccess: (newCheatSheet) => {
      refetchCheatSheets();
      window.location.href = `/cheatsheet-new/${newCheatSheet.id}`;
    },
  });

  if (cheatSheetLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading cheat sheet...</p>
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
            <Grid3X3 className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{cheatSheet?.title || 'Cheat Sheet'}</h1>
          </div>
          <Button variant="outline" size="sm">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>

        {/* Main toolbar content - simplified for focus */}
        <div className="p-3">
          <div className="flex items-center justify-center">
            <Button
              onClick={() => {
                const mathFormulas = [
                  { title: "Newton's Second Law", content: "F = ma", color: "from-blue-50 to-blue-100" },
                  { title: "Gravitational Force", content: "F = G(m₁m₂)/r²", color: "from-green-50 to-green-100" },
                  { title: "Kinetic Energy", content: "KE = ½mv²", color: "from-red-50 to-red-100" },
                  { title: "Work Done", content: "W = Fd cos θ", color: "from-purple-50 to-purple-100" },
                  { title: "Ohm's Law", content: "V = IR", color: "from-yellow-50 to-yellow-100" },
                  { title: "Wave Speed", content: "v = fλ", color: "from-indigo-50 to-indigo-100" },
                  { title: "Mass-Energy", content: "E = mc²", color: "from-pink-50 to-pink-100" },
                  { title: "Coulomb's Law", content: "F = k|q₁q₂|/r²", color: "from-cyan-50 to-cyan-100" },
                  { title: "Momentum", content: "p = mv", color: "from-orange-50 to-orange-100" },
                  { title: "Ideal Gas Law", content: "PV = nRT", color: "from-teal-50 to-teal-100" }
                ];
                
                const createdCount = createMultipleBoxes(mathFormulas, 10);
                toast({ title: `Created ${createdCount} physics equations with proper Tetris layout!` });
              }}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Test: Create 10 Physics Equations
            </Button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left panel - Cheat Sheet History */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <div className="h-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border-r border-white/20">
            <div className="p-4 border-b border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <Grid3X3 className="w-5 h-5 mr-2" />
                    Cheat Sheets
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    All your cheat sheet documents
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => createCheatSheetMutation.mutate()}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  New Sheet
                </Button>
              </div>
            </div>
            
            <ScrollArea className="h-full p-4">
              <div className="space-y-2">
                {cheatSheets?.map((sheet: any) => (
                  <div key={sheet.id} className="group">
                    <div 
                      className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                        id === sheet.id
                          ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                          : 'bg-white/50 dark:bg-slate-700/50 border-white/30 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                      onClick={() => window.location.href = `/cheatsheet-new/${sheet.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 flex-1">
                          <Grid3X3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="font-medium text-gray-900 dark:text-white truncate">
                            {sheet.title}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(sheet.createdAt || Date.now()).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {!cheatSheets?.length && (
                  <div className="text-center py-8">
                    <Grid3X3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      No cheat sheets yet
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => createCheatSheetMutation.mutate()}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Create First Sheet
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Middle panel - Single Page Layout Area */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full bg-gray-100 dark:bg-gray-800 relative overflow-auto">
            {/* Single page workspace with proper containment */}
            <div className="absolute inset-0" style={{ minWidth: '816px' }}>
              {/* Single letter-size page guide */}
              <div
                className="absolute border-2 border-dashed border-gray-300 bg-white/50 rounded-lg mx-4 my-4"
                style={{
                  width: '816px',
                  minHeight: '1056px',
                  zIndex: 0
                }}
              >
                {/* Page header */}
                <div className="absolute top-2 right-4 text-xs text-gray-400">
                  Cheat Sheet • {boxes.length} boxes
                </div>
                
                {/* Working area margins guide */}
                <div 
                  className="absolute border border-blue-200 border-dashed"
                  style={{
                    top: '40px',
                    left: '40px',
                    width: '736px',
                    minHeight: '976px'
                  }}
                />
              </div>
            </div>
            
            {/* Boxes container */}
            <div className="absolute inset-0 z-10">
              {/* Render boxes */}
              {boxes.map((box, index) => (
                <AutoResizeMathBox
                  key={box.id}
                  id={box.id}
                  title={box.title}
                  content={box.content}
                  color={box.color}
                  position={{ x: box.x, y: box.y }}
                  size={{ width: box.width, height: box.height }}
                  boxNumber={index + 1}
                  isSelected={selectedBox === box.id}
                  onClick={() => setSelectedBox(box.id)}
                  onPositionChange={(position) => updateBox(box.id, position)}
                  onSizeChange={(size) => updateBox(box.id, size)}
                  onSaveRequest={saveCheatSheet}
                  onDelete={() => deleteBox(box.id)}
                  onEdit={() => {
                    const newTitle = prompt('Edit title:', box.title);
                    if (newTitle) updateBox(box.id, { title: newTitle });
                  }}
                />
              ))}

              {/* Empty state when no boxes */}
              {boxes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center py-16 max-w-md">
                    <Grid3X3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No boxes yet</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Ask the ChatGPT assistant to create content boxes for your cheat sheet or use the test button above</p>
                    <div className="space-y-2 text-sm text-gray-500 dark:text-gray-500">
                      <p>"create 10 physics equations"</p>
                      <p>"add 20 math formulas"</p>
                      <p>"make 15 chemistry definitions"</p>
                    </div>
                    
                    {/* Auto-layout button */}
                    <div className="mt-4">
                      <Button
                        onClick={relayoutAllBoxes}
                        className="w-full"
                        variant="outline"
                        disabled={boxes.length === 0}
                      >
                        <Grid3X3 className="w-4 h-4 mr-2" />
                        Auto-Layout Boxes
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Right panel - ChatGPT Interface */}
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
                      Always available • Cheat Sheet helper
                    </p>
                  </div>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="AI Active"></div>
              </div>
              
              {/* Smart AI Suggestions */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Quick Actions</h4>
                <div className="grid grid-cols-1 gap-1">
                  <button 
                    onClick={() => setChatInput('create 15 physics equations')}
                    className="w-full text-left p-2 text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700 transition-all duration-300 text-gray-700 dark:text-gray-300"
                  >
                    🧮 Create 15 physics equations
                  </button>
                  <button 
                    onClick={() => setChatInput('add 20 math formulas')}
                    className="w-full text-left p-2 text-xs bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-700 transition-all duration-300 text-gray-700 dark:text-gray-300"
                  >
                    📐 Add 20 math formulas
                  </button>
                  <button 
                    onClick={() => setChatInput('create 30 chemistry definitions')}
                    className="w-full text-left p-2 text-xs bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700 transition-all duration-300 text-gray-700 dark:text-gray-300"
                  >
                    🧪 Create 30 chemistry definitions
                  </button>
                </div>
              </div>
            </div>
            
            {/* Chat messages area */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              <div className="space-y-2">
                {chatMessages.length === 0 && (
                  <div className="text-center py-6">
                    <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2 text-sm">
                      Ready to Help!
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                      Try asking for multiple items:
                    </p>
                    <div className="text-xs text-gray-500 dark:text-gray-500 space-y-1">
                      <p>"create 10 physics equations"</p>
                      <p>"add 25 calculus formulas"</p>
                      <p>"make 50 chemistry facts"</p>
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
            
            {/* Chat input */}
            <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-gray-700 p-4">
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Textarea
                    placeholder="Ask me to help with your cheat sheet..."
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
                  Try: "create 15 physics equations", "add 30 math formulas"
                </p>
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}