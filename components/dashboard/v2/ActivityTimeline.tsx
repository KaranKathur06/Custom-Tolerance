"use client";

import {
  FileText,
  MessageSquare,
  ShieldCheck,
  Package,
  Award,
  Bell,
  Upload,
} from "lucide-react";

type TimelineEvent = {
  id: string;
  type: "rfq" | "quote" | "certification" | "order" | "badge" | "notification" | "upload";
  title: string;
  description?: string;
  timestamp: string;
};

type ActivityTimelineProps = {
  events?: TimelineEvent[];
  className?: string;
};

const DEMO_EVENTS: TimelineEvent[] = [
  { id: "1", type: "rfq", title: "Posted RFQ for CNC Aluminium Parts", timestamp: new Date().toISOString() },
  { id: "2", type: "quote", title: "Received quotation from Precision Forge", description: "₹12,400/unit — 4 day delivery", timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: "3", type: "certification", title: "ISO 9001 certificate verified", timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: "4", type: "order", title: "Order #1042 completed", description: "SS304 Sheet Metal — 500 units", timestamp: new Date(Date.now() - 86400000).toISOString() },
  { id: "5", type: "badge", title: "Earned 'Top Responder' badge", timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: "6", type: "upload", title: "Uploaded factory photos", description: "12 new images added to gallery", timestamp: new Date(Date.now() - 86400000 * 3).toISOString() },
];

const ICON_MAP: Record<string, { icon: React.ReactNode; bg: string }> = {
  rfq: { icon: <FileText className="h-4 w-4 text-blue-600" />, bg: "bg-blue-100" },
  quote: { icon: <MessageSquare className="h-4 w-4 text-violet-600" />, bg: "bg-violet-100" },
  certification: { icon: <ShieldCheck className="h-4 w-4 text-emerald-600" />, bg: "bg-emerald-100" },
  order: { icon: <Package className="h-4 w-4 text-ct-gold" />, bg: "bg-ct-gold/15" },
  badge: { icon: <Award className="h-4 w-4 text-amber-500" />, bg: "bg-amber-100" },
  notification: { icon: <Bell className="h-4 w-4 text-slate-500" />, bg: "bg-slate-100" },
  upload: { icon: <Upload className="h-4 w-4 text-indigo-500" />, bg: "bg-indigo-100" },
};

function groupByDay(events: TimelineEvent[]) {
  const groups: Record<string, TimelineEvent[]> = {};
  events.forEach((event) => {
    const d = new Date(event.timestamp);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
    );
    const label =
      diffDays === 0 ? "Today" : diffDays === 1 ? "Yesterday" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    if (!groups[label]) groups[label] = [];
    groups[label].push(event);
  });
  return groups;
}

export function ActivityTimeline({
  events = DEMO_EVENTS,
  className = "",
}: ActivityTimelineProps) {
  const grouped = groupByDay(events);

  return (
    <div className={`space-y-6 ${className}`}>
      {Object.entries(grouped).map(([dateLabel, items]) => (
        <div key={dateLabel}>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            {dateLabel}
          </h4>
          <div className="relative space-y-0">
            {/* Vertical line */}
            <div className="ct-timeline-line" />

            {items.map((event, i) => {
              const config = ICON_MAP[event.type] || ICON_MAP.notification;
              return (
                <div
                  key={event.id}
                  className="relative flex gap-4 pb-5 opacity-0 animate-ct-slide-in"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className={`ct-timeline-dot ${config.bg}`}>
                    {config.icon}
                  </div>
                  <div className="min-w-0 flex-1 pt-1.5">
                    <p className="text-sm font-semibold text-ct-navy">
                      {event.title}
                    </p>
                    {event.description && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        {event.description}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-slate-300">
                      {new Date(event.timestamp).toLocaleTimeString("en-IN", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
