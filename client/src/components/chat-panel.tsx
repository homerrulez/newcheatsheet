import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getChatMessages, sendChatMessage } from '@/lib/openai';
import { ChatMessage } from '@shared/schema';
import { Bot, Send, User, Zap, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ChatPanelProps {
  workspaceId: string;
  workspaceType: 'document' | 'cheatsheet' | 'template';
  onAIResponse?: (response: any) => void;
  className?: string;
  currentBoxes?: any[];
}

export default function ChatPanel({ 
  workspaceId, 
  workspaceType, 
  onAIResponse, 
  className,
  currentBoxes
}: ChatPanelProps) {
  const [message, setMessage] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['/api/chat', workspaceType, workspaceId],
    queryFn: () => getChatMessages(workspaceType, workspaceId),
    enabled: !!workspaceId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (msg: string) => sendChatMessage(workspaceId, workspaceType, msg, currentBoxes),
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: ['/api/chat', workspaceType, workspaceId],
      });
      onAIResponse?.(response);
      setMessage('');
    },
    onError: (error: any) => {
      console.error('Chat error:', error);
      toast({
        title: "ChatGPT Error",
        description: error.message?.includes('quota') 
          ? "API quota exceeded. Please check your OpenAI billing or try again later."
          : "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  const getWorkspaceTitle = () => {
    switch (workspaceType) {
      case 'document': return 'AI Assistant';
      case 'cheatsheet': return 'Formula Assistant';
      case 'template': return 'Template Filler';
      default: return 'AI Assistant';
    }
  };

  const getWorkspaceColor = () => {
    switch (workspaceType) {
      case 'document': return 'bg-blue-500';
      case 'cheatsheet': return 'bg-purple-500';
      case 'template': return 'bg-emerald-500';
      default: return 'bg-gray-500';
    }
  };

  const getPlaceholder = () => {
    switch (workspaceType) {
      case 'document': return 'Ask ChatGPT...';
      case 'cheatsheet': return 'Request formulas...';
      case 'template': return 'Template instructions...';
      default: return 'Type a message...';
    }
  };

  return (
    <div className={cn("w-[448px] bg-white border-l border-slate-200 flex flex-col", className)}>
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center space-x-2 mb-3">
          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center", getWorkspaceColor())}>
            <Bot className="w-3 h-3 text-white" />
          </div>
          <h3 className="font-semibold text-slate-900">{getWorkspaceTitle()}</h3>
          <div className="w-2 h-2 bg-green-400 rounded-full ml-auto"></div>
        </div>
        <p className="text-sm text-slate-600">
          {workspaceType === 'document' && "Ask questions and get formatted answers automatically inserted into your document."}
          {workspaceType === 'cheatsheet' && "Request mathematical formulas and they'll be added as draggable, resizable boxes with LaTeX rendering."}
          {workspaceType === 'template' && "AI fills specific template sections with properly formatted content."}
        </p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg: ChatMessage) => (
            <div key={msg.id} className={cn("flex", msg.role === 'user' ? "justify-end" : "")}>
              <div className={cn(
                "max-w-xs p-3 rounded-lg",
                msg.role === 'user' 
                  ? cn("text-white", getWorkspaceColor())
                  : "bg-slate-100"
              )}>
                <div className="flex items-start space-x-2">
                  {msg.role === 'assistant' && <Bot className="w-4 h-4 mt-0.5 text-slate-600" />}
                  {msg.role === 'user' && <User className="w-4 h-4 mt-0.5 text-white" />}
                  <div>
                    <p className="text-sm">{
                      msg.role === 'assistant' 
                        ? (() => {
                            try {
                              const parsed = JSON.parse(msg.content);
                              return parsed.content || parsed.message || msg.content;
                            } catch {
                              return msg.content;
                            }
                          })()
                        : msg.content
                    }</p>
                    {msg.role === 'assistant' && (
                      <div className="bg-green-50 border border-green-200 p-2 rounded text-xs text-green-800 mt-2">
                        <Zap className="w-3 h-3 inline mr-1" />
                        Content processed & formatted
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {sendMessageMutation.isPending && (
            <div className="flex">
              <div className="bg-slate-100 p-3 rounded-lg max-w-xs">
                <div className="flex items-center space-x-2">
                  <Bot className="w-4 h-4 text-slate-600" />
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-slate-200">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            type="text"
            placeholder={getPlaceholder()}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 text-sm"
            disabled={sendMessageMutation.isPending}
          />
          <Button
            type="submit"
            disabled={!message.trim() || sendMessageMutation.isPending}
            className={cn("", getWorkspaceColor())}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        {workspaceType === 'cheatsheet' && messages.length === 0 && (
          <div className="mt-3 space-y-2">
            <div className="text-xs text-slate-600 mb-1">Quick suggestions:</div>
            <div className="space-y-1">
              <button 
                onClick={() => setMessage("Give me 50 essential calculus formulas with LaTeX formatting")}
                className="w-full text-left text-xs p-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded transition-colors"
              >
                50 Calculus Formulas
              </button>
              <button 
                onClick={() => setMessage("Give me 50 algebra and trigonometry formulas")}
                className="w-full text-left text-xs p-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded transition-colors"
              >
                50 Algebra & Trig Formulas
              </button>
              <button 
                onClick={() => setMessage("Give me 50 physics formulas with units")}
                className="w-full text-left text-xs p-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded transition-colors"
              >
                50 Physics Formulas
              </button>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
          <span>Press Enter to send</span>
          <span className="flex items-center">
            <Zap className="w-3 h-3 mr-1" />
            Auto-format enabled
          </span>
        </div>
      </div>
    </div>
  );
}
