import { AdminRfqModeration } from "@/components/admin/AdminRfqModeration";

export const dynamic = "force-dynamic";

export default function AdminRfqsPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">RFQ Moderation</h1>
      <AdminRfqModeration />
    </div>
  );
}
