"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationCenter() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=20");
      const json = await res.json();
      if (json.success) {
        setItems(json.data ?? []);
        setUnreadCount(json.meta?.unreadCount ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    void load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {unreadCount} unread
          </span>
        </div>
        {unreadCount > 0 ? (
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            Mark all read
          </Button>
        ) : null}
      </div>

      {!items.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No notifications</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={`rounded-lg border p-3 ${item.read_at ? "bg-white" : "border-blue-100 bg-blue-50/50"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{item.title}</p>
                  {item.body ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.body}</p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(item.created_at).toLocaleString("en-IN")}
                  </p>
                </div>
                <Badge variant="outline">{item.type}</Badge>
              </div>
              {item.href ? (
                <Link href={item.href} className="mt-2 inline-block text-xs text-blue-600 hover:underline">
                  Open →
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
