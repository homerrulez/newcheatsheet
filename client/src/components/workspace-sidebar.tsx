import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { Plus, MessageSquare, FileText, Grid3X3, FileSpreadsheet, Trash2 } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';

interface WorkspaceSidebarProps {
  workspaceType: 'document' | 'cheatsheet' | 'template';
  currentWorkspaceId?: string;
  onNewWorkspace: () => void;
}

interface WorkspaceItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export default function WorkspaceSidebar({ 
  workspaceType, 
  currentWorkspaceId, 
  onNewWorkspace 
}: WorkspaceSidebarProps) {
  const [location] = useLocation();

  // Fetch workspace list based on type
  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: [`/api/${workspaceType}s`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/${workspaceType}s`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const getWorkspaceIcon = () => {
    switch (workspaceType) {
      case 'document': return FileText;
      case 'cheatsheet': return Grid3X3;
      case 'template': return FileSpreadsheet;
      default: return MessageSquare;
    }
  };

  const getWorkspaceTitle = () => {
    switch (workspaceType) {
      case 'document': return 'Documents';
      case 'cheatsheet': return 'Cheat Sheets';
      case 'template': return 'Templates';
      default: return 'Workspaces';
    }
  };

  const getNewWorkspaceText = () => {
    switch (workspaceType) {
      case 'document': return 'New document';
      case 'cheatsheet': return 'New cheat sheet';
      case 'template': return 'New template';
      default: return 'New workspace';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  const Icon = getWorkspaceIcon();

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center space-x-2 mb-4">
          <Icon className="w-5 h-5" />
          <h2 className="font-semibold">{getWorkspaceTitle()}</h2>
        </div>
        
        <Button 
          onClick={onNewWorkspace}
          className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          {getNewWorkspaceText()}
        </Button>
      </div>

      {/* Workspace List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="text-slate-400 text-sm p-2">Loading...</div>
          ) : !Array.isArray(workspaces) || workspaces.length === 0 ? (
            <div className="text-slate-400 text-sm p-2">
              No {workspaceType}s yet. Create one to get started!
            </div>
          ) : (
            <div className="space-y-1">
              {Array.isArray(workspaces) && workspaces.map((workspace: WorkspaceItem) => (
                <Link
                  key={workspace.id}
                  href={`/${workspaceType}/${workspace.id}`}
                  className={cn(
                    'block px-3 py-2 rounded-lg text-sm hover:bg-slate-800 transition-colors cursor-pointer group',
                    currentWorkspaceId === workspace.id && 'bg-slate-800'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {workspace.title || `Untitled ${workspaceType}`}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatDate(workspace.updatedAt)}
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-6 h-6 p-0 text-slate-400 hover:text-red-400"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (confirm(`Delete ${workspace.title}?`)) {
                            try {
                              await apiRequest('DELETE', `/api/${workspaceType}s/${workspace.id}`);
                              // Refresh the list after deletion
                              window.location.reload();
                            } catch (error) {
                              console.error('Delete failed:', error);
                            }
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <div className="text-xs text-slate-400">
          StudyFlow - Academic Productivity Platform
        </div>
      </div>
    </div>
  );
}