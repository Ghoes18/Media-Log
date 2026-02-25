import { useState } from "react";
import { Link, useLocation } from "wouter";
import { authClient } from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { refetchUser } = useAuth();
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (!authClient) {
      setError("Auth is not configured.");
      setLoading(false);
      return;
    }
    try {
      const auth = authClient!.auth;
      if (isSignUp) {
        const result = await auth.signUp.email({
          name: name.trim() || email.split("@")[0] || "User",
          email: email.trim(),
          password,
        });
        if ((result as { error?: { message?: string } })?.error) {
          setError((result as { error: { message?: string } }).error.message ?? "Sign up failed");
          setLoading(false);
          return;
        }
      } else {
        const result = await auth.signIn.email({
          email: email.trim(),
          password,
        });
        if ((result as { error?: { message?: string } })?.error) {
          setError((result as { error: { message?: string } }).error.message ?? "Sign in failed");
          setLoading(false);
          return;
        }
      }
      await refetchUser();
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="glass bg-noise w-full max-w-sm rounded-lg">
        <CardHeader>
          <CardTitle className="font-serif">
            {isSignUp ? "Create account" : "Sign in"}
          </CardTitle>
          <CardDescription>
            {isSignUp
              ? "Sign up to save your watchlist and reviews."
              : "Sign in to your Tastelog account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="rounded-md"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="rounded-md"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isSignUp ? "new-password" : "current-password"}
                className="rounded-md"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button skeuo type="submit" disabled={loading} className="w-full rounded-md">
              {loading ? "Please wait…" : isSignUp ? "Sign up" : "Sign in"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {isSignUp ? (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="text-primary underline underline-offset-2 hover:no-underline"
                    onClick={() => {
                      setIsSignUp(false);
                      setError("");
                    }}
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    className="text-primary underline underline-offset-2 hover:no-underline"
                    onClick={() => {
                      setIsSignUp(true);
                      setError("");
                    }}
                  >
                    Sign up
                  </button>
                </>
              )}
            </p>
          </form>
          <p className="mt-4 text-center">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to home
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
