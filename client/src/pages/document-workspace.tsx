import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Download, Plus, FileText, Clock, Type, Hash } from 'lucide-react';
import ChatPanel from '@/components/chat-panel';
import DocumentEditor from '@/components/document-editor';
import { Document } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function DocumentWorkspace() {
  const { id } = useParams();
  const [currentDoc, setCurrentDoc] = useState<Document | null>(null);
  const [content, setContent] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch documents list
  const { data: documents = [] } = useQuery({
    queryKey: ['/api/documents'],
  });

  // Fetch current document
  const { data: document } = useQuery({
    queryKey: ['/api/documents', id],
    enabled: !!id,
  });

  useEffect(() => {
    if (document) {
      setCurrentDoc(document as Document);
      setContent((document as Document).content || '');
    } else if (!id && Array.isArray(documents) && documents.length > 0) {
      // If no ID provided, use first document
      const firstDoc = documents[0] as Document;
      setCurrentDoc(firstDoc);
      setContent(firstDoc.content || '');
    }
  }, [document, documents, id]);

  // Create new document
  const createDocumentMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/documents', {
      title: 'Untitled Document',
      content: ''
    }),
    onSuccess: async (response) => {
      const newDoc = await response.json();
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      setCurrentDoc(newDoc);
      setContent('');
      window.history.pushState({}, '', `/document/${newDoc.id}`);
    },
  });

  // Save document
  const saveDocumentMutation = useMutation({
    mutationFn: () => {
      if (!currentDoc) throw new Error('No document selected');
      return apiRequest('PUT', `/api/documents/${currentDoc.id}`, {
        content,
        updatedAt: new Date()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      setLastSaved(new Date());
      toast({
        title: "Document saved",
        description: "Your document has been saved successfully.",
      });
    },
  });

  const handleExport = () => {
    if (!currentDoc || !content) {
      toast({
        title: "Nothing to export",
        description: "Please create some content first.",
        variant: "destructive"
      });
      return;
    }

    // Create a downloadable file
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentDoc.title || 'document'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Document exported",
      description: "Your document has been downloaded as a Markdown file.",
    });
  };

  // Auto-save functionality
  const autoSave = useCallback(() => {
    if (currentDoc && content && !saveDocumentMutation.isPending) {
      saveDocumentMutation.mutate();
    }
  }, [currentDoc, content, saveDocumentMutation]);

  useEffect(() => {
    const timer = setTimeout(() => {
      autoSave();
    }, 3000); // Auto-save after 3 seconds of inactivity

    return () => clearTimeout(timer);
  }, [content, autoSave]);

  const handleAIResponse = (response: any) => {
    if (response.content) {
      let aiContent = `\n\n## AI Generated Content\n${response.content}`;
      if (response.latex) {
        aiContent += `\n\n### Formula\n$${response.latex}$`;
      }
      setContent(prev => prev + aiContent);
    }
  };

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInHours = Math.floor((now.getTime() - past.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Less than an hour ago';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffInHours / 24)} day${Math.floor(diffInHours / 24) > 1 ? 's' : ''} ago`;
  };

  const getDocumentStats = () => {
    const words = content.trim().split(/\s+/).filter(word => word.length > 0).length;
    const characters = content.length;
    const lines = content.split('\n').length;
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
    return { words, characters, lines, paragraphs };
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
              <div className="w-8 h-8 workspace-card-document rounded-lg flex items-center justify-center">
                <FileText className="text-white text-sm" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Smart Document</h1>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              onClick={() => saveDocumentMutation.mutate()}
              disabled={saveDocumentMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button 
              variant="outline"
              onClick={handleExport}
              disabled={!currentDoc || !content}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </header>

      {/* Three-pane layout */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Panel: Document History */}
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-3">Document History</h3>
            <Button
              onClick={() => createDocumentMutation.mutate()}
              disabled={createDocumentMutation.isPending}
              className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Document
            </Button>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-2">
              {Array.isArray(documents) && documents.map((doc: Document) => (
                <div
                  key={doc.id}
                  onClick={() => {
                    setCurrentDoc(doc);
                    setContent(doc.content || '');
                    window.history.pushState({}, '', `/document/${doc.id}`);
                  }}
                  className={`p-3 rounded-lg cursor-pointer border transition-colors ${
                    currentDoc?.id === doc.id 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'hover:bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className="font-medium text-slate-900 text-sm mb-1">
                    {doc.title || 'Untitled Document'}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {doc.updatedAt ? formatTimeAgo(doc.updatedAt) : 'Just created'}
                  </div>
                  {doc.content && (
                    <div className="text-xs text-slate-400 mt-1 truncate">
                      {doc.content.substring(0, 50)}...
                    </div>
                  )}
                </div>
              ))}
              
              {(!Array.isArray(documents) || documents.length === 0) && (
                <div className="text-center text-slate-500 py-8">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No documents yet</p>
                  <p className="text-xs">Create your first document</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Middle Panel: Document Editor */}
        <DocumentEditor
          content={content}
          onChange={setContent}
          onAIContent={handleAIResponse}
        />

        {/* Right Panel: ChatGPT */}
        <ChatPanel
          workspaceId={currentDoc?.id || 'new'}
          workspaceType="document"
          onAIResponse={handleAIResponse}
        />
      </div>

      {/* Status Bar */}
      <div className="bg-white border-t border-slate-200 px-6 py-2">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <div className="flex items-center space-x-6">
            <span className="flex items-center">
              <Type className="w-4 h-4 mr-1" />
              {getDocumentStats().words} words
            </span>
            <span className="flex items-center">
              <Hash className="w-4 h-4 mr-1" />
              {getDocumentStats().characters} characters
            </span>
            <span>{getDocumentStats().lines} lines</span>
            <span>{getDocumentStats().paragraphs} paragraphs</span>
          </div>
          <div className="flex items-center space-x-4">
            {lastSaved && (
              <span className="text-green-600">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
            {saveDocumentMutation.isPending && (
              <span className="text-blue-600">Saving...</span>
            )}
            <span>Auto-save enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
}
