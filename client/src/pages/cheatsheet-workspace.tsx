import { useState, useEffect, useCallback, useRef } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, Save, Printer, Plus, Grid3X3, Clock, SquareArrowOutUpLeft, RotateCcw,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, AlignLeft, AlignCenter, 
  AlignRight, AlignJustify, List, ListOrdered, Copy, Scissors, ClipboardPaste,
  Undo2, Redo2, Minus, Indent, Outdent, Type, Palette
} from 'lucide-react';
import ChatPanel from '@/components/chat-panel';
import LaTeXRenderer from '@/components/latex-renderer';
import AutoResizeMathBox from '@/components/auto-resize-math-box';
import DraggableTest from '@/components/draggable-test';
import WorkspaceSidebar from '@/components/workspace-sidebar';
import { CheatSheet, CheatSheetBox } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
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

export default function CheatSheetWorkspace() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [currentSheet, setCurrentSheet] = useState<CheatSheet | null>(null);
  const [boxes, setBoxes] = useState<CheatSheetBox[]>([]);
  const [boxPositions, setBoxPositions] = useState<Record<string, { x: number; y: number }>>({});
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

  const updateBoxPosition = useCallback((id: string, position: { x: number; y: number }) => {
    setBoxPositions(prev => ({ ...prev, [id]: position }));
    setBoxes(currentBoxes => 
      currentBoxes.map(box => 
        box.id === id ? { ...box, position } : box
      )
    );
  }, []);

  // Fetch cheat sheets list
  const { data: cheatSheets = [] } = useQuery({
    queryKey: ['/api/cheatsheets'],
  });

  // Fetch current cheat sheet
  const { data: cheatSheet } = useQuery({
    queryKey: ['/api/cheatsheets', id],
    enabled: !!id,
  });

  useEffect(() => {
    if (cheatSheet) {
      setCurrentSheet(cheatSheet as CheatSheet);
      const loadedBoxes = Array.isArray((cheatSheet as CheatSheet).boxes) ? (cheatSheet as CheatSheet).boxes as CheatSheetBox[] : [];
      setBoxes(loadedBoxes);
      
      // Initialize positions for loaded boxes if not already set
      const newPositions: Record<string, { x: number; y: number }> = {};
      loadedBoxes.forEach((box, index) => {
        if (box.position) {
          newPositions[box.id] = box.position;
        } else {
          // Calculate initial grid position
          const boxIndex = index % 15; // 15 boxes per page
          newPositions[box.id] = {
            x: 40 + (boxIndex % 3) * 200,
            y: 60 + Math.floor(boxIndex / 3) * 150
          };
        }
      });
      setBoxPositions(prev => ({ ...prev, ...newPositions }));
    } else if (!id && Array.isArray(cheatSheets) && cheatSheets.length > 0) {
      const firstSheet = cheatSheets[0] as CheatSheet;
      setCurrentSheet(firstSheet);
      setBoxes(Array.isArray(firstSheet.boxes) ? firstSheet.boxes as CheatSheetBox[] : []);
    }
  }, [cheatSheet, cheatSheets, id]);

  // Create new cheat sheet
  const createSheetMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/cheatsheets', {
      title: 'New Cheat Sheet',
      boxes: []
    }),
    onSuccess: async (response) => {
      const newSheet = await response.json();
      queryClient.invalidateQueries({ queryKey: ['/api/cheatsheets'] });
      setCurrentSheet(newSheet);
      setBoxes([]);
      navigate(`/cheatsheet/${newSheet.id}`);
    },
  });

  // Save cheat sheet
  const saveSheetMutation = useMutation({
    mutationFn: () => {
      if (!currentSheet) throw new Error('No cheat sheet selected');
      return apiRequest('PUT', `/api/cheatsheets/${currentSheet.id}`, {
        boxes,
        updatedAt: new Date()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cheatsheets'] });
      toast({
        title: "Cheat sheet saved",
        description: "Your cheat sheet has been saved successfully.",
      });
    },
  });

  const handlePrint = () => {
    if (boxes.length === 0) {
      toast({
        title: "Nothing to print",
        description: "Please add some content first.",
        variant: "destructive"
      });
      return;
    }

    // Create a printable version
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${currentSheet?.title || 'Cheat Sheet'}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
              .box { border: 2px solid #ccc; border-radius: 8px; padding: 16px; break-inside: avoid; }
              .title { font-weight: bold; margin-bottom: 8px; color: #333; }
              .content { font-size: 14px; line-height: 1.4; }
              @media print { body { margin: 10px; } .box { page-break-inside: avoid; } }
            </style>
          </head>
          <body>
            <h1>${currentSheet?.title || 'Cheat Sheet'}</h1>
            <div class="grid">
              ${boxes.map(box => `
                <div class="box">
                  <div class="title">${box.title}</div>
                  <div class="content">${box.content}</div>
                </div>
              `).join('')}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }

    toast({
      title: "Opening print dialog",
      description: "Your cheat sheet is ready to print.",
    });
  };

  // Responsive masonry layout configuration
  const [layoutDensity, setLayoutDensity] = useState<'compact' | 'balanced' | 'spacious'>('balanced');
  const [boxesPerPage, setBoxesPerPage] = useState(12);
  
  const LAYOUT_CONFIG = {
    pageWidth: 620,
    pageHeight: 800,
    margin: 30,
    minBoxWidth: 160,
    maxBoxWidth: 420,
    minBoxHeight: 90,
    maxBoxHeight: 380,
    gutter: 12,
    get contentWidth() { return this.pageWidth - (2 * this.margin); },
    get contentHeight() { return this.pageHeight - (2 * this.margin); },
    get columns() { 
      // Dynamic columns based on content width and density
      const densityFactors = { compact: 4, balanced: 3, spacious: 2 };
      return Math.max(2, densityFactors[layoutDensity] || 3);
    }
  };

  // Advanced content-aware size analysis
  const analyzeBoxContent = useCallback((box: CheatSheetBox) => {
    const content = box.content || '';
    const hasImages = content.match(/\.(jpg|jpeg|png|gif|svg|webp)/i);
    const hasLongText = content.length > 200;
    const isMultiLine = content.includes('\n') || content.includes('<br>') || content.split(' ').length > 15;
    const isMathFormula = content.includes('\\') || content.includes('=') || content.includes('^') || content.includes('frac');
    const isComplexMath = content.includes('\\sum') || content.includes('\\int') || content.includes('\\sqrt') || content.includes('matrix');
    
    let optimalWidth, optimalHeight, shape;
    
    if (hasImages) {
      // Wide rectangles for image content
      optimalWidth = Math.min(400, Math.max(280, content.length * 2));
      optimalHeight = Math.min(300, Math.max(200, 240));
      shape = 'wide';
    } else if (isComplexMath) {
      // Wide boxes for complex mathematical expressions
      optimalWidth = Math.min(360, Math.max(240, content.length * 3));
      optimalHeight = Math.min(200, Math.max(140, 160));
      shape = 'wide';
    } else if (hasLongText && isMultiLine) {
      // Tall rectangles for long text content
      const lines = content.split(/\n|<br>|\. /).length;
      optimalWidth = Math.min(280, Math.max(200, Math.sqrt(content.length) * 12));
      optimalHeight = Math.min(400, Math.max(180, lines * 30 + 60));
      shape = 'tall';
    } else if (isMathFormula) {
      // Square-ish for simple math formulas
      optimalWidth = Math.min(240, Math.max(180, content.length * 2.5));
      optimalHeight = Math.min(180, Math.max(120, 140));
      shape = 'square';
    } else {
      // Square for standard short content
      const baseSize = Math.min(220, Math.max(160, content.length * 1.8));
      optimalWidth = baseSize;
      optimalHeight = Math.min(160, Math.max(100, baseSize * 0.8));
      shape = 'square';
    }
    
    // Assign priority based on content complexity
    let priority = 1;
    if (isComplexMath) priority = 4;
    else if (isMathFormula) priority = 3;
    else if (hasImages) priority = 2;
    else if (hasLongText) priority = 2;
    
    return {
      width: Math.round(optimalWidth / 20) * 20, // Round to 20px increments
      height: Math.round(optimalHeight / 20) * 20,
      area: optimalWidth * optimalHeight,
      aspectRatio: optimalWidth / optimalHeight,
      shape,
      contentType: isComplexMath ? 'complex-math' : isMathFormula ? 'math' : hasLongText ? 'long-text' : hasImages ? 'image' : 'standard',
      priority
    };
  }, []);

  // Fixed page-aware masonry layout with proper cross-page distribution
  const calculateMasonryLayout = useCallback((allBoxes: CheatSheetBox[]) => {
    const { pageWidth, pageHeight, margin, gutter, contentWidth, contentHeight, columns } = LAYOUT_CONFIG;
    
    if (allBoxes.length === 0) return [];
    
    // Calculate viewport positioning
    const estimatedMiddlePanelWidth = window.innerWidth - 256 - 448;
    const centerOffsetX = Math.max(20, (estimatedMiddlePanelWidth - pageWidth) / 2);
    
    // Analyze and size all boxes with consistent sizing
    const boxesWithSizes = allBoxes.map(box => ({
      ...box,
      optimalSize: analyzeBoxContent(box)
    }));
    
    // Use simple sequential placement instead of priority sorting to maintain order
    const columnWidth = (contentWidth - (columns - 1) * gutter) / columns;
    const positions: Array<{ x: number; y: number; width: number; height: number }> = [];
    
    // Track column heights across ALL pages globally
    const allPageColumnHeights: Record<number, number[]> = {};
    const maxContentPerPage = contentHeight - (2 * margin);
    
    // Calculate how many boxes per page based on average box height
    const avgBoxHeight = 140; // Average expected box height
    const boxesPerPageEstimate = Math.floor(maxContentPerPage / (avgBoxHeight + gutter)) * columns;
    const totalPagesNeeded = Math.ceil(allBoxes.length / boxesPerPageEstimate);
    
    // Initialize all pages (up to 50+ pages as needed)
    for (let p = 0; p < Math.max(1, totalPagesNeeded); p++) {
      allPageColumnHeights[p] = new Array(columns).fill(margin);
    }
    
    // Distribute boxes evenly across pages using round-robin column placement
    allBoxes.forEach((box, boxIndex) => {
      const optimalSize = boxesWithSizes[boxIndex].optimalSize;
      const { width, height } = optimalSize;
      
      // Calculate which page this box should go on based on distribution
      const targetPageIndex = Math.floor(boxIndex / boxesPerPageEstimate);
      const pageIndex = Math.min(targetPageIndex, totalPagesNeeded - 1);
      
      // Get column heights for target page
      const columnHeights = allPageColumnHeights[pageIndex];
      
      // Find shortest column on target page
      let shortestColumn = 0;
      let shortestHeight = columnHeights[0];
      
      for (let col = 1; col < columns; col++) {
        if (columnHeights[col] < shortestHeight) {
          shortestHeight = columnHeights[col];
          shortestColumn = col;
        }
      }
      
      // Calculate position
      const pageYBase = 60 + margin + (pageIndex * (pageHeight + 40));
      const finalWidth = Math.min(width, columnWidth);
      const x = centerOffsetX + margin + shortestColumn * (columnWidth + gutter);
      const y = pageYBase + columnHeights[shortestColumn];
      
      // Ensure box fits within page boundaries
      const maxY = pageYBase + contentHeight - height - margin;
      const clampedY = Math.min(y, maxY);
      
      // Update column height for next box
      columnHeights[shortestColumn] += height + gutter;
      
      // Store position
      positions[boxIndex] = { 
        x, 
        y: clampedY, 
        width: finalWidth, 
        height 
      };
    });
    
    return positions;
  }, [layoutDensity, boxesPerPage, analyzeBoxContent]);

  // Proper grid positioning within the scrollable canvas
  const autoArrangeBoxes = useCallback(() => {
    if (boxes.length === 0) return;
    
    console.log('Auto-arranging', boxes.length, 'boxes');
    
    // Use simple absolute positioning that works with Draggable
    // The boxes are positioned within the scroll container which uses absolute positioning
    // Calculate positions relative to the scroll container, not absolute positioning
    const scrollContainer = document.querySelector('.overflow-auto');
    if (!scrollContainer) {
      console.log('Scroll container not found');
      return;
    }
    
    // Get page guide bounds to position relative to the page content
    const pageGuide = scrollContainer.querySelector('.border-dashed.bg-white\\/50');
    let baseX = 50; // Fallback
    let baseY = 80; // Fallback
    
    if (pageGuide) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const pageRect = pageGuide.getBoundingClientRect();
      
      // Position relative to the page guide within the scroll container
      baseX = pageRect.left - containerRect.left + 40; // 40px margin from page edge
      baseY = pageRect.top - containerRect.top + scrollContainer.scrollTop + 60; // Account for scroll
      
      console.log('Container positioning:', {
        containerRect,
        pageRect,
        scrollTop: scrollContainer.scrollTop,
        baseX,
        baseY
      });
    }
    
    const boxWidth = 180;
    const boxHeight = 120;
    const spacingX = 20;
    const spacingY = 20;
    const columns = 3; // Fixed 3 columns for consistent layout
    
    console.log('Canvas positioning:', { baseX, baseY, columns });
    
    setBoxes(currentBoxes => {
      return currentBoxes.map((box, index) => {
        const row = Math.floor(index / columns);
        const col = index % columns;
        
        const x = baseX + (col * (boxWidth + spacingX));
        const y = baseY + (row * (boxHeight + spacingY));
        
        return {
          ...box,
          position: { x, y },
          size: { width: boxWidth, height: boxHeight }
        };
      });
    });
  }, []);
  
  // Page boundary enforcement for new box creation
  const findNextAvailablePosition = useCallback((contentAnalysis: any) => {
    const { pageWidth, pageHeight, margin, gutter, contentWidth, contentHeight, columns } = LAYOUT_CONFIG;
    const estimatedMiddlePanelWidth = window.innerWidth - 256 - 448;
    const centerOffsetX = Math.max(20, (estimatedMiddlePanelWidth - pageWidth) / 2);
    const columnWidth = (contentWidth - (columns - 1) * gutter) / columns;
    
    // Track column heights per page for placement algorithm
    const pageColumnHeights: Record<number, number[]> = {};
    
    // Initialize all pages and analyze existing boxes
    const totalPages = Math.max(1, Math.ceil(boxes.length / boxesPerPage));
    for (let p = 0; p < totalPages + 1; p++) {
      pageColumnHeights[p] = new Array(columns).fill(0);
    }
    
    // Calculate existing box positions to update column heights
    boxes.forEach(box => {
      const pos = boxPositions[box.id];
      if (pos) {
        // Determine which page this box is on
        const pageYBase = 60; // Base offset for first page
        const pageIndex = Math.floor((pos.y - pageYBase) / (pageHeight + 40));
        const relativeY = pos.y - (pageYBase + pageIndex * (pageHeight + 40));
        
        // Determine which column this box is in
        const relativeX = pos.x - (centerOffsetX + margin);
        const columnIndex = Math.floor(relativeX / (columnWidth + gutter));
        
        if (pageColumnHeights[pageIndex] && columnIndex >= 0 && columnIndex < columns) {
          const boxHeight = box.size?.height || contentAnalysis.height;
          pageColumnHeights[pageIndex][columnIndex] = Math.max(
            pageColumnHeights[pageIndex][columnIndex],
            relativeY + boxHeight + gutter
          );
        }
      }
    });
    
    // Find best position on any page
    for (let pageIndex = 0; pageIndex <= totalPages; pageIndex++) {
      const columnHeights = pageColumnHeights[pageIndex];
      
      // Find shortest column on this page
      let shortestColumn = 0;
      let shortestHeight = columnHeights[0];
      
      for (let col = 1; col < columns; col++) {
        if (columnHeights[col] < shortestHeight) {
          shortestHeight = columnHeights[col];
          shortestColumn = col;
        }
      }
      
      // Check if box fits on this page
      const wouldFitY = shortestHeight + contentAnalysis.height;
      
      if (wouldFitY <= contentHeight - margin) {
        // Found a suitable position
        const pageYBase = 60 + pageIndex * (pageHeight + 40);
        return {
          x: centerOffsetX + margin + shortestColumn * (columnWidth + gutter),
          y: pageYBase + shortestHeight,
          pageIndex
        };
      }
    }
    
    // Fallback to new page if nothing fits
    const newPageIndex = totalPages;
    const pageYBase = 60 + newPageIndex * (pageHeight + 40);
    return {
      x: centerOffsetX + margin,
      y: pageYBase,
      pageIndex: newPageIndex
    };
  }, [boxes, boxPositions, boxesPerPage]);



  // Calculate total pages based on box distribution
  const calculateTotalPages = () => {
    if (boxes.length === 0) return 1;
    
    const { contentHeight, margin } = LAYOUT_CONFIG;
    const avgBoxHeight = 140;
    const gutter = 20;
    const columns = 3;
    
    const maxContentPerPage = contentHeight - (2 * margin);
    const boxesPerPageEstimate = Math.floor(maxContentPerPage / (avgBoxHeight + gutter)) * columns;
    
    return Math.max(1, Math.ceil(boxes.length / boxesPerPageEstimate));
  };
  
  const totalPages = calculateTotalPages();
  
  // Auto-arrange disabled since we're using direct positioning in render
  // useEffect(() => {
  //   if (boxes.length > 0) {
  //     console.log('Triggering auto-arrange for', boxes.length, 'boxes');
  //     
  //     // Simple delay to ensure state is ready
  //     const timer = setTimeout(() => {
  //       autoArrangeBoxes();
  //     }, 200);
  //     return () => clearTimeout(timer);
  //   }
  // }, [boxes.length, autoArrangeBoxes]);

  const handleAIResponse = useCallback((response: any) => {
    console.log('AI Response received in handleAIResponse:', response);
    
    // Handle box operations (delete, edit, etc.)
    if (response.operations && Array.isArray(response.operations)) {
      setBoxes(currentBoxes => {
        console.log('Processing operations, current boxes:', currentBoxes.length);
        let updatedBoxes = [...currentBoxes];
        
        response.operations.forEach((operation: any) => {
          const boxNumber = parseInt(operation.boxNumber);
          const boxIndex = boxNumber - 1; // Convert to 0-based index
          
          switch (operation.type) {
            case 'delete':
              if (boxIndex >= 0 && boxIndex < updatedBoxes.length) {
                updatedBoxes.splice(boxIndex, 1);
              }
              break;
            case 'edit':
            case 'replace':
              if (boxIndex >= 0 && boxIndex < updatedBoxes.length) {
                const existingBox = updatedBoxes[boxIndex];
                updatedBoxes[boxIndex] = {
                  ...existingBox,
                  title: operation.title || existingBox.title,
                  content: operation.content || existingBox.content
                };
              }
              break;
          }
        });
        
        return updatedBoxes;
      });
      
      // Trigger save after state update
      setTimeout(() => saveSheetMutation.mutate(), 100);
    }
    // Handle new boxes creation with immediate smart layout
    else if (response.boxes && Array.isArray(response.boxes)) {
      console.log('Creating new boxes with smart layout:', response.boxes.length, 'boxes');
      
      setBoxes(currentBoxes => {
        console.log('Current boxes before adding new ones:', currentBoxes.length);
        
        const newBoxes = response.boxes.map((box: any, index: number) => {
          return {
            id: `box-${Date.now()}-${index}`,
            title: box.title || 'Formula',
            content: box.content || '',
            color: box.color || getRandomColor(),
            position: { x: 0, y: 0 }, // Will be set by smart layout
            size: { width: 200, height: 120 } // Will be set by smart layout
          };
        });
        
        const allBoxes = [...currentBoxes, ...newBoxes];
        console.log('Final boxes count after adding:', allBoxes.length);
        
        // Apply smart layout immediately to all boxes
        setTimeout(() => {
          const layoutPositions = calculateMasonryLayout(allBoxes);
          const newPositions: Record<string, { x: number; y: number }> = {};
          
          const finalBoxes = allBoxes.map((box, index) => {
            const layout = layoutPositions[index];
            if (layout) {
              newPositions[box.id] = { x: layout.x, y: layout.y };
              return {
                ...box,
                position: { x: layout.x, y: layout.y },
                size: { width: layout.width, height: layout.height }
              };
            }
            return box;
          });
          
          setBoxes(finalBoxes);
          setBoxPositions(newPositions);
          saveSheetMutation.mutate();
        }, 50);
        
        return allBoxes;
      });
    }
    else {
      console.log('No boxes or operations found in response:', response);
    }
  }, [saveSheetMutation]);

  // Add new box function
  const addNewBox = useCallback(() => {
    const newBox: CheatSheetBox = {
      id: `box-${Date.now()}`,
      title: 'New Box',
      content: 'Enter your content here...',
      color: getRandomColor(),
      position: { x: 40, y: 60 },
      size: { width: 200, height: 120 }
    };
    
    setBoxes(prev => [...prev, newBox]);
    setBoxPositions(prev => ({ ...prev, [newBox.id]: newBox.position }));
    
    // Auto-save after adding
    setTimeout(() => saveSheetMutation.mutate(), 100);
    
    toast({
      title: "Box added",
      description: "New content box has been added to your cheat sheet.",
    });
  }, [saveSheetMutation, toast]);


  const updateBoxSize = useCallback((id: string, size: { width: number, height: number }) => {
    setBoxes(prev => prev.map(box => 
      box.id === id 
        ? { ...box, size: { width: Math.max(200, size.width), height: Math.max(100, size.height) } }
        : box
    ));
  }, []);

  // Auto-resize is now handled by ResizeObserver in AutoResizeMathBox component
  // This function is kept for compatibility but is no longer used for auto-sizing

  // ChatGPT positioning commands handler  
  const handleChatGPTPositioning = useCallback((command: string, boxId?: string, targetPage?: number, position?: string) => {
    const { pageWidth, pageHeight, margin, contentWidth, contentHeight } = LAYOUT_CONFIG;
    const estimatedMiddlePanelWidth = window.innerWidth - 256 - 448;
    const centerOffsetX = Math.max(20, (estimatedMiddlePanelWidth - pageWidth) / 2);
    
    if (!boxId) return false;
    
    const targetPageIndex = (targetPage || 1) - 1; // Convert to 0-based index
    const pageYBase = 60 + targetPageIndex * (pageHeight + 40);
    
    let newX = centerOffsetX + margin;
    let newY = pageYBase + margin;
    
    // Parse position commands
    if (position?.includes('top-right')) {
      newX = centerOffsetX + contentWidth - 200; // Assume 200px box width
      newY = pageYBase + margin;
    } else if (position?.includes('bottom-left')) {
      newX = centerOffsetX + margin;
      newY = pageYBase + contentHeight - 150; // Assume 150px box height
    } else if (position?.includes('center')) {
      newX = centerOffsetX + contentWidth / 2 - 100;
      newY = pageYBase + contentHeight / 2 - 75;
    }
    
    // Apply position
    setBoxPositions(prev => ({
      ...prev,
      [boxId]: { x: newX, y: newY }
    }));
    
    return true;
  }, []);

  const debounceAndSave = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (currentSheet) {
            saveSheetMutation.mutate();
          }
        }, 1000);
      };
    })(),
    [currentSheet, saveSheetMutation]
  );

  // Re-organize all boxes into proper grid layout
  const autoFitAllBoxes = useCallback(() => {
    // Simply trigger a re-render since boxes are now managed by CSS Grid
    setBoxes(prev => [...prev]);
    
    toast({
      title: "Grid layout refreshed",
      description: "All boxes positioned in structured 3-column grid layout.",
    });
  }, [toast]);

  // Advanced collision-free positioning with intelligent spacing and neat sequencing
  const applySmartLayout = useCallback(() => {
    if (boxes.length === 0) return;
    
    console.log('Applying collision-free smart layout to', boxes.length, 'boxes');
    
    const margin = LAYOUT_CONFIG.margin;
    const spacingBuffer = 20; // Extra spacing between boxes to prevent touching
    const gutter = LAYOUT_CONFIG.gutter + spacingBuffer;
    const columns = LAYOUT_CONFIG.columns;
    const estimatedMiddlePanelWidth = window.innerWidth - 256 - 448;
    const centerOffsetX = Math.max(20, (estimatedMiddlePanelWidth - LAYOUT_CONFIG.pageWidth) / 2);
    
    // Calculate content-aware dimensions for all boxes first
    const allBoxes = boxes.map(box => ({
      ...box,
      dimensions: analyzeBoxContent(box)
    }));
    
    // Advanced collision detection and positioning algorithm
    const placedBoxes: Array<{
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      page: number;
    }> = [];
    
    const newPositions: { [key: string]: { x: number; y: number } } = {};
    const newSizes: { [key: string]: { width: number; height: number } } = {};
    
    // Helper function to check if two boxes collide with buffer zone
    const hasCollision = (x1: number, y1: number, w1: number, h1: number, 
                         x2: number, y2: number, w2: number, h2: number): boolean => {
      return !(x1 + w1 + spacingBuffer <= x2 || 
               x2 + w2 + spacingBuffer <= x1 || 
               y1 + h1 + spacingBuffer <= y2 || 
               y2 + h2 + spacingBuffer <= y1);
    };
    
    // Helper function to find collision-free position with proper line wrapping
    const findSafePosition = (box: any, targetPage: number): { x: number; y: number; page: number } => {
      const pageTop = 20 + (targetPage * (LAYOUT_CONFIG.pageHeight + 40));
      const pageContentTop = pageTop + margin;
      const pageContentBottom = pageTop + LAYOUT_CONFIG.pageHeight - margin;
      const pageContentLeft = centerOffsetX + margin;
      const pageContentRight = centerOffsetX + LAYOUT_CONFIG.pageWidth - margin;
      
      // Flow-based positioning: left to right, then next line, like text
      let currentY = pageContentTop;
      
      while (currentY + box.dimensions.height <= pageContentBottom) {
        let currentX = pageContentLeft;
        let lineMaxHeight = box.dimensions.height; // Track the tallest box on this line
        
        // Try to place boxes on current line from left to right
        while (currentX + box.dimensions.width <= pageContentRight) {
          // Check for collisions with existing boxes on this page
          const hasAnyCollision = placedBoxes
            .filter(placed => placed.page === targetPage)
            .some(placed => hasCollision(currentX, currentY, box.dimensions.width, box.dimensions.height,
                                       placed.x, placed.y, placed.width, placed.height));
          
          if (!hasAnyCollision) {
            return { x: currentX, y: currentY, page: targetPage };
          }
          
          // Find next available X position by checking existing boxes on this line
          const boxesOnThisLine = placedBoxes.filter(placed => 
            placed.page === targetPage && 
            placed.y >= currentY && 
            placed.y < currentY + lineMaxHeight + spacingBuffer
          );
          
          if (boxesOnThisLine.length > 0) {
            // Find the rightmost box on this line and place after it
            const rightmostBox = boxesOnThisLine.reduce((rightmost, current) => 
              current.x + current.width > rightmost.x + rightmost.width ? current : rightmost
            );
            currentX = rightmostBox.x + rightmostBox.width + spacingBuffer;
            lineMaxHeight = Math.max(lineMaxHeight, rightmostBox.height);
          } else {
            // Move by box width if no collision but no space
            currentX += box.dimensions.width + spacingBuffer;
          }
        }
        
        // Move to next line using the actual height of boxes on current line
        currentY += lineMaxHeight + spacingBuffer;
      }
      
      // If no space found on current page, move to next page
      return findSafePosition(box, targetPage + 1);
    };
    
    // Place each box in sequence with flow-based positioning (like text flow)
    allBoxes.forEach((box, index) => {
      // Start from page 0 and let the algorithm find the best position
      const position = findSafePosition(box, 0);
      
      // Record the placed box
      placedBoxes.push({
        id: box.id,
        x: position.x,
        y: position.y,
        width: box.dimensions.width,
        height: box.dimensions.height,
        page: position.page
      });
      
      newPositions[box.id] = { x: position.x, y: position.y };
      newSizes[box.id] = box.dimensions;
    });
    
    // Update box positions and sizes
    setBoxes(currentBoxes => {
      return currentBoxes.map(box => {
        const newPos = newPositions[box.id];
        const newSize = newSizes[box.id];
        if (newPos && newSize) {
          return {
            ...box,
            position: newPos,
            size: newSize
          };
        }
        return box;
      });
    });
    
    // Update position state separately
    setBoxPositions(newPositions);
    
    // Save changes
    setTimeout(() => saveSheetMutation.mutate(), 100);
    
    toast({
      title: "Collision-free layout applied",
      description: `${boxes.length} boxes arranged with intelligent spacing and automatic collision avoidance.`,
    });
  }, [boxes, analyzeBoxContent, saveSheetMutation, toast]);



  const getRandomColor = () => {
    const colors = [
      'from-blue-50 to-indigo-50 border-blue-200',
      'from-green-50 to-emerald-50 border-green-200',
      'from-purple-50 to-violet-50 border-purple-200',
      'from-orange-50 to-red-50 border-orange-200',
      'from-teal-50 to-cyan-50 border-teal-200',
      'from-pink-50 to-rose-50 border-pink-200'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInHours = Math.floor((now.getTime() - past.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Enhanced Microsoft Word-Style Toolbar for Cheat Sheets */}
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
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{currentSheet?.title || 'Cheat Sheet'}</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              className="text-gray-600 border-gray-300 hover:bg-gray-50"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button
              onClick={() => saveSheetMutation.mutate()}
              disabled={saveSheetMutation.isPending || !currentSheet}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Sheet
            </Button>
          </div>
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

          {/* Second toolbar line - Cheat Sheet specific controls */}
          <div className="flex items-center space-x-4 overflow-x-auto">
            <div className="flex items-center space-x-2 border-r border-gray-300 pr-4">
              <span className="text-sm font-medium text-gray-700">Box Controls:</span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={addNewBox}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Box
              </Button>
            </div>
            
            <div className="flex items-center space-x-2 border-r border-gray-300 pr-4">
              <span className="text-sm font-medium text-gray-700">Layout:</span>
              <Select value={layoutDensity} onValueChange={(value: 'compact' | 'balanced' | 'spacious') => setLayoutDensity(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="spacious">Spacious</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">{boxes.length} boxes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Three-pane layout */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Panel: Workspace History */}
        <WorkspaceSidebar
          workspaceType="cheatsheet"
          currentWorkspaceId={currentSheet?.id}
          onNewWorkspace={() => {
            createSheetMutation.mutate();
          }}
        />

        {/* Middle Panel: Cheat Sheet Content */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Sheet Controls */}
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {currentSheet?.title || 'New Cheat Sheet'}
              </h2>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <span>{boxes.length} boxes</span>
                  <span>•</span>
                  <span>{Math.max(1, Math.ceil(boxes.length / boxesPerPage))} pages • {layoutDensity} density</span>
                </div>
                {boxes.length > 0 && (
                  <div className="flex space-x-2 items-center">
                    <select 
                      value={layoutDensity} 
                      onChange={(e) => setLayoutDensity(e.target.value as 'compact' | 'balanced' | 'spacious')}
                      className="text-xs px-2 py-1 border rounded"
                    >
                      <option value="compact">Compact</option>
                      <option value="balanced">Balanced</option>
                      <option value="spacious">Spacious</option>
                    </select>
                    <select 
                      value={boxesPerPage} 
                      onChange={(e) => setBoxesPerPage(parseInt(e.target.value))}
                      className="text-xs px-2 py-1 border rounded"
                    >
                      <option value="8">8 per page</option>
                      <option value="12">12 per page</option>
                      <option value="16">16 per page</option>
                      <option value="20">20 per page</option>
                    </select>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={applySmartLayout}
                      className="text-xs gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Smart Layout
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>



          {/* Cheat Sheet Content - Combined Editor and Boxes */}
          <div className="flex-1 relative bg-gray-100 overflow-auto scroll-smooth">
            {/* Tab Interface for switching between Editor and Box Layout */}
            <div className="border-b border-gray-200 bg-white p-2">
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-blue-100 text-blue-700"
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
                  <Grid3X3 className="w-4 h-4 mr-1" />
                  Box Layout
                </Button>
              </div>
            </div>

            {/* Rich Text Editor Section - Word Document Style */}
            <div className="bg-gray-100 p-6 min-h-[600px] flex justify-center">
              {/* Single Page Container - Letter Size */}
              <div className="bg-white shadow-lg" style={{ 
                width: '8.5in', 
                minHeight: '11in',
                maxWidth: '816px',
                padding: '1in',
                margin: '20px 0',
                boxShadow: '0 4px 8px rgba(0,0,0,0.1), 0 6px 20px rgba(0,0,0,0.05)'
              }}>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Cheat Sheet Content</h3>
                  <p className="text-sm text-gray-600">Use the toolbar above to format your content with fonts, colors, alignment, and more.</p>
                </div>
                
                {/* Tiptap Editor - Full page content */}
                <div className="min-h-[9in]">
                  <EditorContent
                    editor={editor}
                    className="prose prose-lg max-w-none focus:outline-none"
                    style={{
                      fontFamily,
                      fontSize: `${fontSize}pt`,
                      color: textColor,
                      lineHeight: '1.6',
                      minHeight: '9in',
                      border: 'none',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Page Footer */}
                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center text-sm text-gray-500">
                  <div>
                    {editor ? `${editor.storage.characterCount?.characters() || 0} characters` : '0 characters'}
                  </div>
                  <div>
                    Font: {fontFamily} | Size: {fontSize}pt | Page 1
                  </div>
                </div>
              </div>
            </div>

            {/* Original Box Layout - Hidden for now but can be toggled */}
            <div className="hidden">
              {/* Page System with Visual Boundaries */}
              <div className="relative" style={{ minHeight: `${totalPages * (LAYOUT_CONFIG.pageHeight + 40) + 40}px` }}>
                {/* Render page boundaries as visual guides - centered - support up to 50+ pages */}
                {Array.from({ length: Math.max(1, Math.min(50, totalPages)) }, (_, pageIndex) => {
                  const estimatedMiddlePanelWidth = window.innerWidth - 256 - 448;
                  const centerOffsetX = Math.max(20, (estimatedMiddlePanelWidth - LAYOUT_CONFIG.pageWidth) / 2);
                  
                  return (
                    <div
                      key={pageIndex}
                      className="absolute border-2 border-dashed border-gray-300 bg-white/50 rounded-lg"
                      style={{
                        top: `${20 + pageIndex * (LAYOUT_CONFIG.pageHeight + 40)}px`,
                        left: `${centerOffsetX}px`,
                        width: `${LAYOUT_CONFIG.pageWidth}px`,
                        height: `${LAYOUT_CONFIG.pageHeight}px`,
                        zIndex: 0
                      }}
                    >
                      {/* Page header */}
                      <div className="absolute top-2 right-4 text-xs text-gray-400">
                        Page {pageIndex + 1} of {Math.max(1, totalPages)}
                      </div>
                      
                      {/* Page margins guide */}
                      <div 
                        className="absolute border border-blue-200 border-dashed"
                        style={{
                          top: `${LAYOUT_CONFIG.margin}px`,
                          left: `${LAYOUT_CONFIG.margin}px`,
                          width: `${LAYOUT_CONFIG.pageWidth - (LAYOUT_CONFIG.margin * 2)}px`,
                          height: `${LAYOUT_CONFIG.pageHeight - (LAYOUT_CONFIG.margin * 2)}px`
                        }}
                      />
                    </div>
                  );
                })}
                
                {/* Single container for all boxes with absolute positioning */}
                <div className="absolute inset-0" style={{ zIndex: 20 }}>
                  {boxes.map((box, boxIndex) => {
                    const statePos = boxPositions[box.id];
                    const fallbackPos = {
                      x: 50 + (boxIndex % 3) * 200,
                      y: 80 + Math.floor(boxIndex / 3) * 150
                    };
                    
                    let actualPos = statePos || fallbackPos;
                    let actualSize = box.size || { width: 200, height: 120 };
                    
                    if (!statePos) {
                      const contentAnalysis = analyzeBoxContent(box);
                      actualSize = { width: contentAnalysis.width, height: contentAnalysis.height };
                      setBoxPositions(prev => ({ ...prev, [box.id]: actualPos }));
                    }
                    
                    return (
                      <div key={`box-container-${box.id}`}>
                        <AutoResizeMathBox
                          key={box.id}
                          id={box.id}
                          title={box.title}
                          content={box.content}
                          color={box.color}
                          position={actualPos}
                          size={actualSize}
                          onPositionChange={(position) => updateBoxPosition(box.id, position)}
                          onSizeChange={(size) => updateBoxSize(box.id, size)}
                          onSaveRequest={debounceAndSave}
                          boxNumber={boxIndex + 1}
                          isGridMode={false}
                        />
                      </div>
                    );
                  })}
                </div>
                
                {/* Empty state when no boxes */}
                {boxes.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center py-16 max-w-md">
                      <Grid3X3 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">Empty Cheat Sheet</h3>
                      <p className="text-slate-600 mb-4">Ask the AI assistant to add formulas and content boxes</p>
                      <div className="text-sm text-slate-500">
                        Try: "Give me 50 essential math formulas" or "Add calculus derivatives"
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: ChatGPT */}
        <ChatPanel
          workspaceId={currentSheet?.id || 'new'}
          workspaceType="cheatsheet"
          onAIResponse={handleAIResponse}
          currentBoxes={boxes}
        />
      </div>
    </div>
  );
}
