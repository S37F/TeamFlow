import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import { useAuth } from "@/hooks/use-auth";
import { useSocket, type Notification } from "@/hooks/use-socket";
import { Loader2 } from "lucide-react";
import { useEffect, createContext, useContext } from "react";

import AuthPage from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import ProjectsPage from "@/pages/projects";
import ProjectTasksPage from "@/pages/tasks";
import TeamPage from "@/pages/team";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";

// Socket context to share notifications across the app
interface SocketContextType {
  notifications: Notification[];
  unreadCount: number;
  onlineMembers: Set<number>;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
}

const SocketContext = createContext<SocketContextType>({
  notifications: [],
  unreadCount: 0,
  onlineMembers: new Set(),
  markNotificationRead: () => {},
  clearNotifications: () => {},
});

export const useNotifications = () => useContext(SocketContext);

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth/login");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <Component />;
}

function AppWithSocket() {
  const { user } = useAuth();
  const socketData = useSocket(!!user);

  return (
    <SocketContext.Provider value={socketData}>
      <Router />
    </SocketContext.Provider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth/login" component={AuthPage} />
      
      <Route path="/">
        <ProtectedRoute component={Dashboard} />
      </Route>
      
      <Route path="/projects">
        <ProtectedRoute component={ProjectsPage} />
      </Route>
      
      <Route path="/projects/:id/tasks">
        <ProtectedRoute component={ProjectTasksPage} />
      </Route>

      <Route path="/tasks">
        <ProtectedRoute component={ProjectsPage} />
      </Route>

      <Route path="/team">
        <ProtectedRoute component={TeamPage} />
      </Route>

      <Route path="/settings">
        <ProtectedRoute component={SettingsPage} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <AppWithSocket />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
