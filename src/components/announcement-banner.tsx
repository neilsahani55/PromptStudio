"use client";

import { useState, useEffect } from "react";
import { Info, AlertTriangle, CheckCircle, X } from "lucide-react";

function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return String(hash);
}

type AnnouncementType = "info" | "warning" | "success";

const typeStyles: Record<AnnouncementType, string> = {
  info: "bg-blue-600/90 text-blue-50 border-blue-500",
  warning: "bg-amber-600/90 text-amber-50 border-amber-500",
  success: "bg-green-600/90 text-green-50 border-green-500",
};

const typeIcons: Record<AnnouncementType, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
};

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<{
    active: boolean;
    text: string;
    type: AnnouncementType;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/announcement")
      .then((res) => res.json())
      .then((data) => {
        if (data.active && data.text) {
          setAnnouncement(data);
          // Check if this exact announcement was dismissed
          const storedHash = localStorage.getItem("dismissed_announcement");
          if (storedHash === hashText(data.text)) {
            setDismissed(true);
          }
        }
      })
      .catch(() => {
        // Silently fail
      });
  }, []);

  if (!announcement || !announcement.active || !announcement.text || dismissed) {
    return null;
  }

  const announcementType = (["info", "warning", "success"].includes(announcement.type)
    ? announcement.type
    : "info") as AnnouncementType;
  const Icon = typeIcons[announcementType];
  const style = typeStyles[announcementType];

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("dismissed_announcement", hashText(announcement.text));
  };

  return (
    <div className={`w-full border-b px-4 py-2.5 ${style}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon className="h-4 w-4 shrink-0" />
          <p className="text-sm font-medium truncate">{announcement.text}</p>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-md p-1 hover:bg-white/20 transition-colors"
          aria-label="Dismiss announcement"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
