"use client";

import { ActiveOrders } from "@/components/dashboard/v2/ActiveOrders";

export default function SellerOrdersPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="ct-section-title text-3xl">Orders</h1>
        <p className="mt-1 text-sm text-slate-500">
          Track production stages and delivery timelines
        </p>
      </div>
      <ActiveOrders />
    </div>
  );
}
