"use client";

import { GroupedNotifications } from "@/components/dashboard/v2/GroupedNotifications";
import { SubscriptionCenter } from "@/components/dashboard/SubscriptionCenter";
import { useAuth } from "@/components/auth/AuthProvider";

export default function SellerNotificationsPage() {
  const { sellerProfile } = useAuth();

  return (
    <div>
      <div className="mb-6">
        <h1 className="ct-section-title text-3xl">Notifications</h1>
        <p className="mt-1 text-sm text-slate-500">
          RFQ alerts, quote updates, and business activity
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="ct-card p-6">
          <GroupedNotifications />
        </div>
        <SubscriptionCenter trustLevel={sellerProfile?.trust_level ?? 0} />
      </div>
    </div>
  );
}
