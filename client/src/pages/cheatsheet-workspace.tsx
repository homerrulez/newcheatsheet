import { useState, useEffect, useCallback } from 'react';
import Draggable from 'react-draggable';
import { useParams, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Printer, Plus, Grid3X3, Clock, SquareArrowOutUpLeft } from 'lucide-react';
import ChatPanel from '@/components/chat-panel';
import LaTeXRenderer from '@/components/latex-renderer';
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

  const handleAIResponse = (response: any) => {
    if (response.boxes && Array.isArray(response.boxes)) {
      const newBoxes = response.boxes.map((box: any, index: number) => ({
        id: `box-${Date.now()}-${index}`,
        title: box.title || 'Formula',
        content: box.content || '',
        color: box.color || getRandomColor(),
        position: { x: (index % 4) * 320, y: Math.floor(index / 4) * 200 },
        size: { width: 300, height: 160 }
      }));
      setBoxes(prev => [...prev, ...newBoxes]);
      saveSheetMutation.mutate();
    } else if (response.action === 'modify' && response.boxNumber !== undefined) {
      // Handle box modification commands
      const boxIndex = response.boxNumber - 1;
      if (boxIndex >= 0 && boxIndex < boxes.length) {
        setBoxes(prev => prev.map((box, index) => 
          index === boxIndex 
            ? { ...box, title: response.title || box.title, content: response.content || box.content }
            : box
        ));
        saveSheetMutation.mutate();
      }
    } else if (response.action === 'delete' && response.boxNumber !== undefined) {
      // Handle box deletion commands
      const boxIndex = response.boxNumber - 1;
      if (boxIndex >= 0 && boxIndex < boxes.length) {
        setBoxes(prev => prev.filter((_, index) => index !== boxIndex));
        saveSheetMutation.mutate();
      }
    }
  };

  const updateBoxPosition = useCallback((boxId: string, deltaPosition: { x: number, y: number }) => {
    setBoxes(prev => prev.map(box => 
      box.id === boxId 
        ? { ...box, position: { x: box.position.x + deltaPosition.x, y: box.position.y + deltaPosition.y } }
        : box
    ));
  }, []);

  const updateBoxSize = useCallback((boxId: string, size: { width: number, height: number }) => {
    setBoxes(prev => prev.map(box => 
      box.id === boxId 
        ? { ...box, size }
        : box
    ));
  }, []);

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
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <span>{boxes.length} boxes</span>
                <span>•</span>
                <span>Auto-sizing enabled</span>
              </div>
            </div>
          </div>

          {/* Cheat Sheet Content */}
          <div className="flex-1 relative bg-gray-50 overflow-auto">
            <div 
              className="relative w-full h-full min-h-[800px]" 
              style={{ 
                backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}
            >
              {boxes.length > 0 ? (
                boxes.map((box, index) => (
                  <Draggable
                    key={box.id}
                    defaultPosition={box.position || { x: 0, y: 0 }}
                    onStop={(e, data) => updateBoxPosition(box.id, { x: data.x - (box.position?.x || 0), y: data.y - (box.position?.y || 0) })}
                    bounds="parent"
                  >
                    <div className="absolute">
                      <div
                        className={`auto-fit-box bg-gradient-to-br ${box.color} rounded-xl border-2 shadow-lg hover:shadow-xl transition-all duration-300 animate-scale-in overflow-hidden cursor-move`}
                        style={{ 
                          animationDelay: `${index * 0.1}s`,
                          minWidth: '200px',
                          minHeight: '100px',
                          maxWidth: '600px'
                        }}
                      >
                        {/* Title Header with Box Number */}
                        <div className="flex items-center justify-between p-3 border-b border-white/20 bg-white/10 backdrop-blur-sm">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-slate-800 text-white text-xs rounded-full flex items-center justify-center font-bold">
                              {index + 1}
                            </div>
                            <h4 className="font-semibold text-slate-900 text-sm truncate">{box.title}</h4>
                          </div>
                        </div>
                        
                        {/* Auto-fit Content */}
                        <div className="p-4">
                          <div className="text-sm leading-relaxed auto-fit-content">
                            {/* Properly render LaTeX content */}
                            {box.content.includes('\\') || box.content.includes('$') ? (
                              <LaTeXRenderer 
                                content={box.content.replace(/^\$+|\$+$/g, '')} 
                                className="text-base"
                              />
                            ) : (
                              <div className="whitespace-pre-wrap break-words">{box.content}</div>
                            )}
                          </div>
                        </div>
                        
                        {/* Resize Handle */}
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-purple-500 opacity-30 hover:opacity-60 cursor-se-resize rounded-tl-lg">
                        </div>
                      </div>
                    </div>
                  </Draggable>
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
        />
      </div>
    </div>
  );
}
