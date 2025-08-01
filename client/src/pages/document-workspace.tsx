import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Save, FileText, Printer } from 'lucide-react';
import WorkspaceSidebar from '@/components/workspace-sidebar';
import ChatPanel from '@/components/chat-panel';
import DocumentEditorEnhanced from '@/components/document-editor-enhanced';
import DocumentSettingsModal from '@/components/document-settings-modal';
import { apiRequest } from '@/lib/queryClient';
import { Document } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface DocumentSettings {
  pageSize: 'letter' | 'a4' | 'legal' | '4x6';
  orientation: 'portrait' | 'landscape';
  margins: 'normal' | 'narrow' | 'wide';
}

interface DocumentBox {
  id: string;
  pageNumber: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  title: string;
  content: string;
  color: string;
}

export default function DocumentWorkspace() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [content, setContent] = useState('');
  const [boxes, setBoxes] = useState<DocumentBox[]>([]);
  const [documentSettings, setDocumentSettings] = useState<DocumentSettings>({
    pageSize: 'letter',
    orientation: 'portrait',
    margins: 'normal'
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch current document
  const { data: document } = useQuery({
    queryKey: ['/api/documents', id],
    enabled: !!id,
  });

  useEffect(() => {
    if (document) {
      setCurrentDocument(document as Document);
      setContent((document as Document).content || '');
    }
  }, [document]);

  // Create new document
  const createDocumentMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/documents', {
      title: 'New Document',
      content: ''
    }),
    onSuccess: async (response) => {
      const newDocument = await response.json();
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      setCurrentDocument(newDocument);
      setContent('');
      navigate(`/document/${newDocument.id}`);
    },
  });

  // Save document
  const saveDocumentMutation = useMutation({
    mutationFn: () => {
      if (!currentDocument) throw new Error('No document selected');
      return apiRequest('PUT', `/api/documents/${currentDocument.id}`, {
        content,
        updatedAt: new Date()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Document saved",
        description: "Your document has been saved successfully.",
      });
    },
  });

  const handleAIResponse = (response: any) => {
    console.log('Document workspace received AI response:', response);
    console.log('Response type:', typeof response);
    console.log('Response keys:', Object.keys(response || {}));
    
    // Handle box operations first
    if (response.operations && Array.isArray(response.operations)) {
      console.log('Processing box operations:', response.operations);
      
      response.operations.forEach((operation: any) => {
        switch (operation.type) {
          case 'create':
            const newBox: DocumentBox = {
              id: `box-${Date.now()}-${Math.random()}`,
              pageNumber: parseInt(operation.pageNumber) || 1,
              position: getPositionFromDescription(operation.position || 'center'),
              size: { width: 300, height: 150 },
              title: operation.title || 'New Box',
              content: operation.content || '',
              color: 'from-blue-50 to-indigo-50 border-blue-200'
            };
            setBoxes(prev => [...prev, newBox]);
            break;
            
          case 'move':
            setBoxes(prev => prev.map(box => 
              box.id === operation.boxNumber ? 
                { ...box, pageNumber: parseInt(operation.pageNumber) } : 
                box
            ));
            break;
            
          case 'delete':
            setBoxes(prev => prev.filter(box => box.id !== operation.boxNumber));
            break;
            
          case 'edit':
            setBoxes(prev => prev.map(box => 
              box.id === operation.boxNumber ? 
                { 
                  ...box, 
                  title: operation.title || box.title,
                  content: operation.content || box.content 
                } : 
                box
            ));
            break;
        }
      });
      
      toast({
        title: "✅ Box operations completed",
        description: `Processed ${response.operations.length} box operation(s)`,
      });
      return;
    }
    
    // Handle content insertion
    let contentToInsert = '';
    
    if (response.content) {
      // Handle both string and array content
      if (Array.isArray(response.content)) {
        contentToInsert = response.content.join('\n');
      } else {
        contentToInsert = response.content;
      }
      console.log('Using response.content:', contentToInsert.substring(0, 200) + '...');
    } else if (typeof response === 'string') {
      contentToInsert = response;
      console.log('Using direct string response:', contentToInsert.substring(0, 200) + '...');
    } else if (response.message) {
      contentToInsert = response.message;
      console.log('Using response.message:', contentToInsert.substring(0, 200) + '...');
    } else if (response.text) {
      contentToInsert = response.text;
      console.log('Using response.text:', contentToInsert.substring(0, 200) + '...');
    } else {
      contentToInsert = JSON.stringify(response, null, 2);
      console.log('Fallback - stringifying entire response:', contentToInsert.substring(0, 200) + '...');
    }
    
    if (contentToInsert && contentToInsert.trim()) {
      console.log('Inserting content into document:', contentToInsert.length, 'characters');
      setContent(prev => {
        const newContent = prev + '\n\n' + contentToInsert;
        console.log('New document content length:', newContent.length);
        return newContent;
      });
      
      // Auto-save after AI content insertion
      if (currentDocument) {
        setTimeout(() => {
          console.log('Auto-saving document after AI response');
          saveDocumentMutation.mutate();
        }, 1000);
      }
      
      toast({
        title: "✅ Content processed & formatted",
        description: `Inserted ${contentToInsert.length} characters into document`,
      });
    } else {
      console.warn('No valid content found in AI response:', response);
      toast({
        title: "⚠️ Content processing issue",
        description: "AI response received but no content could be extracted. Check console for details.",
        variant: "destructive"
      });
    }
  };
  
  const getPositionFromDescription = (position: string): { x: number; y: number } => {
    switch (position.toLowerCase()) {
      case 'top-left': return { x: 50, y: 50 };
      case 'top-right': return { x: 400, y: 50 };
      case 'bottom-left': return { x: 50, y: 400 };
      case 'bottom-right': return { x: 400, y: 400 };
      case 'center': return { x: 200, y: 200 };
      default: return { x: 100, y: 100 };
    }
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <FileText className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-semibold text-slate-900">Document Workspace</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <DocumentSettingsModal
              settings={documentSettings}
              onSettingsChange={setDocumentSettings}
            />
            <Button
              onClick={() => window.print()}
              variant="outline"
              size="sm"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button
              onClick={() => saveDocumentMutation.mutate()}
              disabled={saveDocumentMutation.isPending || !currentDocument}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Document
            </Button>
          </div>
        </div>
      </header>

      {/* Three-pane layout */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Panel: Document History */}
        <WorkspaceSidebar
          workspaceType="document"
          currentWorkspaceId={currentDocument?.id}
          onNewWorkspace={() => {
            createDocumentMutation.mutate();
          }}
        />

        {/* Middle Panel: Document Editor */}
        <div className="flex-1 flex flex-col bg-gray-50 overflow-auto">
          <div className="border-b border-slate-200 p-4 bg-white">
            <h2 className="text-lg font-semibold text-slate-900">
              {currentDocument?.title || 'New Document'}  
            </h2>
          </div>
          
          <div className="flex-1">
            {currentDocument ? (
              <DocumentEditorEnhanced
                content={content}
                settings={documentSettings}
                boxes={boxes}
                onChange={setContent}
                onBoxesChange={setBoxes}
                className="h-full"
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-white">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Document Selected</h3>
                  <p className="text-slate-600 mb-4">Create a new document or select one from the sidebar</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: AI Assistant */}
        <ChatPanel
          workspaceId={currentDocument?.id || 'new'}
          workspaceType="document"
          onAIResponse={handleAIResponse}
          currentBoxes={boxes}
        />
      </div>
    </div>
  );
}