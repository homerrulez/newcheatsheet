import { useState, useEffect, useCallback, useRef } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';
import { useParams, Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Printer, Plus, Grid3X3, Clock, SquareArrowOutUpLeft } from 'lucide-react';
import ChatPanel from '@/components/chat-panel';
import LaTeXRenderer from '@/components/latex-renderer';
import AutoResizeMathBox from '@/components/auto-resize-math-box';
import WorkspaceSidebar from '@/components/workspace-sidebar';
import { CheatSheet, CheatSheetBox } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function CheatSheetWorkspace() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [currentSheet, setCurrentSheet] = useState<CheatSheet | null>(null);
  const [boxes, setBoxes] = useState<CheatSheetBox[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      setBoxes(Array.isArray((cheatSheet as CheatSheet).boxes) ? (cheatSheet as CheatSheet).boxes as CheatSheetBox[] : []);
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

  // Tetris-like auto-fitting layout system
  const LAYOUT_CONFIG = {
    pageWidth: 612,    // 8.5 inches at 72 DPI
    pageHeight: 792,   // 11 inches at 72 DPI
    margin: 36,        // 0.5 inch margins
    minBoxWidth: 160,  // Minimum box width
    maxBoxWidth: 400,  // Maximum box width for large content
    minBoxHeight: 100, // Minimum box height
    maxBoxHeight: 600, // Maximum box height for large content
    gutter: 10,        // Space between boxes
    contentWidth: 612 - 72, // Available content width
    contentHeight: 792 - 72  // Available content height per page
  };

  // Tetris-like optimal positioning algorithm
  const calculateOptimalLayout = useCallback((allBoxes: CheatSheetBox[]) => {
    const { pageWidth, pageHeight, margin, gutter, contentWidth, contentHeight } = LAYOUT_CONFIG;
    
    // Calculate viewport positioning
    const pageOffset = 20;
    const estimatedMiddlePanelWidth = window.innerWidth - 256 - 448;
    const centerOffsetX = Math.max(20, (estimatedMiddlePanelWidth - pageWidth) / 2);
    const pageStartX = centerOffsetX + margin;
    const pageStartY = pageOffset + margin + 40;
    
    // Analyze content to determine optimal box sizes
    const analyzeBoxContent = (box: CheatSheetBox) => {
      const content = box.content || '';
      const hasImages = content.match(/\.(jpg|jpeg|png|gif|svg|webp)/i);
      const hasLongText = content.length > 200;
      const isMultiLine = content.includes('\n') || content.includes('<br>');
      const isMathFormula = content.includes('\\') || content.includes('=') || content.includes('^');
      
      let optimalWidth, optimalHeight;
      
      if (hasImages) {
        optimalWidth = Math.min(300, Math.max(200, content.length * 2));
        optimalHeight = Math.min(250, Math.max(150, 200));
      } else if (hasLongText) {
        optimalWidth = Math.min(280, Math.max(220, Math.sqrt(content.length) * 15));
        optimalHeight = Math.min(200, Math.max(120, content.length / 8));
      } else if (isMultiLine) {
        const lines = content.split(/\n|<br>/).length;
        optimalWidth = Math.min(240, Math.max(180, content.length * 1.5));
        optimalHeight = Math.min(180, Math.max(100, lines * 25 + 60));
      } else if (isMathFormula) {
        optimalWidth = Math.min(220, Math.max(160, content.length * 3));
        optimalHeight = Math.min(150, Math.max(100, 120));
      } else {
        optimalWidth = Math.min(200, Math.max(160, content.length * 2));
        optimalHeight = Math.min(120, Math.max(100, 100));
      }
      
      return {
        width: Math.round(optimalWidth),
        height: Math.round(optimalHeight),
        area: optimalWidth * optimalHeight,
        aspectRatio: optimalWidth / optimalHeight
      };
    };
    
    // Sort boxes by area (largest first) for better packing
    const boxesWithSizes = allBoxes.map(box => ({
      ...box,
      optimalSize: analyzeBoxContent(box)
    })).sort((a, b) => b.optimalSize.area - a.optimalSize.area);
    
    // Track occupied spaces on each page
    const pages: Array<Array<{x: number, y: number, width: number, height: number}>> = [[]];
    const positions: Array<{x: number, y: number, width: number, height: number}> = [];
    
    // Find best position for a box using tetris-like placement
    const findBestPosition = (boxSize: {width: number, height: number}, pageIndex: number = 0) => {
      const page = pages[pageIndex] || [];
      const { width: boxWidth, height: boxHeight } = boxSize;
      
      // Try to place box at various positions with better spacing
      for (let y = 0; y <= contentHeight - boxHeight; y += 20) {
        for (let x = 0; x <= contentWidth - boxWidth; x += 20) {
          // Check if position conflicts with existing boxes (with better margins)
          const conflicts = page.some(occupiedSpace => 
            !(x >= occupiedSpace.x + occupiedSpace.width + 15 ||
              x + boxWidth + 15 <= occupiedSpace.x ||
              y >= occupiedSpace.y + occupiedSpace.height + 15 ||
              y + boxHeight + 15 <= occupiedSpace.y)
          );
          
          if (!conflicts) {
            // Found a good position
            return { x: pageStartX + x, y: pageStartY + (pageIndex * (pageHeight + 40)) + y };
          }
        }
      }
      
      // If no position found, try next page
      if (!pages[pageIndex + 1]) {
        pages[pageIndex + 1] = [];
      }
      return findBestPosition(boxSize, pageIndex + 1);
    };
    
    // Place each box optimally
    boxesWithSizes.forEach((box, index) => {
      const { width, height } = box.optimalSize;
      const position = findBestPosition({ width, height });
      const pageIndex = Math.floor((position.y - pageStartY) / (pageHeight + 40));
      
      // Add to occupied spaces
      if (!pages[pageIndex]) pages[pageIndex] = [];
      pages[pageIndex].push({
        x: position.x - pageStartX,
        y: (position.y - pageStartY) % (pageHeight + 40),
        width,
        height
      });
      
      positions[allBoxes.indexOf(box)] = {
        x: position.x,
        y: position.y,
        width,
        height
      };
    });
    
    return positions;
  }, []);

  // Proper grid positioning within the scrollable canvas
  const autoArrangeBoxes = useCallback(() => {
    if (boxes.length === 0) return;
    
    console.log('Auto-arranging', boxes.length, 'boxes');
    
    // Use simple absolute positioning that works with Draggable
    // The boxes are positioned within the scroll container which uses absolute positioning
    const baseX = 100; // Start position for first column
    const baseY = 100; // Start position for first row
    
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
  
  // Auto-arrange when boxes change
  useEffect(() => {
    if (boxes.length > 0) {
      console.log('Triggering auto-arrange for', boxes.length, 'boxes');
      
      // Simple delay to ensure state is ready
      const timer = setTimeout(() => {
        autoArrangeBoxes();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [boxes.length, autoArrangeBoxes]);

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
    // Handle new boxes creation with smart positioning
    else if (response.boxes && Array.isArray(response.boxes)) {
      console.log('Creating new boxes from response:', response.boxes.length, 'boxes');
      
      setBoxes(currentBoxes => {
        console.log('Current boxes before adding new ones:', currentBoxes.length);
        
        const newBoxes = response.boxes.map((box: any, index: number) => {
          return {
            id: `box-${Date.now()}-${index}`,
            title: box.title || 'Formula',
            content: box.content || '',
            color: box.color || getRandomColor(),
            position: { x: 0, y: 0 }, // Trigger auto-arrange
            size: { width: 200, height: 120 }
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

  const updateBoxPosition = useCallback((boxId: string, newPosition: { x: number, y: number }) => {
    setBoxes(prev => prev.map(box => 
      box.id === boxId 
        ? { ...box, position: newPosition }
        : box
    ));
  }, []);

  const updateBoxSize = useCallback((boxId: string, size: { width: number, height: number }) => {
    setBoxes(prev => prev.map(box => 
      box.id === boxId 
        ? { ...box, size: { width: Math.max(200, size.width), height: Math.max(100, size.height) } }
        : box
    ));
  }, []);

  // Auto-resize is now handled by ResizeObserver in AutoResizeMathBox component
  // This function is kept for compatibility but is no longer used for auto-sizing

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

  // Function to reorganize boxes with optimal tetris-like positioning
  const organizeBoxes = useCallback(() => {
    // Re-arrange boxes using the optimal layout algorithm
    autoArrangeBoxes();
    debounceAndSave();
    toast({
      title: "Layout optimized",
      description: `${boxes.length} boxes reorganized across ${totalPages} page${totalPages > 1 ? 's' : ''} with tetris-like positioning.`,
    });
  }, [debounceAndSave, toast, totalPages, boxes.length, autoArrangeBoxes]);

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
                  <span>Dynamic layout</span>
                </div>
                {boxes.length > 0 && (
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={autoFitAllBoxes}
                      className="text-xs"
                    >
                      Refresh Grid
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={organizeBoxes}
                      className="text-xs"
                    >
                      Re-organize
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        console.log('Manual auto-arrange triggered');
                        autoArrangeBoxes();
                      }}
                      className="text-xs"
                    >
                      Debug Position
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cheat Sheet Content - Page-Constrained Layout */}
          <div className="flex-1 relative bg-gray-100 overflow-auto scroll-smooth">
            {/* Page System with Visual Boundaries */}
            <div className="relative" style={{ minHeight: `${totalPages * 832}px` }}>
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
              
              {/* All boxes positioned within page boundaries */}
              <div className="absolute inset-0" style={{ zIndex: 10 }}>
                {boxes.length > 0 ? (
                  boxes.map((box, index) => (
                    <AutoResizeMathBox
                      key={box.id}
                      id={box.id}
                      title={box.title}
                      content={box.content}
                      color={box.color}
                      position={box.position || { x: 0, y: 0 }}
                      size={box.size}
                      onPositionChange={(position) => updateBoxPosition(box.id, position)}
                      onSizeChange={(size) => updateBoxSize(box.id, size)}
                      onSaveRequest={debounceAndSave}
                      boxNumber={index + 1}
                      isGridMode={false}
                    />
                  ))
                ) : (
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
