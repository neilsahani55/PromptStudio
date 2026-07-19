"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import { Logo } from "@/components/logo";

const OAUTH_ERRORS: Record<string, string> = {
  blocked: "Your account has been blocked. Please contact an administrator.",
  google_denied: "Google sign-in was cancelled.",
  google_unverified: "Your Google email is not verified.",
  google_not_configured: "Google sign-in is not configured yet. Use email login or contact the administrator.",
  google_state: "Sign-in session expired. Please try again.",
  google_token: "Google sign-in failed. Please try again.",
  google_profile: "Could not read your Google profile. Please try again.",
  google_create: "Could not create your account. Please try again.",
  google_error: "Google sign-in failed. Please try again.",
};

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Surface OAuth errors passed back as ?error=<code>.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("error");
    if (code) setError(OAUTH_ERRORS[code] || "Sign-in failed. Please try again.");
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      // Hard navigation so middleware + layout fully re-initialize with the new cookie
      window.location.href = "/studio";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-dot-grid min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <Card className="w-full max-w-md bg-card border border-border shadow-lg rounded-xl">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <Logo size={48} className="rounded-xl shadow-lg shadow-primary/20" />
          </div>
          <CardTitle className="font-headline text-2xl font-bold">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to your account
          </CardDescription>
        </CardHeader>

        <CardContent className="pb-0 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Primary: Google sign-in (verified emails only — no fake accounts) */}
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 h-11 font-medium"
            onClick={() => { window.location.href = "/api/auth/google"; }}
          >
            <GoogleIcon />
            Continue with Google
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            New here? Your account is created automatically with your Google email.
          </p>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">or email</span>
            <div className="h-px flex-1 bg-border" />
          </div>
        </CardContent>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-4">

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Email login is for existing accounts. New accounts are created with Google.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
