"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Loader2,
  Send,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FeedbackItem {
  id: string;
  type: "bug" | "suggestion" | "improvement";
  title: string;
  message: string;
  status: "new" | "reviewing" | "resolved" | "dismissed";
  userName: string;
  userEmail: string;
  createdAt: string;
  adminNote?: string;
}

type FilterStatus = "all" | "new" | "reviewing" | "resolved" | "dismissed";

const statusOptions: { value: FeedbackItem["status"]; label: string }[] = [
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
];

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function FeedbackCard({
  item,
  onUpdate,
}: {
  item: FeedbackItem;
  onUpdate: (id: string, updates: Partial<FeedbackItem>) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [noteInput, setNoteInput] = useState(item.adminNote || "");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [updating, setUpdating] = useState(false);
  const isLongMessage = item.message.length > 200;

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    await onUpdate(item.id, { status: newStatus as FeedbackItem["status"] });
    setUpdating(false);
  };

  const handleSubmitNote = async () => {
    if (!noteInput.trim()) return;
    setUpdating(true);
    await onUpdate(item.id, { adminNote: noteInput.trim() });
    setShowNoteInput(false);
    setUpdating(false);
  };

  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="p-5">
        <div className="flex flex-col gap-3">
          {/* Header row */}
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
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDate(item.createdAt)}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-base">{item.title}</h3>

          {/* Message */}
          <div className="text-sm text-muted-foreground">
            {isLongMessage && !expanded ? (
              <>
                <p>{item.message.slice(0, 200)}...</p>
                <button
                  onClick={() => setExpanded(true)}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-1"
                >
                  <ChevronDown className="h-3 w-3" />
                  Show more
                </button>
              </>
            ) : (
              <>
                <p className="whitespace-pre-wrap">{item.message}</p>
                {isLongMessage && (
                  <button
                    onClick={() => setExpanded(false)}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-1"
                  >
                    <ChevronUp className="h-3 w-3" />
                    Show less
                  </button>
                )}
              </>
            )}
          </div>

          {/* Submitted by */}
          <p className="text-xs text-muted-foreground">
            Submitted by{" "}
            <span className="font-medium text-foreground">
              {item.userName}
            </span>{" "}
            ({item.userEmail})
          </p>

          {/* Admin note display */}
          {item.adminNote && !showNoteInput && (
            <div className="rounded-lg bg-primary/10 dark:bg-primary/15 border border-primary/30 p-3">
              <p className="text-xs font-medium text-primary mb-1">
                Admin Note
              </p>
              <p className="text-sm text-foreground">
                {item.adminNote}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Status:</span>
              <Select
                value={item.status}
                onValueChange={handleStatusChange}
                disabled={updating}
              >
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setShowNoteInput(!showNoteInput)}
            >
              {showNoteInput ? "Cancel" : item.adminNote ? "Edit Note" : "Add Note"}
            </Button>
            {updating && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Note input */}
          {showNoteInput && (
            <div className="flex gap-2">
              <Textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Write an admin note..."
                className="min-h-[80px] text-sm"
              />
              <Button
                size="icon"
                className="shrink-0 h-10 w-10 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={handleSubmitNote}
                disabled={updating || !noteInput.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FeedbackSkeleton() {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-40" />
      </CardContent>
    </Card>
  );
}

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("all");

  const fetchFeedback = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/feedback");
      if (!res.ok) throw new Error("Failed to fetch feedback");
      const data = await res.json();
      const items = (data.feedback || data).map((f: any) => ({
        id: String(f.id),
        type: f.type,
        title: f.title,
        message: f.message,
        status: f.status,
        userName: f.user_name || f.userName || 'Unknown',
        userEmail: f.user_email || f.userEmail || '',
        createdAt: f.created_at || f.createdAt || '',
        adminNote: f.admin_note || f.adminNote || '',
      }));
      setFeedback(items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleUpdate = async (
    id: string,
    updates: Partial<FeedbackItem>
  ) => {
    try {
      const res = await fetch("/api/admin/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: Number(id),
          status: updates.status,
          admin_note: updates.adminNote
        }),
      });
      if (!res.ok) throw new Error("Failed to update feedback");
      const data = await res.json();
      const f = data.feedback || data;
      const mapped: Partial<FeedbackItem> = f.id ? {
        id: String(f.id),
        type: f.type,
        title: f.title,
        message: f.message,
        status: f.status,
        userName: f.user_name || f.userName,
        userEmail: f.user_email || f.userEmail,
        createdAt: f.created_at || f.createdAt,
        adminNote: f.admin_note || f.adminNote || '',
      } : {};
      setFeedback((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, ...updates, ...mapped } : item
        )
      );
    } catch (err) {
      console.error("Failed to update feedback:", err);
    }
  };

  const counts = useMemo(() => {
    const c = { all: 0, new: 0, reviewing: 0, resolved: 0, dismissed: 0 };
    feedback.forEach((item) => {
      c.all++;
      c[item.status]++;
    });
    return c;
  }, [feedback]);

  const filtered = useMemo(() => {
    if (activeFilter === "all") return feedback;
    return feedback.filter((item) => item.status === activeFilter);
  }, [feedback, activeFilter]);

  const filterTabs: { value: FilterStatus; label: string }[] = [
    { value: "all", label: "All" },
    { value: "new", label: "New" },
    { value: "reviewing", label: "Reviewing" },
    { value: "resolved", label: "Resolved" },
    { value: "dismissed", label: "Dismissed" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold font-body">Feedback</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true);
            fetchFeedback();
          }}
          className="w-fit"
        >
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Filter Tabs */}
      <Tabs
        value={activeFilter}
        onValueChange={(v) => setActiveFilter(v as FilterStatus)}
      >
        <TabsList className="flex-wrap h-auto gap-1">
          {filterTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {tab.label}
              <Badge
                variant="secondary"
                className="h-5 min-w-[20px] px-1.5 text-[10px] leading-none"
              >
                {counts[tab.value]}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <FeedbackSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              fetchFeedback();
            }}
            className="flex items-center gap-2 text-sm text-primary hover:text-primary/80"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <MessageSquare className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            {activeFilter === "all"
              ? "No feedback received yet"
              : `No ${activeFilter} feedback`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <FeedbackCard key={item.id} item={item} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}
