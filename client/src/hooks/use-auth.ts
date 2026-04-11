import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type LoginRequest, type SignupRequest } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { setAccessToken, authFetch } from "@/lib/api";

export function useAuth() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const res = await authFetch(api.auth.me.path);
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        if (res.status === 401) {
          throw new Error(errorData?.error || "Invalid username or password");
        }
        throw new Error(errorData?.error || "Login failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      queryClient.setQueryData([api.auth.me.path], data.user);
      toast({
        title: "Welcome back!",
        description: `Logged in as ${data.user.username}`,
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message,
      });
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupRequest) => {
      const res = await fetch(api.auth.signup.path, {
        method: api.auth.signup.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        if (res.status === 400) {
          throw new Error(errorData?.error || "Validation failed");
        }
        throw new Error(errorData?.error || "Registration failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      queryClient.setQueryData([api.auth.me.path], data.user);
      toast({
        title: "Account created successfully!",
        description: `Welcome to TeamFlow, ${data.user.username}!`,
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message,
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await authFetch(api.auth.logout.path, { method: api.auth.logout.method });
    },
    onSuccess: () => {
      setAccessToken(null);
      queryClient.setQueryData([api.auth.me.path], null);
      queryClient.clear();
      setLocation("/auth/login");
      toast({
        title: "Logged out",
        description: "See you next time!",
      });
    },
  });

  return {
    user,
    isLoading,
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    signup: signupMutation.mutate,
    isSigningUp: signupMutation.isPending,
    logout: logoutMutation.mutate,
  };
}
