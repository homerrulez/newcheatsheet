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

  // Send chat message mutation
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
        
        // Box-specific commands using numbers
        const deleteBoxMatch = originalMessage.match(/delete box (\d+)/);
        if (deleteBoxMatch) {
          const boxIndex = parseInt(deleteBoxMatch[1]) - 1;
          const targetBox = boxes[boxIndex];
          if (targetBox) {
            deleteBox(targetBox.id);
            toast({ title: `Deleted box ${deleteBoxMatch[1]}` });
          } else {
            toast({ title: `Box ${deleteBoxMatch[1]} not found`, variant: 'destructive' });
          }
          return;
        }
        
        const editBoxMatch = originalMessage.match(/edit box (\d+) to (.+)/);
        if (editBoxMatch) {
          const boxIndex = parseInt(editBoxMatch[1]) - 1;
          const newContent = editBoxMatch[2];
          const targetBox = boxes[boxIndex];
          if (targetBox) {
            updateBox(targetBox.id, { content: `<p>${newContent}</p>` });
            toast({ title: `Updated box ${editBoxMatch[1]}` });
          } else {
            toast({ title: `Box ${editBoxMatch[1]} not found`, variant: 'destructive' });
          }
          return;
        }
        
        const highlightBoxMatch = originalMessage.match(/highlight (?:text in )?box (\d+)/);
        if (highlightBoxMatch) {
          const boxIndex = parseInt(highlightBoxMatch[1]) - 1;
          const targetBox = boxes[boxIndex];
          if (targetBox) {
            setSelectedBox(targetBox.id);
            // Add yellow highlight to the content
            const highlightedContent = targetBox.content.replace(/<p>/g, '<p><mark>').replace(/<\/p>/g, '</mark></p>');
            updateBox(targetBox.id, { content: highlightedContent });
            toast({ title: `Highlighted box ${highlightBoxMatch[1]}` });
          } else {
            toast({ title: `Box ${highlightBoxMatch[1]} not found`, variant: 'destructive' });
          }
          return;
        }
        
        const selectBoxMatch = originalMessage.match(/select box (\d+)/);
        if (selectBoxMatch) {
          const boxIndex = parseInt(selectBoxMatch[1]) - 1;
          const targetBox = boxes[boxIndex];
          if (targetBox) {
            setSelectedBox(targetBox.id);
            toast({ title: `Selected box ${selectBoxMatch[1]}` });
          } else {
            toast({ title: `Box ${selectBoxMatch[1]} not found`, variant: 'destructive' });
          }
          return;
        }
        
        // Move box commands
        const moveBoxMatch = originalMessage.match(/move box (\d+) to (.+)/);
        if (moveBoxMatch) {
          const boxIndex = parseInt(moveBoxMatch[1]) - 1;
          const position = moveBoxMatch[2];
          const targetBox = boxes[boxIndex];
          if (targetBox) {
            // Parse position (e.g., "top left", "center", "bottom right")
            let x = targetBox.x, y = targetBox.y;
            if (position.includes('left')) x = 100;
            if (position.includes('right')) x = 600;
            if (position.includes('center')) x = 400;
            if (position.includes('top')) y = 100;
            if (position.includes('bottom')) y = 500;
            if (position.includes('middle')) y = 300;
            
            updateBox(targetBox.id, { x, y });
            toast({ title: `Moved box ${moveBoxMatch[1]} to ${position}` });
          } else {
            toast({ title: `Box ${moveBoxMatch[1]} not found`, variant: 'destructive' });
          }
          return;
        }
        
        // Change box color commands
        const colorBoxMatch = originalMessage.match(/(?:change|make) box (\d+) (?:color |)(.+)/);
        if (colorBoxMatch) {
          const boxIndex = parseInt(colorBoxMatch[1]) - 1;
          const colorName = colorBoxMatch[2];
          const targetBox = boxes[boxIndex];
          if (targetBox) {
            // Map color names to Tailwind color classes
            const colorMap: { [key: string]: string } = {
              'blue': 'from-blue-100 to-blue-200',
              'red': 'from-red-100 to-red-200',
              'green': 'from-green-100 to-green-200',
              'yellow': 'from-yellow-100 to-yellow-200',
              'purple': 'from-purple-100 to-purple-200',
              'pink': 'from-pink-100 to-pink-200',
              'gray': 'from-gray-100 to-gray-200',
              'orange': 'from-orange-100 to-orange-200'
            };
            
            const newColor = colorMap[colorName] || 'from-blue-100 to-blue-200';
            updateBox(targetBox.id, { color: newColor });
            toast({ title: `Changed box ${colorBoxMatch[1]} to ${colorName}` });
          } else {
            toast({ title: `Box ${colorBoxMatch[1]} not found`, variant: 'destructive' });
          }
          return;
        }
        
        // Resize box commands
        const resizeBoxMatch = originalMessage.match(/(?:resize|make) box (\d+) (larger|smaller|big|small)/);
        if (resizeBoxMatch) {
          const boxIndex = parseInt(resizeBoxMatch[1]) - 1;
          const sizeChange = resizeBoxMatch[2];
          const targetBox = boxes[boxIndex];
          if (targetBox) {
            let newWidth = targetBox.width;
            let newHeight = targetBox.height;
            
            if (sizeChange === 'larger' || sizeChange === 'big') {
              newWidth = Math.min(600, targetBox.width + 50);
              newHeight = Math.min(400, targetBox.height + 30);
            } else if (sizeChange === 'smaller' || sizeChange === 'small') {
              newWidth = Math.max(150, targetBox.width - 50);
              newHeight = Math.max(100, targetBox.height - 30);
            }
            
            updateBox(targetBox.id, { width: newWidth, height: newHeight });
            toast({ title: `Resized box ${resizeBoxMatch[1]}` });
          } else {
            toast({ title: `Box ${resizeBoxMatch[1]} not found`, variant: 'destructive' });
          }
          return;
        }

        // Copy box commands
        const copyBoxMatch = originalMessage.match(/copy box (\d+)/);
        if (copyBoxMatch) {
          const boxIndex = parseInt(copyBoxMatch[1]) - 1;
          const targetBox = boxes[boxIndex];
          if (targetBox) {
            const newBox: Box = {
              ...targetBox,
              id: Date.now().toString(),
              x: targetBox.x + 20,
              y: targetBox.y + 20,
              title: `${targetBox.title} (Copy)`
            };
            setBoxes(prev => [...prev, newBox]);
            toast({ title: `Copied box ${copyBoxMatch[1]}` });
          } else {
            toast({ title: `Box ${copyBoxMatch[1]} not found`, variant: 'destructive' });
          }
          return;
        }

        // Change box title commands
        const titleBoxMatch = originalMessage.match(/(?:change|rename) box (\d+) title to (.+)/);
        if (titleBoxMatch) {
          const boxIndex = parseInt(titleBoxMatch[1]) - 1;
          const newTitle = titleBoxMatch[2];
          const targetBox = boxes[boxIndex];
          if (targetBox) {
            updateBox(targetBox.id, { title: newTitle });
            toast({ title: `Changed box ${titleBoxMatch[1]} title` });
          } else {
            toast({ title: `Box ${titleBoxMatch[1]} not found`, variant: 'destructive' });
          }
          return;
        }

        // Clear all boxes command
        if (originalMessage.includes('clear all boxes') || originalMessage.includes('delete all boxes')) {
          setBoxes([]);
          setSelectedBox(null);
          toast({ title: 'Cleared all boxes' });
          return;
        }

        // Count boxes command
        if (originalMessage.includes('how many boxes') || originalMessage.includes('count boxes')) {
          const count = boxes.length;
          const countMessage = {
            role: 'assistant' as const,
            content: `There are currently **${count}** boxes in your cheat sheet.`,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, countMessage]);
          toast({ title: `${count} boxes total` });
          return;
        }
        
        // Help commands
        if (originalMessage.includes('help') || originalMessage.includes('commands')) {
          // Add a detailed help message directly to chat
          const helpMessage = {
            role: 'assistant' as const,
            content: `**Complete ChatGPT Box Command System:**

📦 **Creation Commands:**
• "create formulas" - Add math formula boxes
• "add definitions" - Add definition boxes  
• "make a summary" - Add summary boxes

🎯 **Box Manipulation:**
• "delete box 3" - Remove specific box
• "edit box 2 to New Content" - Change box content
• "highlight box 1" - Add yellow highlighting
• "select box 4" - Focus on specific box
• "copy box 2" - Duplicate a box with slight offset

📝 **Content & Title Management:**
• "change box 3 title to New Title" - Rename box title
• "rename box 1 title to Math Rules" - Alternative rename syntax

🎨 **Styling Commands:**
• "make box 3 red" - Change colors (red, blue, green, yellow, purple, pink, gray, orange)
• "resize box 1 larger" - Make bigger/smaller (big, small alternatives)
• "move box 2 to top left" - Reposition (top/bottom/center + left/right/center)

🧹 **Bulk Operations:**
• "clear all boxes" - Remove all boxes from workspace
• "delete all boxes" - Alternative clear command
• "how many boxes" - Count total boxes
• "count boxes" - Alternative count command

💡 **Pro Tips:**
• Boxes are automatically numbered starting from 1
• Commands execute instantly without page refresh
• Use natural language - the system understands variations
• Type "help commands" anytime for this reference`,
            timestamp: new Date().toISOString()
          };
          
          // Add to current messages
          setMessages(prev => [...prev, helpMessage]);
          
          toast({
            title: "Box Commands Available",
            description: "Complete command list added to chat",
            duration: 3000
          });
          return;
        }
        
        // Enhanced box creation for multiple items
        const numberMatch = originalMessage.match(/(\d+)/);
        const requestedCount = numberMatch ? parseInt(numberMatch[1]) : 1;
        
        // Check if user wants multiple math equations/formulas
        if ((originalMessage.includes('math') || originalMessage.includes('formula') || originalMessage.includes('equation')) && requestedCount > 1) {
          const mathFormulas = [
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
            { title: 'Integral Power', content: '∫ x^n dx = x^(n+1)/(n+1) + C, n ≠ -1', color: 'from-blue-50 to-blue-100' },
            { title: 'Integral Exponential', content: '∫ e^x dx = e^x + C', color: 'from-green-50 to-green-100' },
            { title: 'Integral Sine', content: '∫ sin x dx = -cos x + C', color: 'from-purple-50 to-purple-100' },
            { title: 'Integral Cosine', content: '∫ cos x dx = sin x + C', color: 'from-pink-50 to-pink-100' },
            { title: 'Pythagorean Theorem', content: 'a² + b² = c²', color: 'from-yellow-50 to-yellow-100' },
            { title: 'Quadratic Formula', content: 'x = (-b ± √(b² - 4ac)) / 2a', color: 'from-red-50 to-red-100' },
            { title: 'Distance Formula', content: 'd = √[(x₂-x₁)² + (y₂-y₁)²]', color: 'from-orange-50 to-orange-100' },
            { title: 'Slope Formula', content: 'm = (y₂-y₁)/(x₂-x₁)', color: 'from-teal-50 to-teal-100' },
            { title: 'Area of Circle', content: 'A = πr²', color: 'from-indigo-50 to-indigo-100' },
            { title: 'Circumference', content: 'C = 2πr', color: 'from-cyan-50 to-cyan-100' },
            { title: 'Volume of Sphere', content: 'V = (4/3)πr³', color: 'from-blue-50 to-blue-100' },
            { title: 'Surface Area Sphere', content: 'SA = 4πr²', color: 'from-green-50 to-green-100' },
            { title: 'Law of Cosines', content: 'c² = a² + b² - 2ab cos C', color: 'from-purple-50 to-purple-100' },
            { title: 'Law of Sines', content: 'a/sin A = b/sin B = c/sin C', color: 'from-pink-50 to-pink-100' },
            { title: 'Binomial Theorem', content: '(a+b)^n = Σ(k=0 to n) C(n,k) a^(n-k) b^k', color: 'from-yellow-50 to-yellow-100' },
            { title: 'Fundamental Theorem', content: '∫[a to b] f\'(x) dx = f(b) - f(a)', color: 'from-red-50 to-red-100' },
            { title: 'L\'Hôpital\'s Rule', content: 'lim[x→c] f(x)/g(x) = lim[x→c] f\'(x)/g\'(x)', color: 'from-orange-50 to-orange-100' },
            { title: 'Taylor Series', content: 'f(x) = Σ(n=0 to ∞) f^(n)(a)(x-a)^n/n!', color: 'from-teal-50 to-teal-100' },
            { title: 'Euler\'s Formula', content: 'e^(ix) = cos x + i sin x', color: 'from-indigo-50 to-indigo-100' },
            { title: 'Integration by Parts', content: '∫ u dv = uv - ∫ v du', color: 'from-cyan-50 to-cyan-100' },
            { title: 'Mean Value Theorem', content: 'f\'(c) = [f(b) - f(a)] / (b - a)', color: 'from-blue-50 to-blue-100' },
            { title: 'Rolle\'s Theorem', content: 'If f(a) = f(b), then ∃c: f\'(c) = 0', color: 'from-green-50 to-green-100' },
            { title: 'Partial Derivatives', content: '∂f/∂x = lim[h→0] [f(x+h,y) - f(x,y)]/h', color: 'from-purple-50 to-purple-100' },
            { title: 'Divergence Theorem', content: '∫∫∫ ∇·F dV = ∫∫ F·n dS', color: 'from-pink-50 to-pink-100' },
            { title: 'Green\'s Theorem', content: '∮ P dx + Q dy = ∫∫ (∂Q/∂x - ∂P/∂y) dA', color: 'from-yellow-50 to-yellow-100' },
            { title: 'Stokes\' Theorem', content: '∮ F·dr = ∫∫ (∇×F)·n dS', color: 'from-red-50 to-red-100' },
            { title: 'Cauchy-Schwarz', content: '|⟨u,v⟩| ≤ ||u|| ||v||', color: 'from-orange-50 to-orange-100' },
            { title: 'Triangle Inequality', content: '||u + v|| ≤ ||u|| + ||v||', color: 'from-teal-50 to-teal-100' },
            { title: 'Fourier Series', content: 'f(x) = a₀/2 + Σ[aₙcos(nx) + bₙsin(nx)]', color: 'from-indigo-50 to-indigo-100' },
            { title: 'Laplace Transform', content: 'L{f(t)} = ∫₀^∞ e^(-st) f(t) dt', color: 'from-cyan-50 to-cyan-100' },
            { title: 'Matrix Determinant', content: 'det(A) = Σ sgn(σ) ∏ aᵢ,σ(i)', color: 'from-blue-50 to-blue-100' },
            { title: 'Eigenvalue Equation', content: 'Av = λv', color: 'from-green-50 to-green-100' },
            { title: 'Characteristic Polynomial', content: 'det(A - λI) = 0', color: 'from-purple-50 to-purple-100' },
            { title: 'Bayes\' Theorem', content: 'P(A|B) = P(B|A)P(A) / P(B)', color: 'from-pink-50 to-pink-100' },
            { title: 'Normal Distribution', content: 'f(x) = (1/σ√2π) e^(-(x-μ)²/2σ²)', color: 'from-yellow-50 to-yellow-100' },
            { title: 'Chi-Square Test', content: 'χ² = Σ (Oᵢ - Eᵢ)² / Eᵢ', color: 'from-red-50 to-red-100' },
            { title: 'Confidence Interval', content: 'x̄ ± z(α/2) · σ/√n', color: 'from-orange-50 to-orange-100' },
            { title: 'Regression Line', content: 'y = mx + b, m = Σ(xy)/Σ(x²)', color: 'from-teal-50 to-teal-100' },
            { title: 'Complex Numbers', content: 'z = a + bi, |z| = √(a² + b²)', color: 'from-indigo-50 to-indigo-100' },
            { title: 'De Moivre\'s Formula', content: '(cos θ + i sin θ)ⁿ = cos(nθ) + i sin(nθ)', color: 'from-cyan-50 to-cyan-100' }
          ];
          
          const numToCreate = Math.min(requestedCount, mathFormulas.length);
          
          // Add boxes sequentially - positioning will be handled by Tetris layout
          for (let i = 0; i < numToCreate; i++) {
            const formula = mathFormulas[i];
            // Start with temporary position - Tetris algorithm will place optimally
            addBox(formula.title, formula.content, formula.color, 0, 0);
          }
          
          toast({ title: `Created ${createdCount} math formula boxes` });
          return;
        }
        
        // Single box creation fallbacks
        if (content.includes('formula') || content.includes('equation')) {
          addBox('Power Rule for Differentiation', 'd/dx x^n = nx^(n-1)', 'from-blue-50 to-blue-100', 150, 150);
          toast({ title: 'Created formula box' });
        }
        
        if (content.includes('definition') || content.includes('key terms')) {
          addBox('Sum Rule for Differentiation', 'd/dx [f(x) + g(x)] = d/dx f(x) + d/dx g(x)', 'from-green-50 to-green-100', 380, 150);
          toast({ title: 'Created definitions box' });
        }
        
        if (content.includes('summary') || content.includes('overview')) {
          addBox('Chain Rule for Differentiation', 'd/dx f(g(x)) = f\'(g(x)) · g\'(x)', 'from-purple-50 to-purple-100', 150, 320);
          toast({ title: 'Created summary box' });
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
  }, [cheatSheet, chatSessions, defaultSessionId]);

  // Correct Tetris-style placement: Fill horizontal space first, then move down
  const findOptimalPosition = (newBoxWidth: number, newBoxHeight: number, existingBoxes: Box[]) => {
    const PAGE_WIDTH = 816;
    const MARGIN = 40;
    const SPACING = 8;
    const usableWidth = PAGE_WIDTH - (2 * MARGIN);
    
    if (existingBoxes.length === 0) {
      return { x: MARGIN, y: MARGIN };
    }
    
    // Get all existing box positions and create a grid
    const occupied = new Set<string>();
    existingBoxes.forEach(box => {
      for (let x = box.x; x < box.x + box.width; x += SPACING) {
        for (let y = box.y; y < box.y + box.height; y += SPACING) {
          occupied.add(`${x},${y}`);
        }
      }
    });
    
    // Find rows by identifying Y positions with boxes
    const usedYPositions = [...new Set(existingBoxes.map(box => box.y))].sort((a, b) => a - b);
    
    // Try to fit in existing rows first (fill horizontal space)
    for (const rowY of usedYPositions) {
      const rowBoxes = existingBoxes.filter(box => box.y === rowY);
      const rowHeight = Math.max(...rowBoxes.map(box => box.height));
      
      // Check if new box can fit in height of this row
      if (newBoxHeight <= rowHeight + SPACING) {
        // Find rightmost box in this row
        const rightmostX = Math.max(...rowBoxes.map(box => box.x + box.width));
        const testX = rightmostX + SPACING;
        
        // Check if it fits horizontally
        if (testX + newBoxWidth <= MARGIN + usableWidth) {
          // Verify no conflicts
          const hasConflict = existingBoxes.some(box => {
            return !(testX + newBoxWidth <= box.x || 
                    testX >= box.x + box.width || 
                    rowY + newBoxHeight <= box.y || 
                    rowY >= box.y + box.height);
          });
          
          if (!hasConflict) {
            return { x: testX, y: rowY };
          }
        }
      }
    }
    
    // No space in existing rows, create new row
    const maxY = existingBoxes.length > 0 
      ? Math.max(...existingBoxes.map(box => box.y + box.height))
      : MARGIN;
    
    return { x: MARGIN, y: maxY + SPACING };
  };

  // Advanced content-based dynamic sizing system
  const calculateContentSize = (title: string, content: string) => {
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
    
    return { width: Math.round(width), height: Math.round(height) };
  };

  // Intelligent horizontal-first layout engine (proper Tetris style)
  const relayoutAllBoxes = () => {
    if (boxes.length === 0) return;
    
    const PAGE_WIDTH = 816;
    const MARGIN = 40;
    const SPACING = 8;
    const usableWidth = PAGE_WIDTH - (2 * MARGIN);
    
    // Sort boxes by height first (shorter boxes fill gaps better), then by width
    const sortedBoxes = [...boxes].sort((a, b) => {
      if (a.height !== b.height) return a.height - b.height;
      return a.width - b.width;
    });
    
    const repositionedBoxes: Box[] = [];
    
    sortedBoxes.forEach(box => {
      const position = findOptimalPosition(box.width, box.height, repositionedBoxes);
      repositionedBoxes.push({
        ...box,
        x: position.x,
        y: position.y
      });
    });
    
    setBoxes(repositionedBoxes);
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
    
    // Auto-relayout after adding new box for optimal arrangement
    setTimeout(() => relayoutAllBoxes(), 100);
    
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
                variant="outline"
                onClick={() => {
                  if (selectedBox) {
                    const box = boxes.find(b => b.id === selectedBox);
                    if (box) {
                      const content = box.content.replace(/<[^>]*>/g, ''); // Strip existing HTML
                      const newContent = `<p><strong>${content}</strong></p>`;
                      updateBox(selectedBox, { content: newContent });
                      toast({ title: "Bold formatting applied to selected box" });
                    }
                  } else {
                    toast({ title: "Please select a box to format" });
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
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Ask the ChatGPT assistant to create content boxes for your cheat sheet</p>
                    <div className="space-y-2 text-sm text-gray-500 dark:text-gray-500">
                      <p>"create a formula box"</p>
                      <p>"add key definitions"</p>
                      <p>"make a summary section"</p>
                    </div>
                    
                    {/* Quick add button for testing */}
                    <div className="space-y-2 mt-4">
                      <Button
                        onClick={() => addBox(
                          'Power Rule', 
                          'd/dx x^n = nx^(n-1)'
                        )}
                        className="w-full"
                        variant="outline"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Sample Box
                      </Button>
                      <Button
                        onClick={relayoutAllBoxes}
                        className="w-full"
                        variant="outline"
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
                      Always available • Cheat Sheet helper
                    </p>
                  </div>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="AI Active"></div>
              </div>
              
              {/* Smart AI Suggestions - Compact */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Quick Actions</h4>
                <div className="grid grid-cols-1 gap-1">
                  <button 
                    onClick={() => setChatInput('create a formula box')}
                    className="w-full text-left p-2 text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700 transition-all duration-300 text-gray-700 dark:text-gray-300"
                  >
                    📊 Create formula box
                  </button>
                  <button 
                    onClick={() => setChatInput('add key definitions box')}
                    className="w-full text-left p-2 text-xs bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-700 transition-all duration-300 text-gray-700 dark:text-gray-300"
                  >
                    📝 Add definitions box
                  </button>
                  <button 
                    onClick={() => setChatInput('create summary section')}
                    className="w-full text-left p-2 text-xs bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700 transition-all duration-300 text-gray-700 dark:text-gray-300"
                  >
                    🎯 Create summary box
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
                      <p>"create a formula section"</p>
                      <p>"add key definitions"</p>
                      <p>"organize this content"</p>
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
                  Try: "organize content", "add key points", "create sections"
                </p>
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}