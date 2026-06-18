"use client";

import { MessageInbox } from "@/components/marketplace/MessageInbox";

export default function BuyerMessagesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="ct-section-title text-3xl">Messages</h1>
        <p className="mt-1 text-sm text-slate-500">
          Procurement conversations with suppliers
        </p>
      </div>
      <div className="ct-card p-6">
        <MessageInbox />
      </div>
    </div>
  );
}
