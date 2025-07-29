import { useState, useEffect, useCallback, useRef } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';
import { useParams, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Printer, Plus, Grid3X3, Clock, SquareArrowOutUpLeft } from 'lucide-react';
import ChatPanel from '@/components/chat-panel';
import LaTeXRenderer from '@/components/latex-renderer';
import AutoResizeMathBox from '@/components/auto-resize-math-box';
import { CheatSheet, CheatSheetBox } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function CheatSheetWorkspace() {
  const { id } = useParams();
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
      window.history.pushState({}, '', `/cheatsheet/${newSheet.id}`);
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

  // Grid-based layout system with snap-to-grid positioning
  const GRID_CONFIG = {
    pageWidth: 612,    // 8.5 inches at 72 DPI
    pageHeight: 792,   // 11 inches at 72 DPI
    margin: 36,        // 0.5 inch margins
    columns: 3,        // Fixed 3 columns per page
    boxWidth: 180,     // Fixed box width for grid alignment
    boxHeight: 140,    // Fixed box height for grid alignment
    gutter: 10         // Space between boxes
  };

  const calculateGridPosition = useCallback((index: number) => {
    const { pageWidth, pageHeight, margin, columns, boxWidth, boxHeight, gutter } = GRID_CONFIG;
    
    // Calculate available content area
    const contentWidth = pageWidth - (margin * 2);
    const contentHeight = pageHeight - (margin * 2);
    
    // Calculate rows that fit per page (with some buffer)
    const rowsPerPage = Math.floor((contentHeight - gutter) / (boxHeight + gutter));
    const boxesPerPage = columns * rowsPerPage;
    
    // Determine page and position within page
    const pageNumber = Math.floor(index / boxesPerPage);
    const indexOnPage = index % boxesPerPage;
    
    // Column-wise placement: fill column 1, then column 2, then column 3
    const col = Math.floor(indexOnPage / rowsPerPage);
    const row = indexOnPage % rowsPerPage;
    
    // Calculate exact grid position relative to page start
    const pageStartY = pageNumber * (pageHeight + 40); // 40px for page margin
    const x = margin + (col * (boxWidth + gutter));
    const y = pageStartY + 20 + margin + (row * (boxHeight + gutter)); // 20px top margin
    
    return { 
      x, 
      y, 
      page: pageNumber,
      width: boxWidth,
      height: boxHeight,
      gridCol: col,
      gridRow: row
    };
  }, []);

  // Calculate total pages needed
  const contentHeight = GRID_CONFIG.pageHeight - (GRID_CONFIG.margin * 2);
  const rowsPerPage = Math.floor((contentHeight - GRID_CONFIG.gutter) / (GRID_CONFIG.boxHeight + GRID_CONFIG.gutter));
  const boxesPerPage = GRID_CONFIG.columns * rowsPerPage;
  const totalPages = Math.max(1, Math.ceil(boxes.length / boxesPerPage));

  const handleAIResponse = (response: any) => {
    // Handle box operations (delete, edit, etc.)
    if (response.operations && Array.isArray(response.operations)) {
      let updatedBoxes = [...boxes];
      
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
                // Size will auto-adjust via ResizeObserver
              };
            }
            break;
        }
      });
      
      // Recalculate positions for remaining boxes to maintain grid layout
      updatedBoxes = updatedBoxes.map((box, index) => {
        const gridPos = calculateGridPosition(index);
        return {
          ...box,
          position: { x: gridPos.x, y: gridPos.y },
          size: { width: gridPos.width, height: gridPos.height }
        };
      });
      
      setBoxes(updatedBoxes);
      saveSheetMutation.mutate();
    }
    // Handle new boxes creation with grid positioning
    else if (response.boxes && Array.isArray(response.boxes)) {
      const newBoxes = response.boxes.map((box: any, index: number) => {
        const gridPos = calculateGridPosition(boxes.length + index);
        return {
          id: `box-${Date.now()}-${index}`,
          title: box.title || 'Formula',
          content: box.content || '',
          color: box.color || getRandomColor(),
          position: { x: gridPos.x, y: gridPos.y },
          size: { width: gridPos.width, height: gridPos.height }
        };
      });
      
      setBoxes(prev => [...prev, ...newBoxes]);
      saveSheetMutation.mutate();
    }
  };

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

  // Auto-fit all boxes to grid positions and content sizing
  const autoFitAllBoxes = useCallback(() => {
    setBoxes(prev => prev.map((box, index) => {
      const gridPos = calculateGridPosition(index);
      return {
        ...box,
        position: { x: gridPos.x, y: gridPos.y },
        size: { width: gridPos.width, height: gridPos.height }
      };
    }));
    debounceAndSave();
    
    toast({
      title: "Auto-fit complete",
      description: "All boxes snapped to grid positions and sized for optimal display.",
    });
  }, [calculateGridPosition, debounceAndSave, toast]);

  // Snap all boxes to grid positions
  const organizeBoxes = useCallback(() => {
    setBoxes(prev => prev.map((box, index) => {
      const gridPos = calculateGridPosition(index);
      return {
        ...box,
        position: { x: gridPos.x, y: gridPos.y },
        size: { width: gridPos.width, height: gridPos.height }
      };
    }));
    debounceAndSave();
    toast({
      title: "Grid layout applied",
      description: `${boxes.length} boxes organized in ${totalPages} page${totalPages > 1 ? 's' : ''} (${boxesPerPage} boxes per page, column-wise).`,
    });
  }, [calculateGridPosition, debounceAndSave, toast, totalPages, boxes.length, boxesPerPage]);

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
        {/* Left Panel: Sheet History */}
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-3">Cheat Sheet History</h3>
            <Button
              onClick={() => createSheetMutation.mutate()}
              disabled={createSheetMutation.isPending}
              className="w-full bg-purple-50 text-purple-700 hover:bg-purple-100 text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Sheet
            </Button>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-2">
              {Array.isArray(cheatSheets) && cheatSheets.map((sheet: CheatSheet) => (
                <div
                  key={sheet.id}
                  onClick={() => {
                    setCurrentSheet(sheet);
                    setBoxes(Array.isArray(sheet.boxes) ? sheet.boxes : []);
                    window.history.pushState({}, '', `/cheatsheet/${sheet.id}`);
                  }}
                  className={`p-3 rounded-lg cursor-pointer border transition-colors ${
                    currentSheet?.id === sheet.id 
                      ? 'bg-purple-50 border-purple-200' 
                      : 'hover:bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className="font-medium text-slate-900 text-sm mb-1">
                    {sheet.title || 'Untitled Sheet'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {Array.isArray(sheet.boxes) ? sheet.boxes.length : 0} boxes
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {sheet.updatedAt ? formatTimeAgo(sheet.updatedAt) : 'Just created'}
                  </div>
                </div>
              ))}
              
              {(!Array.isArray(cheatSheets) || cheatSheets.length === 0) && (
                <div className="text-center text-slate-500 py-8">
                  <Grid3X3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No cheat sheets yet</p>
                  <p className="text-xs">Create your first sheet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

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
                  <span>3-column grid</span>
                </div>
                {boxes.length > 0 && (
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={autoFitAllBoxes}
                      className="text-xs"
                    >
                      Auto-fit All
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={organizeBoxes}
                      className="text-xs"
                    >
                      Snap to Grid
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cheat Sheet Content - Grid Layout */}
          <div className="flex-1 relative bg-gray-100 overflow-auto scroll-smooth snap-y snap-mandatory">
            {/* Page containers with grid overlay */}
            {Array.from({ length: Math.max(1, totalPages) }, (_, pageIndex) => (
              <div
                key={pageIndex}
                className="page-container snap-start"
                style={{
                  marginTop: pageIndex === 0 ? '20px' : '40px'
                }}
              >
                {/* Page header */}
                <div className="absolute top-2 right-4 text-xs text-gray-400 z-10">
                  Page {pageIndex + 1} of {Math.max(1, totalPages)}
                </div>
                
                {/* Grid columns indicator */}
                <div className="absolute top-2 left-4 text-xs text-gray-400 z-10">
                  3-Column Grid ({boxesPerPage} boxes/page)
                </div>
                
                {/* Column separators */}
                <div className="grid-separator"></div>
                <div className="grid-separator"></div>
              </div>
            ))}
            
            {/* All boxes positioned absolutely with grid constraints */}
            <div 
              className="absolute inset-0"
              style={{ 
                height: `${Math.max(800, totalPages * 832)}px` // Height based on pages + margins
              }}
            >
              {boxes.length > 0 ? (
                boxes.map((box, index) => (
                  <AutoResizeMathBox
                    key={box.id}
                    id={box.id}
                    title={box.title}
                    content={box.content}
                    color={box.color}
                    position={box.position || { x: 0, y: 0 }}
                    size={box.size || { width: GRID_CONFIG.boxWidth, height: GRID_CONFIG.boxHeight }}
                    onPositionChange={(position) => updateBoxPosition(box.id, position)}
                    onSizeChange={(size) => updateBoxSize(box.id, size)}
                    onSaveRequest={debounceAndSave}
                    boxNumber={index + 1}
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
              
              {/* Floating Add Button */}
              {boxes.length > 0 && (
                <div className="absolute bottom-6 right-6">
                  <Button
                    className="bg-purple-600 hover:bg-purple-700 text-white rounded-full w-12 h-12 shadow-lg"
                    onClick={() => {
                      // Trigger AI to add more boxes
                    }}
                  >
                    <Plus className="w-6 h-6" />
                  </Button>
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
