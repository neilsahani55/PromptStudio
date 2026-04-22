"use client";

import { Sparkles, LogOut, Shield, Settings, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from './auth-provider';
import { ThemePalette } from './theme-palette';
import { Logo } from './logo';
import { Button } from '@/components/ui/button';
import { useFeedbackNotifications } from '@/hooks/use-feedback-notifications';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { user, logout, loading } = useAuth();
  const { count: feedbackReplyCount } = useFeedbackNotifications(
    '/api/feedback/notifications',
    !!user
  );

  return (
    <header className="py-3 px-4 md:px-6 border-b border-border/50 glass sticky top-0 z-50">
      <div className="container mx-auto max-w-5xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-xl blur-md" />
            <Logo size={42} className="relative rounded-xl shadow-lg shadow-primary/20" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-headline text-foreground tracking-tight">
              PromptStudio
            </h1>
            <p className="text-[11px] text-muted-foreground leading-none hidden sm:block">
              Content to Image Prompt Generator
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-border/50">
            <Sparkles className="w-3 h-3 text-primary" />
            <span>Powered by AI</span>
          </div>

          <ThemePalette />

          {!loading && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative gap-2 text-sm font-medium">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-xs font-bold">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="hidden sm:inline max-w-[100px] truncate">{user.name}</span>
                  {feedbackReplyCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border border-background">
                      {feedbackReplyCount > 9 ? '9+' : feedbackReplyCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/feedback" className="cursor-pointer">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    <span className="flex-1">My Feedback</span>
                    {feedbackReplyCount > 0 && (
                      <span className="ml-2 min-w-[18px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {feedbackReplyCount > 9 ? '9+' : feedbackReplyCount}
                      </span>
                    )}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {user.role === 'admin' && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer">
                        <Shield className="w-4 h-4 mr-2" />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : !loading && !user ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login" className="text-sm font-medium">
                  Sign In
                </Link>
              </Button>
              <Button size="sm" asChild className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90">
                <Link href="/register" className="text-sm font-medium">
                  Sign Up
                </Link>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
