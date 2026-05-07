import { useState, useEffect } from "react";
import { LayoutShell } from "@/components/layout-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/api";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: organization } = useQuery({
    queryKey: [api.organization.get.path],
    queryFn: async () => {
      const res = await authFetch(api.organization.get.path);
      if (!res.ok) throw new Error("Failed to fetch organization");
      return res.json();
    }
  });

  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Initialize username from user data
  useEffect(() => {
    if (user?.username) setUsername(user.username);
  }, [user]);

  const updateProfile = useMutation({
    mutationFn: async (data: { username?: string; currentPassword?: string; newPassword?: string }) => {
      const res = await authFetch("/api/user/profile", {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData([api.auth.me.path], data);
      toast({ title: "Profile updated successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Update failed", description: error.message });
    },
  });

  const handleSave = () => {
    const updates: any = {};
    
    if (username && username !== user?.username) {
      updates.username = username;
    }
    
    if (newPassword) {
      if (newPassword !== confirmPassword) {
        toast({ variant: "destructive", title: "Passwords don't match" });
        return;
      }
      if (!currentPassword) {
        toast({ variant: "destructive", title: "Current password required" });
        return;
      }
      updates.currentPassword = currentPassword;
      updates.newPassword = newPassword;
    }
    
    if (Object.keys(updates).length === 0) {
      toast({ title: "No changes to save" });
      return;
    }
    
    updateProfile.mutate(updates);
  };

  const handleCancel = () => {
    setUsername(user?.username || "");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <LayoutShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account and organization preferences.</p>
        </div>

        <div className="grid gap-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
              <CardDescription>Your organization information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input id="org-name" value={organization?.name || ""} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
              <Label htmlFor="org-tier">Plan</Label>
              <Input id="org-tier" value="Free" className="capitalize bg-muted" readOnly />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Update your personal account details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  value={username || user?.username || ""} 
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" value={user?.role || ""} className="capitalize bg-muted" readOnly />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your login password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input 
                  id="current-password" 
                  type="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input 
                  id="new-password" 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input 
                  id="confirm-password" 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
