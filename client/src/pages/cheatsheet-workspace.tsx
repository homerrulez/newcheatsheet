import { useState, useEffect, useCallback, useRef } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';
import { useParams, Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Printer, Plus, Grid3X3, Clock, SquareArrowOutUpLeft, RotateCcw } from 'lucide-react';
import ChatPanel from '@/components/chat-panel';
import LaTeXRenderer from '@/components/latex-renderer';
import AutoResizeMathBox from '@/components/auto-resize-math-box';
import DraggableTest from '@/components/draggable-test';
import WorkspaceSidebar from '@/components/workspace-sidebar';
import { CheatSheet, CheatSheetBox } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function CheatSheetWorkspace() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [currentSheet, setCurrentSheet] = useState<CheatSheet | null>(null);
  const [boxes, setBoxes] = useState<CheatSheetBox[]>([]);
  const [boxPositions, setBoxPositions] = useState<Record<string, { x: number; y: number }>>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  // Fixed page-aware masonry layout with proper vertical distribution
  const calculateMasonryLayout = useCallback((allBoxes: CheatSheetBox[]) => {
    const { pageWidth, pageHeight, margin, gutter, contentWidth, contentHeight, columns } = LAYOUT_CONFIG;
    
    if (allBoxes.length === 0) return [];
    
    // Calculate viewport positioning
    const pageOffset = 20;
    const estimatedMiddlePanelWidth = window.innerWidth - 256 - 448;
    const centerOffsetX = Math.max(20, (estimatedMiddlePanelWidth - pageWidth) / 2);
    
    // Analyze and size all boxes
    const boxesWithSizes = allBoxes.map(box => ({
      ...box,
      optimalSize: analyzeBoxContent(box)
    }));
    
    // Sort by priority for better visual hierarchy
    boxesWithSizes.sort((a, b) => {
      const priorityA = a.optimalSize.priority || 1;
      const priorityB = b.optimalSize.priority || 1;
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      return b.optimalSize.area - a.optimalSize.area;
    });
    
    // Column-based masonry layout with page awareness
    const columnWidth = (contentWidth - (columns - 1) * gutter) / columns;
    const positions: Array<{ x: number; y: number; width: number; height: number }> = [];
    
    // Track column heights per page
    const pageColumnHeights: Record<number, number[]> = {};
    let currentPageIndex = 0;
    
    // Initialize first page
    pageColumnHeights[0] = new Array(columns).fill(0);
    
    // Place each box using true masonry algorithm
    boxesWithSizes.forEach((box, index) => {
      const { width, height } = box.optimalSize;
      let placed = false;
      let pageIndex = currentPageIndex;
      
      while (!placed) {
        // Ensure page exists
        if (!pageColumnHeights[pageIndex]) {
          pageColumnHeights[pageIndex] = new Array(columns).fill(0);
        }
        
        const columnHeights = pageColumnHeights[pageIndex];
        
        // Find shortest column on current page
        let shortestColumn = 0;
        let shortestHeight = columnHeights[0];
        
        for (let col = 1; col < columns; col++) {
          if (columnHeights[col] < shortestHeight) {
            shortestHeight = columnHeights[col];
            shortestColumn = col;
          }
        }
        
        // Check if box fits on current page
        const wouldFitY = shortestHeight + height;
        
        if (wouldFitY <= contentHeight || pageIndex === 0) {
          // Place box on current page
          const pageYBase = pageOffset + margin + 40 + (pageIndex * (pageHeight + 40));
          
          const finalWidth = Math.min(width, columnWidth);
          const x = centerOffsetX + margin + shortestColumn * (columnWidth + gutter);
          const y = pageYBase + columnHeights[shortestColumn];
          
          // Update column height
          columnHeights[shortestColumn] += height + gutter;
          
          // Store position using original box order
          const originalIndex = allBoxes.findIndex(originalBox => originalBox.id === box.id);
          if (originalIndex !== -1) {
            positions[originalIndex] = { x, y, width: finalWidth, height };
          }
          
          placed = true;
        } else {
          // Move to next page
          pageIndex++;
          if (pageIndex > currentPageIndex) {
            currentPageIndex = pageIndex;
          }
        }
      }
    });
    
    return positions;
  }, [layoutDensity, boxesPerPage]);

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



  // Calculate total pages based on simple grid layout
  const calculateTotalPages = () => {
    if (boxes.length === 0) return 1;
    
    const columns = 3;
    const boxHeight = 120;
    const spacing = 20;
    const rowsNeeded = Math.ceil(boxes.length / columns);
    const totalHeight = rowsNeeded * (boxHeight + spacing);
    
    return Math.max(1, Math.ceil(totalHeight / LAYOUT_CONFIG.pageHeight));
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
    // Handle new boxes creation with page boundary enforcement
    else if (response.boxes && Array.isArray(response.boxes)) {
      console.log('Creating new boxes with page boundary enforcement:', response.boxes.length, 'boxes');
      
      setBoxes(currentBoxes => {
        console.log('Current boxes before adding new ones:', currentBoxes.length);
        
        const newBoxes = response.boxes.map((box: any, index: number) => {
          // Analyze content for optimal sizing
          const contentAnalysis = analyzeBoxContent(box);
          
          // Find next available position within page boundaries
          const position = findNextAvailablePosition(contentAnalysis);
          
          return {
            id: `box-${Date.now()}-${index}`,
            title: box.title || 'Formula',
            content: box.content || '',
            color: box.color || getRandomColor(),
            position: { x: position.x, y: position.y },
            size: { width: contentAnalysis.width, height: contentAnalysis.height }
          };
        });
        
        const updatedBoxes = [...currentBoxes, ...newBoxes];
        console.log('Final boxes count after adding:', updatedBoxes.length);
        
        return updatedBoxes;
      });
      
      // Trigger save after state update
      setTimeout(() => saveSheetMutation.mutate(), 100);
    }
    else {
      console.log('No boxes or operations found in response:', response);
    }
  }, [saveSheetMutation]);



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

  // Smart layout using masonry system with content-aware sizing
  const applySmartLayout = useCallback(() => {
    if (boxes.length === 0) return;
    
    console.log('Applying smart masonry layout to', boxes.length, 'boxes');
    
    // Calculate optimal positions using masonry layout
    const layoutPositions = calculateMasonryLayout(boxes);
    
    // Update box positions and sizes
    setBoxes(currentBoxes => {
      return currentBoxes.map((box, index) => {
        const layout = layoutPositions[index];
        if (layout) {
          // Update position state
          setBoxPositions(prev => ({ 
            ...prev, 
            [box.id]: { x: layout.x, y: layout.y } 
          }));
          
          return {
            ...box,
            position: { x: layout.x, y: layout.y },
            size: { width: layout.width, height: layout.height }
          };
        }
        return box;
      });
    });
    
    // Save changes
    setTimeout(() => saveSheetMutation.mutate(), 100);
    
    toast({
      title: "Smart layout applied",
      description: `${boxes.length} boxes arranged with content-aware masonry layout.`,
    });
  }, [boxes, calculateMasonryLayout, saveSheetMutation, setBoxPositions, toast]);



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
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 workspace-card-cheatsheet rounded-lg flex items-center justify-center">
                <Grid3X3 className="text-white text-sm" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Dynamic Cheat Sheet</h1>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              onClick={() => saveSheetMutation.mutate()}
              disabled={saveSheetMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Sheet
            </Button>
            <Button 
              variant="outline"
              onClick={handlePrint}
              disabled={boxes.length === 0}
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </header>

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



          {/* Cheat Sheet Content - Page-Constrained Layout */}
          <div className="flex-1 relative bg-gray-100 overflow-auto scroll-smooth">
            {/* Page System with Visual Boundaries */}
            <div className="relative" style={{ minHeight: `${totalPages * (LAYOUT_CONFIG.pageHeight + 40) + 40}px` }}>
              {/* Render page boundaries as visual guides - centered */}
              {Array.from({ length: Math.max(1, totalPages) }, (_, pageIndex) => {
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
                  // Use masonry layout positions or fallback positions
                  const statePos = boxPositions[box.id];
                  const fallbackPos = {
                    x: 50 + (boxIndex % 3) * 200,
                    y: 80 + Math.floor(boxIndex / 3) * 150
                  };
                  
                  let actualPos = statePos || fallbackPos;
                  let actualSize = box.size || { width: 200, height: 120 };
                  
                  // Apply content-aware sizing for new boxes
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
