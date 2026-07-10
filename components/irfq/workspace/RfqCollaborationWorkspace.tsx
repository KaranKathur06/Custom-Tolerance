"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Comment = {
  id: string;
  parent_id: string | null;
  author_id: string;
  body: string;
  created_at: string;
};

type Activity = {
  id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type Props = {
  rfqId: string;
};

export function RfqCollaborationWorkspace({ rfqId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [tab, setTab] = useState<"comments" | "activity">("comments");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [commentsRes, activityRes] = await Promise.all([
        fetch(`/api/v2/rfqs/${rfqId}/comments`),
        fetch(`/api/v2/rfqs/${rfqId}/activity`),
      ]);
      const commentsJson = await commentsRes.json();
      const activityJson = await activityRes.json();
      if (commentsJson.success) setComments(commentsJson.data ?? []);
      if (activityJson.success) setActivity(activityJson.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [rfqId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handlePost() {
    if (!body.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/v2/rfqs/${rfqId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const json = await res.json();
      if (json.success) {
        setBody("");
        await refresh();
      }
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex border-b border-slate-100">
        {(["comments", "activity"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "px-4 py-3 text-sm font-medium capitalize",
              tab === key ? "border-b-2 border-blue-600 text-blue-700" : "text-slate-500",
            )}
          >
            {key}
          </button>
        ))}
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : null}

        {!loading && tab === "comments" ? (
          <div className="space-y-4">
            <div className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-sm text-slate-500">No comments yet. Start the internal review thread.</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <p className="text-slate-800">{comment.body}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(comment.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Add a comment for your procurement team…"
                className="min-h-[80px]"
              />
              <Button type="button" onClick={() => void handlePost()} disabled={posting || !body.trim()}>
                {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        ) : null}

        {!loading && tab === "activity" ? (
          <ul className="space-y-2">
            {activity.map((entry) => (
              <li key={entry.id} className="flex items-start justify-between gap-4 text-sm">
                <span className="font-medium text-slate-800">{entry.action.replace(/\./g, " · ")}</span>
                <span className="shrink-0 text-xs text-slate-400">
                  {new Date(entry.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
