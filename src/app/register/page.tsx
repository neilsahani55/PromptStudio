"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

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

// Email/password self-registration is disabled — accounts are created via
// Google sign-in so every email is verified.
export default function RegisterPage() {
  return (
    <div className="bg-dot-grid min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <Card className="w-full max-w-md bg-card border border-border shadow-lg rounded-xl">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <Logo size={48} className="rounded-xl shadow-lg shadow-primary/20" />
          </div>
          <CardTitle className="font-headline text-2xl font-bold">
            Create your account
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in with Google — your account is created automatically, and
            your email is verified by Google.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pb-8">
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 h-11 font-medium"
            onClick={() => { window.location.href = "/api/auth/google"; }}
          >
            <GoogleIcon />
            Continue with Google
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            Already have an email account?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
