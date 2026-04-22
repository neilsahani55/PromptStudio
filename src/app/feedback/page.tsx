"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Loader2,
  RefreshCw,
  ArrowLeft,
  Bell,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/header";
import { useAuth } from "@/components/auth-provider";

interface FeedbackItem {
  id: number;
  type: "bug" | "suggestion" | "improvement";
  title: string;
  message: string;
  status: "new" | "reviewing" | "resolved" | "dismissed";
  admin_note: string | null;
  created_at: string;
  admin_responded_at: string | null;
  user_viewed_at: string | null;
}

const typeBadgeStyles: Record<FeedbackItem["type"], string> = {
  bug: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  suggestion:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  improvement:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
};

const statusBadgeStyles: Record<FeedbackItem["status"], string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  reviewing:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  resolved:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  dismissed:
    "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isUnread(item: FeedbackItem): boolean {
  if (!item.admin_responded_at) return false;
  if (!item.user_viewed_at) return true;
  return new Date(item.admin_responded_at) > new Date(item.user_viewed_at);
}

export default function MyFeedbackPage() {
  const { user, loading: authLoading } = useAuth();
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeedback = useCallback(async () => {
    try {
      const res = await fetch("/api/feedback", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load feedback");
      const data = await res.json();
      setFeedback(data.feedback || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchFeedback();
  }, [user, fetchFeedback]);

  // Mark all admin responses as viewed once the user lands on this page.
  useEffect(() => {
    if (!user || loading) return;
    const hasUnread = feedback.some(isUnread);
    if (!hasUnread) return;
    fetch("/api/feedback/mark-viewed", { method: "POST" })
      .then(() => {
        // Refresh to get updated user_viewed_at timestamps
        fetchFeedback();
      })
      .catch(() => {
        /* best-effort */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  const unreadCount = useMemo(
    () => feedback.filter(isUnread).length,
    [feedback]
  );

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="h-8 px-2 -ml-2">
                <Link href="/">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Link>
              </Button>
            </div>
            <h1 className="text-2xl font-bold font-headline mt-1">
              My Feedback
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track the status of feedback you&apos;ve submitted and see admin responses.
              {unreadCount > 0 && (
                <span className="ml-1 text-primary font-medium">
                  {unreadCount} new response{unreadCount === 1 ? "" : "s"}.
                </span>
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              fetchFeedback();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="rounded-xl">
                <CardContent className="p-5 space-y-3">
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="rounded-xl">
            <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
              <p className="text-muted-foreground">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLoading(true);
                  fetchFeedback();
                }}
              >
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : feedback.length === 0 ? (
          <Card className="rounded-xl">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                You haven&apos;t submitted any feedback yet.
              </p>
              <p className="text-xs text-muted-foreground">
                Use the floating feedback button on the main page to share your thoughts.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {feedback.map((item) => {
              const unread = isUnread(item);
              return (
                <Card
                  key={item.id}
                  className={`rounded-xl shadow-sm ${
                    unread ? "ring-2 ring-primary/50" : ""
                  }`}
                >
                  <CardContent className="p-5 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={typeBadgeStyles[item.type]}
                        >
                          {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                        </Badge>
                        <Badge className={statusBadgeStyles[item.status]}>
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </Badge>
                        {unread && (
                          <Badge className="bg-primary text-primary-foreground gap-1">
                            <Bell className="h-3 w-3" />
                            New reply
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(item.created_at)}
                      </span>
                    </div>

                    <h3 className="font-semibold text-base">{item.title}</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {item.message}
                    </p>

                    {item.admin_note ? (
                      <div className="rounded-lg bg-primary/10 dark:bg-primary/15 border border-primary/30 p-3 mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-primary">
                            Admin Response
                          </p>
                          {item.admin_responded_at && (
                            <span className="text-[11px] text-muted-foreground">
                              {formatDate(item.admin_responded_at)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {item.admin_note}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        Awaiting admin response.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
