import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, signupSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles } from "lucide-react";

export default function AuthPage() {
  const { login, signup, isLoggingIn, isSigningUp } = useAuth();
  const [activeTab, setActiveTab] = useState("login");

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" }
  });

  const signupForm = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { username: "", password: "", organizationName: "" }
  });

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Visual Side */}
      <div className="hidden lg:flex flex-col bg-primary/5 relative overflow-hidden p-12 justify-between border-r border-border">
        {/* Abstract background pattern */}
        <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 font-display text-2xl font-bold text-primary mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
              <Sparkles className="w-6 h-6" />
            </div>
            TeamFlow
          </div>
          <h1 className="text-5xl font-display font-bold text-foreground mb-6 leading-tight">
            Manage projects<br />
            <span className="text-primary">with superpowers.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-md">
            The all-in-one workspace for high-performance teams. Streamline your workflow today.
          </p>
        </div>

        {/* Decorative Image */}
        <div className="relative z-10 mt-12 rounded-xl overflow-hidden shadow-2xl border border-border/50 rotate-2 hover:rotate-0 transition-transform duration-500">
          {/* Dashboard preview placeholder - abstract representation */}
          <div className="bg-background aspect-video p-6 grid grid-cols-3 gap-4">
             <div className="col-span-1 bg-muted/50 rounded-lg h-full animate-pulse" />
             <div className="col-span-2 space-y-4">
               <div className="h-24 bg-primary/5 rounded-lg border border-primary/10" />
               <div className="h-24 bg-muted/30 rounded-lg" />
               <div className="h-24 bg-muted/30 rounded-lg" />
             </div>
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex justify-center mb-8">
            <div className="flex items-center gap-2 font-display text-2xl font-bold text-primary">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
                TF
              </div>
              TeamFlow
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="space-y-2 text-center mb-6">
                <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
                <p className="text-muted-foreground">Enter your credentials to access your account</p>
              </div>

              <form onSubmit={loginForm.handleSubmit((d) => login(d))} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">Username</Label>
                  <Input 
                    id="login-username" 
                    placeholder="johndoe" 
                    className="h-11"
                    {...loginForm.register("username")} 
                  />
                  {loginForm.formState.errors.username && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.username.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input 
                    id="login-password" 
                    type="password" 
                    className="h-11"
                    {...loginForm.register("password")} 
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full h-11 text-base shadow-lg shadow-primary/25" disabled={isLoggingIn}>
                  {isLoggingIn ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="space-y-2 text-center mb-6">
                <h2 className="text-2xl font-bold tracking-tight">Create an account</h2>
                <p className="text-muted-foreground">Start your 14-day free trial today</p>
              </div>

              <form onSubmit={signupForm.handleSubmit((d) => signup(d))} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-org">Organization Name</Label>
                  <Input 
                    id="reg-org" 
                    placeholder="Acme Inc." 
                    className="h-11"
                    {...signupForm.register("organizationName")} 
                  />
                  {signupForm.formState.errors.organizationName && (
                    <p className="text-sm text-destructive">{signupForm.formState.errors.organizationName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-username">Username</Label>
                  <Input 
                    id="reg-username" 
                    placeholder="johndoe" 
                    className="h-11"
                    {...signupForm.register("username")} 
                  />
                  {signupForm.formState.errors.username && (
                    <p className="text-sm text-destructive">{signupForm.formState.errors.username.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input 
                    id="reg-password" 
                    type="password" 
                    className="h-11"
                    {...signupForm.register("password")} 
                  />
                  {signupForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{signupForm.formState.errors.password.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full h-11 text-base shadow-lg shadow-primary/25" disabled={isSigningUp}>
                  {isSigningUp ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
