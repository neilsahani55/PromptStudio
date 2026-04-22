"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  UserPlus,
  Activity,
  MessageSquare,
  Clock,
  CheckCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsData {
  totalUsers: number;
  newToday: number;
  activeUsers: number;
  totalFeedback: number;
  pendingFeedback: number;
  resolvedFeedback: number;
  feedbackByStatus: {
    new: number;
    reviewing: number;
    resolved: number;
    dismissed: number;
  };
  recentActivity: {
    id: string;
    userName: string;
    action: string;
    details: string;
    timestamp: string;
  }[];
}

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const statCards = [
  {
    key: "totalUsers" as const,
    label: "Total Users",
    icon: Users,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
  },
  {
    key: "newToday" as const,
    label: "New Today",
    icon: UserPlus,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
  },
  {
    key: "activeUsers" as const,
    label: "Active Users",
    icon: Activity,
    color: "text-primary",
    bg: "bg-primary/10 dark:bg-primary/15",
  },
  {
    key: "totalFeedback" as const,
    label: "Total Feedback",
    icon: MessageSquare,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/40",
  },
  {
    key: "pendingFeedback" as const,
    label: "Pending Feedback",
    icon: Clock,
    color: "text-primary",
    bg: "bg-primary/10 dark:bg-primary/15",
  },
  {
    key: "resolvedFeedback" as const,
    label: "Resolved Feedback",
    icon: CheckCircle,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/40",
  },
];

function StatCardSkeleton() {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-12 w-12 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            fetchStats();
          }}
          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  const totalFeedbackForBar =
    stats?.feedbackByStatus
      ? stats.feedbackByStatus.new +
        stats.feedbackByStatus.reviewing +
        stats.feedbackByStatus.resolved +
        stats.feedbackByStatus.dismissed
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-body">Dashboard</h2>
        {!loading && (
          <button
            onClick={() => fetchStats()}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))
          : statCards.map((card) => (
              <Card key={card.key} className="rounded-xl shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {card.label}
                      </p>
                      <p className="text-3xl font-bold mt-1 font-body">
                        {stats?.[card.key] ?? 0}
                      </p>
                    </div>
                    <div
                      className={`h-12 w-12 rounded-lg ${card.bg} flex items-center justify-center`}
                    >
                      <card.icon className={`h-6 w-6 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-body">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ActivitySkeleton />
            ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="space-y-1">
                {stats.recentActivity.slice(0, 20).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-primary">
                        {(activity.userName || "?").charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">
                          {activity.userName}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          {activity.action}
                        </span>
                      </p>
                      {activity.details && (
                        <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                          {activity.details}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No recent activity
              </p>
            )}
          </CardContent>
        </Card>

        {/* Feedback Status Breakdown */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-body">
              Feedback Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-full rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  {
                    label: "New",
                    value: stats?.feedbackByStatus?.new ?? 0,
                    color: "bg-blue-500",
                  },
                  {
                    label: "Reviewing",
                    value: stats?.feedbackByStatus?.reviewing ?? 0,
                    color: "bg-amber-500",
                  },
                  {
                    label: "Resolved",
                    value: stats?.feedbackByStatus?.resolved ?? 0,
                    color: "bg-green-500",
                  },
                  {
                    label: "Dismissed",
                    value: stats?.feedbackByStatus?.dismissed ?? 0,
                    color: "bg-stone-400",
                  },
                ].map((item) => {
                  const pct =
                    totalFeedbackForBar > 0
                      ? Math.round((item.value / totalFeedbackForBar) * 100)
                      : 0;
                  return (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.label}
                        </span>
                        <span className="font-medium">
                          {item.value}{" "}
                          <span className="text-xs text-muted-foreground">
                            ({pct}%)
                          </span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${item.color} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
