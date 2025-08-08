import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import DocumentWorkspace from "@/pages/document-workspace";

import TemplateWorkspace from "@/pages/template-workspace";
import CheatSheetWorkspaceNew from "@/pages/cheatsheet-workspace-new";
import TemplateWorkspaceNew from "@/pages/template-workspace-new";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/document/:id?" component={DocumentWorkspace} />
      <Route path="/cheatsheet-new/:id?" component={CheatSheetWorkspaceNew} />
      <Route path="/cheatsheet/:id?" component={CheatSheetWorkspaceNew} />
      <Route path="/template-new/:id?" component={TemplateWorkspaceNew} />
      <Route path="/template/:id?" component={TemplateWorkspace} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
