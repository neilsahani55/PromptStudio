"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Gauge,
  Bot,
  Wrench,
  Megaphone,
  Save,
  Info,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});

  // Rate limiting
  const [maxRequests, setMaxRequests] = useState("20");
  const [windowMinutes, setWindowMinutes] = useState("60");

  // Security
  const [minPasswordLength, setMinPasswordLength] = useState("8");
  const [allowRegistration, setAllowRegistration] = useState(true);

  // AI Models
  const [defaultModel, setDefaultModel] = useState("googleai/gemini-2.5-flash");

  // Maintenance
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");

  // Announcement
  const [announcementActive, setAnnouncementActive] = useState(false);
  const [announcementType, setAnnouncementType] = useState("info");
  const [announcementText, setAnnouncementText] = useState("");

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      const data = await res.json();
      const s = data.settings || {};
      setSettings(s);

      setMaxRequests(s.rate_limit_max || "20");
      setWindowMinutes(s.rate_limit_window_minutes || "60");
      setMinPasswordLength(s.min_password_length || "6");
      setAllowRegistration(s.allow_registration !== "false");
      setDefaultModel(s.default_model || "googleai/gemini-2.5-flash");
      setMaintenanceEnabled(s.maintenance_mode === "true");
      setMaintenanceMessage(s.maintenance_message || "");
      setAnnouncementActive(s.announcement_active === "true");
      setAnnouncementType(s.announcement_type || "info");
      setAnnouncementText(s.announcement_text || "");
    } catch {
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSection = async (
    sectionName: string,
    settingsToSave: Record<string, string>
  ) => {
    setSaving(sectionName);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: settingsToSave }),
      });

      if (!res.ok) throw new Error("Failed to save");

      const data = await res.json();
      setSettings(data.settings || {});

      toast({
        title: "Saved",
        description: `${sectionName} settings updated successfully.`,
      });
    } catch {
      toast({
        title: "Error",
        description: `Failed to save ${sectionName.toLowerCase()} settings.`,
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-body">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage application configuration
          </p>
        </div>
        <div className="grid gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const previewStyles: Record<string, string> = {
    info: "bg-blue-600/90 text-blue-50 border-blue-500",
    warning: "bg-amber-600/90 text-amber-50 border-amber-500",
    success: "bg-green-600/90 text-green-50 border-green-500",
  };

  const previewIcons: Record<string, typeof Info> = {
    info: Info,
    warning: AlertTriangle,
    success: CheckCircle,
  };

  const PreviewIcon = previewIcons[announcementType] || Info;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-body">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage application configuration
        </p>
      </div>

      <div className="grid gap-6">
        {/* Section 1: Rate Limiting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-body">
              <Gauge className="h-5 w-5 text-primary" />
              Rate Limiting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxRequests">Max requests per window</Label>
                <Input
                  id="maxRequests"
                  type="number"
                  min="1"
                  value={maxRequests}
                  onChange={(e) => setMaxRequests(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="windowMinutes">Window duration (minutes)</Label>
                <Input
                  id="windowMinutes"
                  type="number"
                  min="1"
                  value={windowMinutes}
                  onChange={(e) => setWindowMinutes(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={() =>
                saveSection("Rate Limiting", {
                  rate_limit_max: maxRequests,
                  rate_limit_window_minutes: windowMinutes,
                })
              }
              disabled={saving === "Rate Limiting"}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving === "Rate Limiting" ? "Saving..." : "Save"}
            </Button>
          </CardContent>
        </Card>

        {/* Section 2: Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-body">
              <Shield className="h-5 w-5 text-primary" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="minPasswordLength">
                Minimum password length
              </Label>
              <Input
                id="minPasswordLength"
                type="number"
                min="4"
                max="128"
                value={minPasswordLength}
                onChange={(e) => setMinPasswordLength(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <div className="flex items-center justify-between max-w-xs">
              <Label htmlFor="allowRegistration">Allow registration</Label>
              <Switch
                id="allowRegistration"
                checked={allowRegistration}
                onCheckedChange={setAllowRegistration}
              />
            </div>
            <Button
              onClick={() =>
                saveSection("Security", {
                  min_password_length: minPasswordLength,
                  allow_registration: String(allowRegistration),
                })
              }
              disabled={saving === "Security"}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving === "Security" ? "Saving..." : "Save"}
            </Button>
          </CardContent>
        </Card>

        {/* Section 3: AI Models */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-body">
              <Bot className="h-5 w-5 text-primary" />
              AI Models
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default model</Label>
              <Select value={defaultModel} onValueChange={setDefaultModel}>
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="googleai/gemini-2.5-flash">
                    googleai/gemini-2.5-flash
                  </SelectItem>
                  <SelectItem value="openai/deepseek-ai/deepseek-v3.2">
                    openai/deepseek-ai/deepseek-v3.2
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() =>
                saveSection("AI Models", { default_model: defaultModel })
              }
              disabled={saving === "AI Models"}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving === "AI Models" ? "Saving..." : "Save"}
            </Button>
          </CardContent>
        </Card>

        {/* Section 4: Maintenance Mode */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-body">
              <Wrench className="h-5 w-5 text-primary" />
              Maintenance Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between max-w-xs">
              <Label htmlFor="maintenanceEnabled">Enable maintenance</Label>
              <Switch
                id="maintenanceEnabled"
                checked={maintenanceEnabled}
                onCheckedChange={setMaintenanceEnabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maintenanceMessage">Maintenance message</Label>
              <Textarea
                id="maintenanceMessage"
                placeholder="We're currently performing maintenance. Please check back later."
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                rows={3}
              />
            </div>
            <Button
              onClick={() =>
                saveSection("Maintenance", {
                  maintenance_mode: String(maintenanceEnabled),
                  maintenance_message: maintenanceMessage,
                })
              }
              disabled={saving === "Maintenance"}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving === "Maintenance" ? "Saving..." : "Save"}
            </Button>
          </CardContent>
        </Card>

        {/* Section 5: Announcement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-body">
              <Megaphone className="h-5 w-5 text-primary" />
              Announcement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between max-w-xs">
              <Label htmlFor="announcementActive">Enable announcement</Label>
              <Switch
                id="announcementActive"
                checked={announcementActive}
                onCheckedChange={setAnnouncementActive}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={announcementType}
                onValueChange={setAnnouncementType}
              >
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="announcementText">Announcement text</Label>
              <Textarea
                id="announcementText"
                placeholder="Enter your announcement message..."
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                rows={3}
              />
            </div>

            {/* Preview */}
            {announcementText && (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wide">
                  Preview
                </Label>
                <div
                  className={`rounded-lg border px-4 py-2.5 ${
                    previewStyles[announcementType] || previewStyles.info
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <PreviewIcon className="h-4 w-4 shrink-0" />
                    <p className="text-sm font-medium">{announcementText}</p>
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={() =>
                saveSection("Announcement", {
                  announcement_active: String(announcementActive),
                  announcement_type: announcementType,
                  announcement_text: announcementText,
                })
              }
              disabled={saving === "Announcement"}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving === "Announcement" ? "Saving..." : "Save"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
