import { useOrganization } from "@/hooks/use-organization";
import { LayoutShell } from "@/components/layout-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Mail } from "lucide-react";

export default function TeamPage() {
  const { organization, members, isLoading } = useOrganization();

  return (
    <LayoutShell>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Team Members</h1>
            <p className="text-muted-foreground mt-1">Manage users and permissions for {organization?.name}.</p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Invite Member
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            [1, 2, 3].map(i => <div key={i} className="h-24 bg-muted/20 animate-pulse rounded-xl" />)
          ) : (
            members?.map(member => (
              <Card key={member.id} className="hover:shadow-md transition-shadow">
                <CardContent className="flex items-center gap-4 p-6">
                  <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                      {member.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold truncate">{member.username}</h4>
                      <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                        {member.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate flex items-center mt-1">
                      <Mail className="w-3 h-3 mr-1" />
                      user@{organization?.name.toLowerCase().replace(/\s/g, '')}.com
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </LayoutShell>
  );
}
