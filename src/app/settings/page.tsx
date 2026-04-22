"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Settings,
  User,
  Shield,
  MessageSquare,
  Lock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type FeedbackItem = {
  id: number;
  type: string;
  title: string;
  message: string;
  status: string;
  created_at?: string;
  createdAt?: string;
  admin_note?: string;
  adminNote?: string;
  user_name?: string;
  userName?: string;
};

export default function SettingsPage() {
  const { user, loading: authLoading, refresh } = useAuth();
  const { toast } = useToast();

  // Profile state
  const [name, setName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Security state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Feedback state
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [expandedFeedback, setExpandedFeedback] = useState<Set<number>>(
    new Set()
  );

  // Pre-fill name when user loads
  useEffect(() => {
    if (user) {
      setName(user.name || "");
    }
  }, [user]);

  // Fetch feedback on mount
  useEffect(() => {
    async function fetchFeedback() {
      try {
        const res = await fetch("/api/feedback");
        if (res.ok) {
          const data = await res.json();
          setFeedback(data.feedback || []);
        }
      } catch {
        // silently fail
      } finally {
        setFeedbackLoading(false);
      }
    }
    fetchFeedback();
  }, []);

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast({ title: "Error", description: "Name cannot be empty", variant: "destructive" });
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile");
      }
      toast({ title: "Success", description: "Profile updated successfully" });
      await refresh();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      toast({
        title: "Error",
        description: "Current password is required",
        variant: "destructive",
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "New password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update password");
      }
      toast({ title: "Success", description: "Password updated successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedFeedback((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "bug":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "suggestion":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "improvement":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      default:
        return "";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "reviewing":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
      case "resolved":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "dismissed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      default:
        return "";
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background font-body">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Settings</h1>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              My Feedback
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex justify-center">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-3xl font-bold shadow-lg">
                    {user?.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>

                {/* Email (read-only) */}
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
                    <Lock className="h-4 w-4" />
                    {user?.email || "—"}
                  </div>
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <Label>Role</Label>
                  <div>
                    <Badge
                      className={
                        user?.role === "admin"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                          : ""
                      }
                      variant={user?.role === "admin" ? "outline" : "secondary"}
                    >
                      {user?.role || "user"}
                    </Badge>
                  </div>
                </div>

                {/* Joined date */}
                {(user as any)?.created_at && (
                  <div className="space-y-2">
                    <Label>Joined</Label>
                    <p className="text-sm text-muted-foreground">
                      {formatDate((user as any).created_at)}
                    </p>
                  </div>
                )}

                {/* Save button */}
                <Button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {savingProfile ? "Saving..." : "Save Profile"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Password must be at least 6 characters long.
                </p>

                <Button
                  onClick={handleUpdatePassword}
                  disabled={savingPassword}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {savingPassword ? "Updating..." : "Update Password"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback">
            <Card>
              <CardHeader>
                <CardTitle>My Feedback</CardTitle>
                <CardDescription>
                  View feedback you have submitted
                </CardDescription>
              </CardHeader>
              <CardContent>
                {feedbackLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : feedback.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">
                      No feedback submitted yet
                    </p>
                    <p className="text-sm">
                      Your feedback submissions will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {feedback.map((f) => {
                      const createdAt = f.created_at || f.createdAt || "";
                      const adminNote = f.admin_note || f.adminNote || "";
                      const isExpanded = expandedFeedback.has(f.id);
                      const shouldTruncate = f.message.length > 150;

                      return (
                        <div
                          key={f.id}
                          className="border rounded-lg p-4 space-y-3"
                        >
                          {/* Top row: type + status badges */}
                          <div className="flex items-center justify-between">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(f.type)}`}
                            >
                              {f.type}
                            </span>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(f.status)}`}
                            >
                              {f.status}
                            </span>
                          </div>

                          {/* Title */}
                          <h4 className="font-semibold text-sm">
                            {f.title}
                          </h4>

                          {/* Message */}
                          <p className="text-sm text-muted-foreground">
                            {shouldTruncate && !isExpanded
                              ? f.message.slice(0, 150) + "..."
                              : f.message}
                          </p>
                          {shouldTruncate && (
                            <button
                              onClick={() => toggleExpand(f.id)}
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-3 w-3" /> Show less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3" /> Show more
                                </>
                              )}
                            </button>
                          )}

                          {/* Date */}
                          {createdAt && (
                            <p className="text-xs text-muted-foreground">
                              Submitted {formatDate(createdAt)}
                            </p>
                          )}

                          {/* Admin note */}
                          {adminNote && (
                            <div className="bg-primary/10 dark:bg-primary/15 border border-primary/30 rounded-md p-3 mt-2">
                              <p className="text-xs font-medium text-primary mb-1">
                                Admin Response
                              </p>
                              <p className="text-sm text-foreground">
                                {adminNote}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
