import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Save, FileSpreadsheet } from 'lucide-react';
import WorkspaceSidebar from '@/components/workspace-sidebar';
import ChatPanel from '@/components/chat-panel';
import { apiRequest } from '@/lib/queryClient';
import { Template } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

export default function TemplateWorkspace() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);
  const [sections, setSections] = useState<any>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch current template
  const { data: template } = useQuery({
    queryKey: ['/api/templates', id],
    enabled: !!id,
  });

  useEffect(() => {
    if (template) {
      setCurrentTemplate(template as Template);
      setSections((template as Template).sections || {});
    }
  }, [template]);

  // Create new template
  const createTemplateMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/templates', {
      title: 'New Template',
      templateType: 'generic',
      sections: {}
    }),
    onSuccess: async (response) => {
      const newTemplate = await response.json();
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      setCurrentTemplate(newTemplate);
      setSections({});
      navigate(`/template/${newTemplate.id}`);
    },
  });

  // Save template
  const saveTemplateMutation = useMutation({
    mutationFn: () => {
      if (!currentTemplate) throw new Error('No template selected');
      return apiRequest('PUT', `/api/templates/${currentTemplate.id}`, {
        sections,
        updatedAt: new Date()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      toast({
        title: "Template saved",
        description: "Your template has been saved successfully.",
      });
    },
  });

  const handleAIResponse = (response: any) => {
    if (response.sections) {
      setSections(prev => ({ ...prev, ...response.sections }));
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <FileSpreadsheet className="w-6 h-6 text-green-600" />
            <h1 className="text-xl font-semibold text-slate-900">Template Workspace</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => saveTemplateMutation.mutate()}
              disabled={saveTemplateMutation.isPending || !currentTemplate}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Template
            </Button>
          </div>
        </div>
      </header>

      {/* Three-pane layout */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Panel: Template History */}
        <WorkspaceSidebar
          workspaceType="template"
          currentWorkspaceId={currentTemplate?.id}
          onNewWorkspace={() => {
            createTemplateMutation.mutate();
          }}
        />

        {/* Middle Panel: Template Editor */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-lg font-semibold text-slate-900">
              {currentTemplate?.title || 'New Template'}
            </h2>
          </div>
          
          <div className="flex-1 p-6">
            {currentTemplate ? (
              <div className="h-full">
                <div className="grid gap-4 h-full">
                  {Object.keys(sections).length > 0 ? (
                    Object.entries(sections).map(([key, value]) => (
                      <div key={key} className="border border-slate-200 rounded-lg p-4">
                        <h3 className="font-semibold text-slate-900 mb-2">{key}</h3>
                        <textarea
                          value={value as string}
                          onChange={(e) => setSections(prev => ({ ...prev, [key]: e.target.value }))}
                          className="w-full h-32 p-2 border border-slate-200 rounded resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder={`Enter content for ${key}...`}
                        />
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Empty Template</h3>
                        <p className="text-slate-600 mb-4">Ask the AI assistant to create template sections</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Template Selected</h3>
                  <p className="text-slate-600 mb-4">Create a new template or select one from the sidebar</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: AI Assistant */}
        <ChatPanel
          workspaceId={currentTemplate?.id || 'new'}
          workspaceType="template"
          onAIResponse={handleAIResponse}
        />
      </div>
    </div>
  );
}