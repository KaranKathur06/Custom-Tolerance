"use client";

import { useEffect, useState } from "react";
import { GroupedNotifications } from "@/components/dashboard/v2/GroupedNotifications";
import { ProfileCompletionWidget } from "@/components/dashboard/ProfileCompletionWidget";

export default function BuyerNotificationsPage() {
  const [profileCompletion, setProfileCompletion] = useState(0);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/dashboard/buyer/stats");
        const json = await res.json();
        if (json.success) setProfileCompletion(json.data.profileCompletion ?? 0);
      } catch {
        // silent
      }
    })();
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="ct-section-title text-3xl">Notifications</h1>
        <p className="mt-1 text-sm text-slate-500">
          RFQ updates, quote alerts, and procurement activity
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="ct-card p-6">
          <GroupedNotifications />
        </div>
        <ProfileCompletionWidget role="buyer" percent={profileCompletion} />
      </div>
    </div>
  );
}
