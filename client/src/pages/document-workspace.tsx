import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Save, FileText } from 'lucide-react';
import WorkspaceSidebar from '@/components/workspace-sidebar';
import ChatPanel from '@/components/chat-panel';
import { apiRequest } from '@/lib/queryClient';
import { Document } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

export default function DocumentWorkspace() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [content, setContent] = useState('');
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
    if (response.content) {
      setContent(prev => prev + '\n\n' + response.content);
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
        <div className="flex-1 flex flex-col bg-white">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-lg font-semibold text-slate-900">
              {currentDocument?.title || 'New Document'}  
            </h2>
          </div>
          
          <div className="flex-1 p-6">
            {currentDocument ? (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start writing your document..."
                className="w-full h-full p-4 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
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
        />
      </div>
    </div>
  );
}