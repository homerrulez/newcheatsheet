import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import LaTeXRenderer from './latex-renderer';
import { Bold, Italic, Underline, List, ListOrdered, SquareRadical, Code, Quote, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentEditorProps {
  content: string;
  onChange: (content: string) => void;
  onAIContent?: (content: any) => void;
  className?: string;
}

export default function DocumentEditor({ 
  content, 
  onChange, 
  onAIContent, 
  className 
}: DocumentEditorProps) {
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    if (onAIContent) {
      // Listen for AI responses and insert them into the document
      const handleAIResponse = (response: any) => {
        if (response.content) {
          const newContent = content + '\n\n' + response.content;
          onChange(newContent);
        }
      };
      
      // This would be called from the chat panel
      (window as any).handleAIResponse = handleAIResponse;
    }
  }, [content, onChange, onAIContent]);

  const insertText = (before: string, after = '') => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    
    onChange(newText);
    
    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const insertLaTeX = () => {
    insertText('$', '$');
  };

  const renderContent = (text: string) => {
    // Simple markdown-like rendering with LaTeX support
    const lines = text.split('\n');
    return lines.map((line, index) => {
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-3xl font-bold text-slate-900 mb-4">{line.substring(2)}</h1>;
      } else if (line.startsWith('## ')) {
        return <h2 key={index} className="text-xl font-semibold text-slate-900 mb-3">{line.substring(3)}</h2>;
      } else if (line.includes('$')) {
        // Handle inline LaTeX
        const parts = line.split('$');
        return (
          <p key={index} className="text-slate-700 mb-2">
            {parts.map((part, partIndex) => 
              partIndex % 2 === 1 ? (
                <LaTeXRenderer key={partIndex} content={part} className="mx-1" />
              ) : (
                part
              )
            )}
          </p>
        );
      } else if (line.trim()) {
        return <p key={index} className="text-slate-700 mb-2">{line}</p>;
      } else {
        return <br key={index} />;
      }
    });
  };

  return (
    <div className={cn("flex-1 flex flex-col bg-white", className)}>
      {/* Toolbar */}
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertText('**', '**')}
                className="p-2 hover:bg-slate-100"
              >
                <Bold className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertText('*', '*')}
                className="p-2 hover:bg-slate-100"
              >
                <Italic className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertText('_', '_')}
                className="p-2 hover:bg-slate-100"
              >
                <Underline className="w-4 h-4" />
              </Button>
            </div>
            <div className="w-px h-6 bg-slate-300"></div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertText('- ', '')}
                className="p-2 hover:bg-slate-100"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertText('1. ', '')}
                className="p-2 hover:bg-slate-100"
              >
                <ListOrdered className="w-4 h-4" />
              </Button>
            </div>
            <div className="w-px h-6 bg-slate-300"></div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertText('`', '`')}
                className="p-2 hover:bg-slate-100"
              >
                <Code className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => insertText('> ', '')}
                className="p-2 hover:bg-slate-100"
              >
                <Quote className="w-4 h-4" />
              </Button>
            </div>
            <div className="w-px h-6 bg-slate-300"></div>
            <Button
              onClick={insertLaTeX}
              className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm"
            >
              <SquareRadical className="w-4 h-4 mr-2" />
              Insert LaTeX
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={isPreview ? "default" : "outline"}
              size="sm"
              onClick={() => setIsPreview(!isPreview)}
            >
              {isPreview ? "Edit" : "Preview"}
            </Button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {isPreview ? (
          <div className="max-w-4xl mx-auto prose prose-slate">
            {renderContent(content)}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <Textarea
              value={content}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Start writing your document..."
              className="min-h-[500px] text-base leading-relaxed resize-none border-none focus:ring-0 bg-transparent"
            />
          </div>
        )}
      </div>
    </div>
  );
}
