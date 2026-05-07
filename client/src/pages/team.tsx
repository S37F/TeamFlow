import { useState } from "react";
import { useOrganization } from "@/hooks/use-organization";
import { LayoutShell } from "@/components/layout-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, UserMinus } from "lucide-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { authFetch } from "@/lib/api";
import type { User } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function TeamPage() {
  const { organization, members, isLoading } = useOrganization();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [removingMember, setRemovingMember] = useState<any>(null);
  const canInviteAdmin = user?.role === "owner";

  const inviteMember = useMutation({
    mutationFn: async (data: { username: string; password: string; role: string }) => {
      const res = await authFetch("/api/organization/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to invite member");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/members"] });
      toast({
        title: "Member invited successfully!",
        description: "The new team member can now log in.",
      });
      setIsInviteDialogOpen(false);
      setInviteUsername("");
      setInvitePassword("");
      setInviteRole("member");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to invite member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUsername || !invitePassword) {
      toast({
        title: "Missing information",
        description: "Please provide username and password",
        variant: "destructive",
      });
      return;
    }
    inviteMember.mutate({
      username: inviteUsername,
      password: invitePassword,
      role: canInviteAdmin ? inviteRole : "member",
    });
  };

  const removeMember = useMutation({
    mutationFn: async (memberId: number) => {
      const res = await authFetch(`/api/organization/members/${memberId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to remove member" }));
        throw new Error(error.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/members"] });
      toast({ title: "Member removed", description: "Team member has been removed." });
      setRemovingMember(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove member", description: error.message, variant: "destructive" });
    },
  });

  const canManageMembers = user?.role === "owner" || user?.role === "admin";

  return (
    <LayoutShell>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Team Members</h1>
            <p className="text-muted-foreground mt-1">Manage users and permissions for {organization?.name}.</p>
          </div>
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Add a new member to {organization?.name}. They'll be able to log in immediately.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    placeholder="john.doe"
                    value={inviteUsername}
                    onChange={(e) => setInviteUsername(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be their login username
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Temporary Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a password for them"
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 6 characters. Share this with them securely.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      {canInviteAdmin && <SelectItem value="admin">Admin</SelectItem>}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Admins have full access to manage projects and tasks
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsInviteDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={inviteMember.isPending}>
                    {inviteMember.isPending ? "Inviting..." : "Invite Member"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            [1, 2, 3].map(i => <div key={i} className="h-24 bg-muted/20 animate-pulse rounded-xl" />)
          ) : (
            members?.map((member: Omit<User, "password">) => (
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
                      <div className="flex items-center gap-2">
                        <Badge variant={member.role === 'admin' || member.role === 'owner' ? 'default' : 'secondary'} className="capitalize">
                          {member.role}
                        </Badge>
                        {canManageMembers && member.id !== user?.id && member.role !== 'owner' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setRemovingMember(member)}
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      Joined {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'recently'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Remove Member Confirmation */}
        <AlertDialog open={!!removingMember} onOpenChange={() => setRemovingMember(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove <strong>{removingMember?.username}</strong> from {organization?.name}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => removingMember && removeMember.mutate(removingMember.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </LayoutShell>
  );
}
