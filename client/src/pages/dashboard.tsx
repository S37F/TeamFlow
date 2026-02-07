import { useAuth } from "@/hooks/use-auth";
import { useOrganization } from "@/hooks/use-organization";
import { useProjects } from "@/hooks/use-projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { LayoutShell } from "@/components/layout-shell";
import { FolderKanban, CheckSquare, Users, ArrowRight, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { user } = useAuth();
  const { organization, members, isLoading: orgLoading } = useOrganization();
  const { projects, isLoading: projectsLoading } = useProjects();

  const isLoading = orgLoading || projectsLoading;

  if (isLoading) {
    return (
      <LayoutShell>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell>
      <div className="flex flex-col gap-8">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">
              Good morning, {user?.username}
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's what's happening in <span className="font-semibold text-foreground">{organization?.name}</span> today.
            </p>
          </div>
          <Link href="/projects">
            <Button className="shadow-lg shadow-primary/25">
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-border/60 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Projects</CardTitle>
              <FolderKanban className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projects?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                +2 from last month
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Team Members</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{members?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Active in workspace
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed Tasks</CardTitle>
              <CheckSquare className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">128</div>
              <p className="text-xs text-muted-foreground mt-1">
                +14% completion rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Projects */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">Recent Projects</h2>
            <Link href="/projects">
              <Button variant="ghost" className="text-sm text-muted-foreground hover:text-primary">
                View all <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects?.slice(0, 3).map((project) => (
              <Link key={project.id} href={`/projects/${project.id}/tasks`}>
                <Card className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-300 group">
                  <CardHeader>
                    <CardTitle className="group-hover:text-primary transition-colors">{project.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description || "No description provided."}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {(!projects || projects.length === 0) && (
              <div className="col-span-full py-12 text-center bg-muted/20 rounded-xl border border-dashed border-border">
                <p className="text-muted-foreground">No projects yet. Create your first one!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
