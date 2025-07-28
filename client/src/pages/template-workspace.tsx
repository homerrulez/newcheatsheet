import { useState, useEffect } from 'react';
import { useParams, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, Printer, FileSpreadsheet, Clock, CheckCircle, Circle, Timer, Ruler } from 'lucide-react';
import ChatPanel from '@/components/chat-panel';
import LaTeXRenderer from '@/components/latex-renderer';
import { Template, TemplateSection } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const templateTypes = {
  'mathematics': 'Mathematics Reference',
  'physics': 'Physics Formulas',
  'chemistry': 'Chemistry Equations',
  'statistics': 'Statistics Summary'
};

const defaultSections: TemplateSection[] = [
  { id: 'algebra', title: 'ALGEBRA', content: '', status: 'empty', position: { row: 0, col: 0 } },
  { id: 'calculus', title: 'CALCULUS', content: '', status: 'empty', position: { row: 0, col: 1 } },
  { id: 'trigonometry', title: 'TRIGONOMETRY', content: '', status: 'empty', position: { row: 0, col: 2 } },
  { id: 'geometry', title: 'GEOMETRY', content: '', status: 'empty', position: { row: 0, col: 3 } },
  { id: 'statistics', title: 'STATISTICS', content: '', status: 'empty', position: { row: 1, col: 0 } },
  { id: 'logarithms', title: 'LOGARITHMS', content: '', status: 'empty', position: { row: 1, col: 1 } },
  { id: 'vectors', title: 'VECTORS', content: '', status: 'empty', position: { row: 1, col: 2 } },
  { id: 'matrices', title: 'MATRICES', content: '', status: 'empty', position: { row: 1, col: 3 } },
  { id: 'sequences', title: 'SEQUENCES', content: '', status: 'empty', position: { row: 2, col: 0 } },
  { id: 'complex', title: 'COMPLEX', content: '', status: 'empty', position: { row: 2, col: 1 } },
  { id: 'limits', title: 'LIMITS', content: '', status: 'empty', position: { row: 2, col: 2 } },
  { id: 'series', title: 'SERIES', content: '', status: 'empty', position: { row: 2, col: 3 } },
  { id: 'probability', title: 'PROBABILITY', content: '', status: 'empty', position: { row: 3, col: 0 } },
  { id: 'constants', title: 'CONSTANTS', content: '', status: 'empty', position: { row: 3, col: 1 } },
  { id: 'conversions', title: 'CONVERSIONS', content: '', status: 'empty', position: { row: 3, col: 2 } },
  { id: 'misc', title: 'MISC', content: '', status: 'empty', position: { row: 3, col: 3 } },
];

export default function TemplateWorkspace() {
  const { id } = useParams();
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);
  const [sections, setSections] = useState<TemplateSection[]>(defaultSections);
  const [selectedType, setSelectedType] = useState('mathematics');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch templates list
  const { data: templates = [] } = useQuery({
    queryKey: ['/api/templates'],
  });

  // Fetch current template
  const { data: template } = useQuery({
    queryKey: ['/api/templates', id],
    enabled: !!id,
  });

  useEffect(() => {
    if (template) {
      setCurrentTemplate(template as Template);
      setSelectedType((template as Template).templateType);
      setSections(Array.isArray((template as Template).sections) ? (template as Template).sections as TemplateSection[] : defaultSections);
    } else if (!id && Array.isArray(templates) && templates.length > 0) {
      const firstTemplate = templates[0] as Template;
      setCurrentTemplate(firstTemplate);
      setSelectedType(firstTemplate.templateType);
      setSections(Array.isArray(firstTemplate.sections) ? firstTemplate.sections as TemplateSection[] : defaultSections);
    }
  }, [template, templates, id]);

  // Create new template
  const createTemplateMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/templates', {
      title: templateTypes[selectedType as keyof typeof templateTypes],
      templateType: selectedType,
      sections: defaultSections
    }),
    onSuccess: async (response) => {
      const newTemplate = await response.json();
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      setCurrentTemplate(newTemplate);
      setSections(defaultSections);
      window.history.pushState({}, '', `/template/${newTemplate.id}`);
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

  const handleExportPDF = () => {
    if (completedSections === 0) {
      toast({
        title: "Nothing to export",
        description: "Please fill some template sections first.",
        variant: "destructive"
      });
      return;
    }

    // Create a printable HTML version for PDF export
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${templateTypes[selectedType as keyof typeof templateTypes]}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 40px; background: white; }
              .template-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
              .template-title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
              .template-subtitle { font-size: 14px; color: #666; }
              .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; height: 720px; }
              .section { border: 1px solid #ccc; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; }
              .section-title { font-weight: bold; text-align: center; margin-bottom: 8px; font-size: 11px; }
              .section-content { flex: 1; font-size: 10px; line-height: 1.3; }
              .empty { background: #f9f9f9; color: #999; }
              .filled { background: #f0f8ff; }
              @media print { 
                body { margin: 0; padding: 20px; } 
                .template-header { page-break-inside: avoid; }
                .grid { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <div class="template-header">
              <div class="template-title">${templateTypes[selectedType as keyof typeof templateTypes].toUpperCase()}</div>
              <div class="template-subtitle">Essential Formulas & Concepts</div>
            </div>
            <div class="grid">
              ${sections.map(section => `
                <div class="section ${section.status === 'complete' ? 'filled' : 'empty'}">
                  <div class="section-title">${section.title}</div>
                  <div class="section-content">
                    ${section.status === 'complete' && section.content ? 
                      section.content.replace(/\$/g, '') : 
                      'Empty'
                    }
                  </div>
                </div>
              `).join('')}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }

    toast({
      title: "Export ready",
      description: "Use your browser's print dialog to save as PDF.",
    });
  };

  const handlePrint = () => {
    if (completedSections === 0) {
      toast({
        title: "Nothing to print",
        description: "Please fill some template sections first.",
        variant: "destructive"
      });
      return;
    }

    window.print();
    
    toast({
      title: "Printing template",
      description: "Your template is being sent to the printer.",
    });
  };

  const handleAIResponse = (response: any) => {
    if (response.sections) {
      setSections(prev => 
        prev.map(section => {
          const aiSection = response.sections[section.id];
          if (aiSection) {
            return {
              ...section,
              content: aiSection.content || section.content,
              status: 'complete' as const
            };
          }
          return section;
        })
      );
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete': return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'filling': return <Timer className="w-3 h-3 text-yellow-600" />;
      default: return <Circle className="w-3 h-3 text-slate-400" />;
    }
  };

  const getSectionColor = (index: number) => {
    const colors = [
      'bg-blue-50 border-blue-200 text-blue-900',
      'bg-green-50 border-green-200 text-green-900',
      'bg-purple-50 border-purple-200 text-purple-900',
      'bg-orange-50 border-orange-200 text-orange-900',
      'bg-teal-50 border-teal-200 text-teal-900',
      'bg-pink-50 border-pink-200 text-pink-900'
    ];
    return colors[index % colors.length];
  };

  const completedSections = sections.filter(s => s.status === 'complete').length;

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
              <div className="w-8 h-8 workspace-card-template rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="text-white text-sm" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Template Cheat Sheet</h1>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              onClick={handleExportPDF}
              disabled={completedSections === 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
            <Button 
              variant="outline" 
              onClick={handlePrint}
              disabled={completedSections === 0}
              className="no-print"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </header>

      {/* Template Layout */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Panel: Template Options */}
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-3">Template Library</h3>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(templateTypes).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="font-medium text-emerald-900 text-sm mb-1">Current Template</div>
                <div className="text-xs text-emerald-700">
                  {templateTypes[selectedType as keyof typeof templateTypes]}
                </div>
                <div className="text-xs text-emerald-600 mt-1 flex items-center">
                  <Ruler className="w-3 h-3 mr-1" />
                  8.5" × 11" • 16 sections
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-slate-900 text-sm">Section Status</h4>
                <div className="text-xs text-slate-600 mb-2">
                  {completedSections} of {sections.length} complete
                </div>
                {sections.slice(0, 8).map((section) => (
                  <div key={section.id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">{section.title}</span>
                    {getStatusIcon(section.status)}
                  </div>
                ))}
                {sections.length > 8 && (
                  <div className="text-xs text-slate-500">
                    + {sections.length - 8} more sections
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Middle Panel: Template Sheet (8.5x11) */}
        <div className="flex-1 flex flex-col bg-slate-100">
          {/* Template Controls */}
          <div className="bg-white border-b border-slate-200 p-4 no-print">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {templateTypes[selectedType as keyof typeof templateTypes]}
              </h2>
              <div className="flex items-center space-x-4 text-sm text-slate-600">
                <span className="flex items-center">
                  <Ruler className="w-4 h-4 mr-1" />
                  8.5" × 11"
                </span>
                <span className="flex items-center">
                  <FileSpreadsheet className="w-4 h-4 mr-1" />
                  16 sections
                </span>
                <span className="flex items-center text-green-600">
                  <Printer className="w-4 h-4 mr-1" />
                  Printer ready
                </span>
              </div>
            </div>
          </div>

          {/* 8.5x11 Template Layout */}
          <ScrollArea className="flex-1 p-8 flex items-center justify-center">
            <div className="bg-white shadow-2xl print-template" style={{ width: '680px', height: '880px', padding: '40px' }}>
              {/* Template Header */}
              <div className="text-center mb-6 border-b-2 border-slate-300 pb-3">
                <h1 className="text-2xl font-bold text-slate-900">
                  {templateTypes[selectedType as keyof typeof templateTypes].toUpperCase()}
                </h1>
                <p className="text-sm text-slate-600 mt-1">Essential Formulas & Concepts</p>
              </div>

              {/* 4x4 Grid Layout */}
              <div className="grid grid-cols-4 gap-3 h-full">
                {sections.map((section, index) => (
                  <div
                    key={section.id}
                    className={`rounded p-3 flex flex-col text-xs ${
                      section.status === 'complete' 
                        ? getSectionColor(index)
                        : 'bg-slate-50 border border-slate-200'
                    }`}
                  >
                    <h3 className={`font-bold mb-2 text-center ${
                      section.status === 'complete' ? '' : 'text-slate-700'
                    }`}>
                      {section.title}
                    </h3>
                    <div className="flex-1">
                      {section.status === 'complete' && section.content ? (
                        <div className="space-y-1">
                          {section.content.includes('$') ? (
                            <LaTeXRenderer 
                              content={section.content.replace(/\$/g, '')} 
                              className="text-xs"
                            />
                          ) : (
                            <div className="text-xs">{section.content}</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center text-slate-500 flex items-center justify-center h-full">
                          {section.status === 'filling' ? (
                            <>
                              <Timer className="w-3 h-3 mr-1" />
                              <span>AI Filling...</span>
                            </>
                          ) : (
                            <>
                              <Circle className="w-3 h-3 mr-1" />
                              <span>Empty</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel: ChatGPT */}
        <ChatPanel
          workspaceId={currentTemplate?.id || 'new'}
          workspaceType="template"
          onAIResponse={handleAIResponse}
          className="no-print"
        />
      </div>
    </div>
  );
}
