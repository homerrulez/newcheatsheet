import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Save, FileText, Bold, Italic, Underline as UnderlineIcon, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, ZoomIn, ZoomOut, Printer, Plus, Minus,
  Brain, Send
} from 'lucide-react';

import { PaginatedTextEditor } from '@/components/PaginatedTextEditor';
import { apiRequest } from '@/lib/queryClient';
import { Document } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

// Page sizes (in inches, converted to pixels at 96 DPI)
const PAGE_SIZES = {
  'letter': { width: 816, height: 1056, name: 'Letter (8.5" × 11")' },
  'legal': { width: 816, height: 1344, name: 'Legal (8.5" × 14")' },
  'a4': { width: 794, height: 1123, name: 'A4 (8.27" × 11.69")' },
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
  const [documentContent, setDocumentContent] = useState('');
  const [chatInput, setChatInput] = useState('');

  // Debounce utility
  const debounce = useCallback((func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  }, []);

  // Fetch document
  const { data: document, isLoading: documentLoading } = useQuery<Document>({
    queryKey: ['document', id],
    queryFn: async () => {
      const response = await fetch(`/api/documents/${id}`);
      if (!response.ok) throw new Error('Failed to fetch document');
      return response.json();
    },
    enabled: !!id,
  });

  // Update document mutation
  const updateDocumentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PATCH', `/api/documents/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document', id] });
    },
  });

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(() => {
      if (documentContent && id) {
        updateDocumentMutation.mutate({
          content: documentContent,
          pageSize,
          fontSize: fontSize.toString(),
          fontFamily,
          textColor,
        });
      }
    }, 1000),
    [documentContent, pageSize, fontSize, fontFamily, textColor, id]
  );

  // Auto-save when content changes
  useEffect(() => {
    if (documentContent && id) {
      debouncedSave();
    }
  }, [documentContent, debouncedSave, id]);

  // Initialize document content
  useEffect(() => {
    if (document && document.content !== documentContent) {
      setDocumentContent(document.content || '');
      setPageSize((document.pageSize as keyof typeof PAGE_SIZES) || 'letter');
      setFontSize(parseInt(document.fontSize || '12'));
      setFontFamily(document.fontFamily || 'Times New Roman');
      setTextColor(document.textColor || '#000000');
    }
  }, [document, documentContent]);

  // AI Improve functionality
  const aiImproveMutation = useMutation({
    mutationFn: async () => {
      if (!documentContent.trim()) throw new Error('No content to improve');

      const response = await apiRequest('POST', '/api/ai/improve-content', {
        content: documentContent,
        documentId: id,
        instruction: 'Improve this content while maintaining its structure and meaning. Focus on clarity, grammar, and readability.'
      });
      return await response.json();
    },
    onSuccess: (response: any) => {
      if (response.improvedContent) {
        setDocumentContent(response.improvedContent);
        toast({ title: "Content improved by AI", description: "Your document has been enhanced for clarity and readability." });
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "AI Improve failed", 
        description: error.message || "Please try again later.", 
        variant: "destructive" 
      });
    },
  });

  const handleContentChange = useCallback((newContent: string) => {
    setDocumentContent(newContent);
  }, []);

  if (documentLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{
      background: 'linear-gradient(to right, #fcf2f7 0%, #f8f4fc 40%, #f5f9ff 60%, #eef8fd 100%)'
    }}>
      {/* Top toolbar */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-slate-600 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="px-4 py-2">
          {/* First toolbar line */}
          <div className="flex items-center justify-between space-x-3 overflow-x-auto">
            {/* File operations */}
            <div className="flex items-center space-x-1 border-r border-gray-400 dark:border-gray-500 pr-3">
              <button className="px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700">
                <FileText className="w-6 h-6 text-green-600" />
              </button>
              <button className="px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700">
                <Save className="w-6 h-6 text-blue-600" />
              </button>
              <button className="px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700">
                <Printer className="w-6 h-6 text-purple-600" />
              </button>
            </div>

            {/* Font controls */}
            <div className="flex items-center space-x-2 border-r border-gray-400 dark:border-gray-500 pr-3">
              <Select value={fontFamily} onValueChange={setFontFamily}>
                <SelectTrigger className="w-32 border-none bg-transparent hover:bg-gray-100 text-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                  <SelectItem value="Arial">Arial</SelectItem>
                  <SelectItem value="Calibri">Calibri</SelectItem>
                  <SelectItem value="Georgia">Georgia</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={fontSize.toString()} onValueChange={(value) => setFontSize(parseInt(value))}>
                <SelectTrigger className="w-16 border-none bg-transparent hover:bg-gray-100 text-gray-700">
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
                  <SelectItem value="24">24</SelectItem>
                </SelectContent>
              </Select>
              
              <button 
                className="px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700"
                onClick={() => setFontSize(Math.min(72, fontSize + 2))}
              >
                <Plus className="w-5 h-5 text-blue-600" />
              </button>
              <button 
                className="px-2 py-1 hover:bg-gray-100 rounded transition-colors text-gray-700"
                onClick={() => setFontSize(Math.max(8, fontSize - 2))}
              >
                <Minus className="w-5 h-5 text-blue-600" />
              </button>
            </div>

            {/* Text formatting */}
            <div className="flex items-center space-x-1 border-r border-gray-400 dark:border-gray-500 pr-3">
              <button className="px-2 py-1 rounded transition-colors hover:bg-gray-100 text-gray-700">
                <Bold className="w-6 h-6 text-blue-600 font-bold" />
              </button>
              <button className="px-2 py-1 rounded transition-colors hover:bg-gray-100 text-gray-700">
                <Italic className="w-6 h-6 text-blue-600" />
              </button>
              <button className="px-2 py-1 rounded transition-colors hover:bg-gray-100 text-gray-700">
                <UnderlineIcon className="w-6 h-6 text-blue-600" />
              </button>
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-8 h-6 border rounded cursor-pointer"
                title="Font Color"
              />
            </div>

            {/* Text alignment */}
            <div className="flex items-center space-x-1 border-r border-gray-400 dark:border-gray-500 pr-3">
              <button className="px-2 py-1 rounded transition-colors hover:bg-gray-100 text-gray-700">
                <AlignLeft className="w-6 h-6 text-green-600" />
              </button>
              <button className="px-2 py-1 rounded transition-colors hover:bg-gray-100 text-gray-700">
                <AlignCenter className="w-6 h-6 text-green-600" />
              </button>
              <button className="px-2 py-1 rounded transition-colors hover:bg-gray-100 text-gray-700">
                <AlignRight className="w-6 h-6 text-green-600" />
              </button>
              <button className="px-2 py-1 rounded transition-colors hover:bg-gray-100 text-gray-700">
                <AlignJustify className="w-6 h-6 text-green-600" />
              </button>
            </div>

            {/* Lists */}
            <div className="flex items-center space-x-1">
              <button className="px-2 py-1 rounded transition-colors hover:bg-gray-100 text-gray-700">
                <List className="w-6 h-6 text-purple-600" />
              </button>
              <button className="px-2 py-1 rounded transition-colors hover:bg-gray-100 text-gray-700">
                <ListOrdered className="w-6 h-6 text-purple-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left panel - Document History */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
          <div className="h-full shadow-lg border-r border-white/20 bg-white">
            <div className="p-4 border-b border-white/20">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Document
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {document?.title || 'Untitled Document'}
              </p>
            </div>
            <ScrollArea className="h-full p-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Document history and versions will appear here.</p>
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Center panel - Document Editor */}
        <ResizablePanel defaultSize={47} minSize={30}>
          <div className="h-full flex flex-col">
            <PaginatedTextEditor
              content={documentContent}
              onChange={handleContentChange}
              fontSize={fontSize}
              fontFamily={fontFamily}
              zoom={zoomLevel}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Right panel - AI Assistant */}
        <ResizablePanel defaultSize={33} minSize={25} maxSize={45}>
          <div className="h-full shadow-lg flex flex-col bg-white">
            <div className="flex-shrink-0 border-b border-gray-200/30 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">ChatGPT Assistant</h3>
                    <p className="text-xs text-gray-600 font-light">Always available</p>
                  </div>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="AI Active"></div>
              </div>

              <Button
                onClick={() => aiImproveMutation.mutate()}
                disabled={aiImproveMutation.isPending || !documentContent.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-lg disabled:opacity-50"
              >
                {aiImproveMutation.isPending ? 'Improving...' : 'AI Improve'}
              </Button>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Chat messages will appear here.</p>
              </div>
            </ScrollArea>

            <div className="flex-shrink-0 border-t border-gray-200/30 p-4">
              <div className="flex space-x-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask ChatGPT..."
                  className="flex-1"
                />
                <Button size="sm">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}