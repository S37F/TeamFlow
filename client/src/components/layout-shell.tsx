import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useOrganization } from "@/hooks/use-organization";
import { 
  LayoutDashboard, 
  FolderKanban, 
  CheckSquare, 
  Users, 
  Settings, 
  LogOut,
  Menu,
  X,
  Bell
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { organization } = useOrganization();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Team', href: '/team', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const isActive = (path: string) => location === path;

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card border-r border-border/50">
      <div className="h-16 flex items-center px-6 border-b border-border/50">
        <div className="flex items-center gap-2 font-display text-xl font-bold text-primary">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            TF
          </div>
          TeamFlow
        </div>
      </div>

      <div className="flex-1 py-6 px-4 space-y-1">
        <div className="px-2 mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {organization?.name || 'Workspace'}
          </p>
        </div>
        
        {navigation.map((item) => (
          <Link key={item.name} href={item.href}>
            <div className={`
              flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all duration-200
              ${isActive(item.href) 
                ? 'bg-primary/10 text-primary font-semibold' 
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'}
            `}>
              <item.icon className="w-5 h-5" />
              {item.name}
            </div>
          </Link>
        ))}
      </div>

      <div className="p-4 border-t border-border/50 bg-muted/20">
        <div className="flex items-center gap-3 mb-4 px-2">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarFallback className="bg-primary/10 text-primary font-bold">
              {user?.username?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.username}</p>
            <p className="text-xs text-muted-foreground truncate capitalize">{user?.role}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20"
          onClick={() => logout()}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden h-16 border-b border-border bg-card flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center gap-2 font-display text-lg font-bold text-primary">
          <div className="w-7 h-7 rounded bg-primary flex items-center justify-center text-primary-foreground text-xs">TF</div>
          TeamFlow
        </div>
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 h-full">
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="h-16 border-b border-border/50 bg-background/50 backdrop-blur-sm sticky top-0 z-40 flex items-center justify-between px-8">
            <h2 className="text-lg font-semibold text-foreground">
              {navigation.find(n => isActive(n.href))?.name || 'Dashboard'}
            </h2>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Bell className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
