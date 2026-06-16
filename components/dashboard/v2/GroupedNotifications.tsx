"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  MessageSquare,
  FileText,
  ShieldCheck,
  Package,
  Bell,
  Clock,
} from "lucide-react";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  action_url?: string | null;
};

type GroupedNotificationsProps = {
  className?: string;
};

const ICON_MAP: Record<string, React.ReactNode> = {
  quote: <MessageSquare className="h-4 w-4 text-blue-500" />,
  rfq: <FileText className="h-4 w-4 text-violet-500" />,
  verification: <ShieldCheck className="h-4 w-4 text-emerald-500" />,
  order: <Package className="h-4 w-4 text-ct-gold" />,
  system: <Bell className="h-4 w-4 text-slate-400" />,
};

function getRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function groupByDate(notifications: Notification[]) {
  const groups: Record<string, Notification[]> = {};
  notifications.forEach((n) => {
    const label = getRelativeDate(n.created_at);
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  });
  return groups;
}

export function GroupedNotifications({ className = "" }: GroupedNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/notifications");
        const json = await res.json();
        if (json.success) setNotifications(json.data ?? []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
      </div>
    );
  }

  if (!notifications.length) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <Bell className="mb-3 h-8 w-8 text-slate-200" />
        <p className="text-sm text-slate-500">All caught up!</p>
        <p className="text-xs text-slate-400">No new notifications</p>
      </div>
    );
  }

  const grouped = groupByDate(notifications);

  return (
    <div className={`space-y-6 ${className}`}>
      {Object.entries(grouped).map(([dateLabel, items]) => (
        <div key={dateLabel}>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            {dateLabel}
          </h4>
          <div className="space-y-1">
            {items.map((n) => (
              <a
                key={n.id}
                href={n.action_url || "#"}
                className={`ct-notification-item ${!n.read ? "unread" : ""}`}
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  {ICON_MAP[n.type] || ICON_MAP.system}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${!n.read ? "font-semibold text-ct-navy" : "text-slate-700"}`}>
                    {n.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">
                    {n.message}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] text-slate-400">
                  <Clock className="mr-0.5 inline h-3 w-3" />
                  {new Date(n.created_at).toLocaleTimeString("en-IN", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
