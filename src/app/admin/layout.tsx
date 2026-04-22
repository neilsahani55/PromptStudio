"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useFeedbackNotifications } from "@/hooks/use-feedback-notifications";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  ArrowLeft,
  Menu,
  Loader2,
  ShieldX,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquare, badgeKey: "feedback" as const },
  { href: "/admin/usage", label: "Usage", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { count: newFeedbackCount, refresh } = useFeedbackNotifications(
    "/api/admin/feedback/notifications"
  );

  // When navigating to the feedback page, refresh count after a brief delay
  // so the badge reflects any items the admin just started reviewing.
  useEffect(() => {
    if (pathname === "/admin/feedback") {
      const t = setTimeout(refresh, 500);
      return () => clearTimeout(t);
    }
  }, [pathname, refresh]);

  return (
    <nav className="flex flex-col gap-1 px-3">
      {navItems.map((item) => {
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        const showBadge = item.badgeKey === "feedback" && newFeedbackCount > 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {showBadge && (
              <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {newFeedbackCount > 99 ? "99+" : newFeedbackCount}
              </span>
            )}
          </Link>
        );
      })}
      <div className="my-3 border-t border-border" />
      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" />
        Back to App
      </Link>
    </nav>
  );
}

function SidebarContent() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <LayoutDashboard className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-foreground font-body text-lg">
          Admin
        </span>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <SidebarNav />
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: isLoading, refresh } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [retried, setRetried] = useState(false);

  // If auth finished loading but user is null, retry once
  // This handles edge cases where the initial /api/auth/me fetch races
  useEffect(() => {
    if (!isLoading && !user && !retried) {
      setRetried(true);
      refresh();
    }
  }, [isLoading, user, retried, refresh]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center max-w-md px-6">
          <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <ShieldX className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold font-body">Access Denied</h1>
          <p className="text-muted-foreground">
            You do not have permission to access the admin panel. Please contact
            an administrator if you believe this is an error.
          </p>
          <Link href="/">
            <Button variant="outline" className="mt-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to App
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-card border-r border-border">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-64 p-0 bg-card border-border"
        >
          <SheetTitle className="sr-only">Admin Navigation</SheetTitle>
          <div className="flex h-full flex-col">
            <div className="flex h-16 items-center gap-2 border-b border-border px-6">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <LayoutDashboard className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground font-body text-lg">
                Admin
              </span>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
            <h1 className="text-lg font-semibold font-body">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-muted-foreground">
              {user.name || user.email}
            </span>
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar_url || undefined} alt={user.name || "Admin"} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {(user.name || user.email || "A")
                  .charAt(0)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
