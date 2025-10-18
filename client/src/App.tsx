import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Agents from "@/pages/agents";
import Conversations from "@/pages/conversations";
import AuditLogs from "@/pages/audit-logs";
import Settings from "@/pages/settings";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { useWebSocket } from "@/hooks/use-websocket";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [location] = useLocation();
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function AuthenticatedLayout() {
  useWebSocket();
  
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-2 border-b border-border bg-card">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
              <Route path="/agents" component={() => <ProtectedRoute component={Agents} />} />
              <Route path="/conversations" component={() => <ProtectedRoute component={Conversations} />} />
              <Route path="/audit-logs" component={() => <ProtectedRoute component={AuditLogs} />} />
              <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route component={AuthenticatedLayout} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
