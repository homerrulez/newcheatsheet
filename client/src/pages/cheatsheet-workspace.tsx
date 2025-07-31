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

  // Enhanced masonry layout configuration
  const [layoutDensity, setLayoutDensity] = useState<'compact' | 'balanced' | 'spacious'>('balanced');
  const [draggedBoxes, setDraggedBoxes] = useState<Set<string>>(new Set());

  // Update box position function with drag tracking
  const updateBoxPosition = useCallback((id: string, position: { x: number; y: number }) => {
    setDraggedBoxes(prev => new Set(prev).add(id));
    setBoxPositions(prev => ({ ...prev, [id]: position }));
    setBoxes(currentBoxes => 
      currentBoxes.map(box => 
        box.id === id ? { ...box, position } : box
      )
    );
  }, []);

  // Update box size function with constraints
  const updateBoxSize = useCallback((id: string, size: { width: number; height: number }) => {
    const constrainedSize = {
      width: Math.max(140, Math.min(450, size.width)),
      height: Math.max(80, Math.min(400, size.height))
    };
    setBoxes(currentBoxes => 
      currentBoxes.map(box => 
        box.id === id ? { ...box, size: constrainedSize } : box
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
    }
  }, [cheatSheet]);

  // Save sheet mutation
  const saveSheetMutation = useMutation({
    mutationFn: async () => {
      if (!currentSheet) return;
      
      const updatedSheet = {
        ...currentSheet,
        boxes: boxes.map(box => ({
          ...box,
          position: boxPositions[box.id] || box.position || { x: 0, y: 0 }
        }))
      };
      
      return apiRequest(`/api/cheatsheets/${currentSheet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSheet),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cheatsheets'] });
    },
  });

  const handlePrint = () => {
    window.print();
    toast({
      title: "Print view ready",
      description: "Your cheat sheet is ready to print.",
    });
  };

  const LAYOUT_CONFIG = {
    pageWidth: 620,
    pageHeight: 800,
    margin: 30,
    minBoxWidth: 140,
    maxBoxWidth: 450,
    minBoxHeight: 80,
    maxBoxHeight: 400,
    gutter: 20,
    get contentWidth() { return this.pageWidth - (this.margin * 2); },
    get contentHeight() { return this.pageHeight - (this.margin * 2) - 40; },
    get columns() {
      const densityColumns = { compact: 4, balanced: 3, spacious: 2 };
      return densityColumns[layoutDensity] || 3;
    },
    get targetBoxesPerPage() {
      const baseBoxes = { compact: 20, balanced: 12, spacious: 8 };
      return baseBoxes[layoutDensity] || 12;
    }
  };

  // Enhanced content analysis for optimal box sizing
  const analyzeBoxContent = useCallback((box: CheatSheetBox) => {
    const content = box.content || '';
    if (!content.trim()) {
      return { width: 180, height: 120, priority: 0, contentType: 'empty' };
    }

    const densityMultipliers = { compact: 0.85, balanced: 1.0, spacious: 1.2 };
    const multiplier = densityMultipliers[layoutDensity];

    const hasComplexMath = content.includes('\\sum') || content.includes('\\int') || content.includes('\\frac');
    const hasMatrices = content.includes('matrix') || content.includes('begin{');
    const hasLatex = content.includes('\\') || content.includes('^') || content.includes('_');
    const lineCount = Math.max(1, content.split('\n').length);
    const avgLineLength = content.length / lineCount;

    let width = 200 * multiplier;
    let height = 120 * multiplier;
    let priority = 1;

    if (hasMatrices) {
      width = Math.min(400, Math.max(300, content.length * 2.5 + 100));
      height = Math.min(350, Math.max(180, lineCount * 45 + 80));
      priority = 5;
    } else if (hasComplexMath) {
      width = Math.min(350, Math.max(250, avgLineLength * 5 + 80));
      height = Math.min(200, Math.max(140, lineCount * 35 + 70));
      priority = 4;
    } else if (hasLatex) {
      width = Math.min(280, Math.max(200, avgLineLength * 4 + 60));
      height = Math.min(160, Math.max(120, lineCount * 30 + 60));
      priority = 2;
    } else if (lineCount > 3) {
      width = Math.min(260, Math.max(180, Math.sqrt(content.length) * 10 + 80));
      height = Math.min(300, Math.max(150, lineCount * 25 + 80));
      priority = 1;
    }

    return {
      width: Math.round(width / 10) * 10,
      height: Math.round(height / 10) * 10,
      priority,
      contentType: hasMatrices ? 'matrix' : hasComplexMath ? 'complex-math' : hasLatex ? 'math' : 'text'
    };
  }, [layoutDensity]);

  // Production-ready masonry layout algorithm
  const calculateMasonryLayout = useCallback((allBoxes: CheatSheetBox[]) => {
    const { pageWidth, pageHeight, margin, gutter, contentWidth, contentHeight, columns } = LAYOUT_CONFIG;
    
    if (allBoxes.length === 0) return [];

    const pageOffset = 20;
    const estimatedMiddlePanelWidth = typeof window !== 'undefined' ? window.innerWidth - 256 - 448 : 800;
    const centerOffsetX = Math.max(20, (estimatedMiddlePanelWidth - pageWidth) / 2);

    // Analyze all boxes for optimal sizing
    const boxesWithSizes = allBoxes.map(box => {
      if (draggedBoxes.has(box.id) && box.position) {
        return {
          ...box,
          optimalSize: { width: box.size?.width || 200, height: box.size?.height || 120, priority: 0, contentType: 'manual' }
        };
      }
      return { ...box, optimalSize: analyzeBoxContent(box) };
    });

    // Sort by priority for better visual hierarchy
    boxesWithSizes.sort((a, b) => {
      if (a.optimalSize.contentType === 'manual') return 1;
      if (b.optimalSize.contentType === 'manual') return -1;
      return (b.optimalSize.priority || 0) - (a.optimalSize.priority || 0);
    });

    const columnWidth = (contentWidth - (columns - 1) * gutter) / columns;
    const positions: Array<{ x: number; y: number; width: number; height: number }> = [];
    const pageColumnHeights: Record<number, number[]> = {};
    let currentPageIndex = 0;

    pageColumnHeights[0] = new Array(columns).fill(0);

    boxesWithSizes.forEach((box) => {
      // Use existing position for manually dragged boxes
      if (draggedBoxes.has(box.id) && box.position) {
        const originalIndex = allBoxes.findIndex(originalBox => originalBox.id === box.id);
        if (originalIndex !== -1) {
          positions[originalIndex] = {
            x: box.position.x,
            y: box.position.y,
            width: box.size?.width || 200,
            height: box.size?.height || 120
          };
        }
        return;
      }

      const { width, height } = box.optimalSize;
      let placed = false;
      let pageIndex = currentPageIndex;

      while (!placed && pageIndex < 10) { // Prevent infinite loops
        if (!pageColumnHeights[pageIndex]) {
          pageColumnHeights[pageIndex] = new Array(columns).fill(0);
        }

        const columnHeights = pageColumnHeights[pageIndex];
        
        // Find shortest column
        let shortestColumn = 0;
        let shortestHeight = columnHeights[0];
        for (let col = 1; col < columns; col++) {
          if (columnHeights[col] < shortestHeight) {
            shortestHeight = columnHeights[col];
            shortestColumn = col;
          }
        }

        // Check if box fits on current page
        const wouldFitY = columnHeights[shortestColumn] + height;
        if (wouldFitY <= contentHeight || columnHeights.every(h => h === 0)) {
          // Place box on current page
          const pageYBase = pageOffset + margin + 40 + (pageIndex * (pageHeight + 40));
          const finalWidth = Math.min(width, columnWidth);
          const x = centerOffsetX + margin + shortestColumn * (columnWidth + gutter);
          const y = pageYBase + columnHeights[shortestColumn];

          columnHeights[shortestColumn] += height + gutter;

          const originalIndex = allBoxes.findIndex(originalBox => originalBox.id === box.id);
          if (originalIndex !== -1) {
            positions[originalIndex] = { x, y, width: finalWidth, height };
          }
          placed = true;
        } else {
          pageIndex++;
          if (pageIndex > currentPageIndex) {
            currentPageIndex = pageIndex;
          }
        }
      }
    });

    return positions;
  }, [layoutDensity, draggedBoxes, analyzeBoxContent]);

  // Enhanced smart layout function
  const applySmartLayout = useCallback(() => {
    if (boxes.length === 0) return;

    setDraggedBoxes(new Set()); // Clear manual positioning flags
    
    requestAnimationFrame(() => {
      const layoutPositions = calculateMasonryLayout(boxes);
      
      setBoxes(currentBoxes => {
        const updatedBoxes = currentBoxes.map((box, index) => {
          const layout = layoutPositions[index];
          if (layout) {
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
        
        setTimeout(() => saveSheetMutation.mutate(), 300);
        return updatedBoxes;
      });

      const estimatedPages = Math.ceil(boxes.length / LAYOUT_CONFIG.targetBoxesPerPage);
      toast({
        title: "Smart layout applied",
        description: `${boxes.length} boxes arranged across ${estimatedPages} page${estimatedPages > 1 ? 's' : ''} with ${layoutDensity} density.`,
      });
    });
  }, [boxes, calculateMasonryLayout, saveSheetMutation, setBoxPositions, toast, layoutDensity]);

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

  const getRandomColor = () => {
    const colors = [
      'from-blue-50 to-indigo-50 border-blue-200',
      'from-purple-50 to-pink-50 border-purple-200',
      'from-green-50 to-emerald-50 border-green-200',
      'from-yellow-50 to-orange-50 border-yellow-200',
      'from-red-50 to-rose-50 border-red-200',
      'from-cyan-50 to-teal-50 border-cyan-200',
      'from-amber-50 to-yellow-50 border-amber-200',
      'from-violet-50 to-purple-50 border-violet-200',
      'from-gray-50 to-slate-50 border-gray-200',
      'from-lime-50 to-green-50 border-lime-200'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Create new box function
  const createNewBox = () => {
    const newBox = {
      id: `box-${Date.now()}`,
      title: `Box ${boxes.length + 1}`,
      content: '',
      color: getRandomColor(),
      position: { x: 40, y: 60 },
      size: { width: 200, height: 120 }
    };
    
    setBoxes([...boxes, newBox]);
    setTimeout(() => saveSheetMutation.mutate(), 100);
  };

  if (!currentSheet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto p-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-12">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Select a Cheat Sheet</h1>
              <p className="text-gray-600 dark:text-gray-300 mb-8">Choose a cheat sheet to start working on.</p>
              <Link href="/dashboard">
                <Button>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex">
      {/* Sidebar */}
      <WorkspaceSidebar
        sheets={cheatSheets}
        currentSheetId={id || ''}
        workspaceType="cheatsheet"
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {currentSheet?.title || 'Cheat Sheet'}
              </h1>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Density Controls */}
              <div className="flex items-center space-x-1 mr-4">
                <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">Density:</span>
                {(['compact', 'balanced', 'spacious'] as const).map((density) => (
                  <Button
                    key={density}
                    variant={layoutDensity === density ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setLayoutDensity(density)}
                    className="text-xs"
                  >
                    {density.charAt(0).toUpperCase() + density.slice(1)}
                  </Button>
                ))}
              </div>
              
              <Button onClick={applySmartLayout} size="sm" variant="outline">
                <Grid3X3 className="w-4 h-4 mr-1" />
                Smart Layout
              </Button>
              <Button onClick={createNewBox} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Box
              </Button>
              <Button onClick={() => saveSheetMutation.mutate()} size="sm" variant="outline">
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
              <Button onClick={handlePrint} size="sm" variant="outline">
                <Printer className="w-4 h-4 mr-1" />
                Print
              </Button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex">
          {/* Canvas Area */}
          <div className="flex-1 p-4 overflow-auto relative" style={{ height: 'calc(100vh - 73px)' }}>
            {/* Page guides */}
            {Array.from({ length: 5 }, (_, pageIndex) => (
              <div
                key={pageIndex}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-800/50"
                style={{
                  position: 'absolute',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  top: 20 + pageIndex * (LAYOUT_CONFIG.pageHeight + 40),
                  width: LAYOUT_CONFIG.pageWidth,
                  height: LAYOUT_CONFIG.pageHeight,
                  zIndex: 0,
                }}
              >
                <div className="absolute top-2 left-2 text-xs text-gray-400 dark:text-gray-500">
                  Page {pageIndex + 1}
                </div>
              </div>
            ))}

            {/* Boxes */}
            {boxes.map((box, index) => (
              <Draggable
                key={box.id}
                position={boxPositions[box.id] || box.position || { x: 0, y: 0 }}
                onDrag={(e, data) => {
                  updateBoxPosition(box.id, { x: data.x, y: data.y });
                }}
                onStop={() => {
                  saveSheetMutation.mutate();
                }}
                grid={[10, 10]}
                bounds="parent"
              >
                <div className="absolute z-10">
                  <AutoResizeMathBox
                    box={box}
                    boxNumber={index + 1}
                    onContentChange={(newContent) => {
                      setBoxes(prev => prev.map(b => 
                        b.id === box.id ? { ...b, content: newContent } : b
                      ));
                      setTimeout(() => saveSheetMutation.mutate(), 100);
                    }}
                    onTitleChange={(newTitle) => {
                      setBoxes(prev => prev.map(b => 
                        b.id === box.id ? { ...b, title: newTitle } : b
                      ));
                      setTimeout(() => saveSheetMutation.mutate(), 100);
                    }}
                    onDelete={() => {
                      setBoxes(prev => prev.filter(b => b.id !== box.id));
                      setTimeout(() => saveSheetMutation.mutate(), 100);
                    }}
                    onResize={(size) => {
                      updateBoxSize(box.id, size);
                      setTimeout(() => saveSheetMutation.mutate(), 100);
                    }}
                  />
                </div>
              </Draggable>
            ))}
          </div>

          {/* Chat Panel */}
          <div className="w-112 border-l border-gray-200 dark:border-gray-700">
            <ChatPanel
              workspaceId={id || ''}
              workspaceType="cheatsheet"
              context={`Cheat Sheet: ${currentSheet?.title || 'Untitled'}\nBoxes: ${boxes.length} total\n\nCurrent boxes:\n${boxes.map((box, idx) => `${idx + 1}. ${box.title}: ${box.content?.substring(0, 100)}${box.content && box.content.length > 100 ? '...' : ''}`).join('\n')}`}
              onAIResponse={handleAIResponse}
            />
          </div>
        </div>
      </div>
    </div>
  );
}