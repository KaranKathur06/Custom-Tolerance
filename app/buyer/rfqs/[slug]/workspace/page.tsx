import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { RfqCollaborationWorkspace } from "@/components/irfq/workspace/RfqCollaborationWorkspace";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function RfqWorkspacePage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(`/buyer/rfqs/${slug}/workspace`)}`);

  const { data: rfq } = await supabase
    .from("rfqs")
    .select("id, title, slug, rfq_title, buyer_user_id, status")
    .eq("slug", slug)
    .maybeSingle();

  if (!rfq || rfq.buyer_user_id !== user.id) notFound();

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link
        href={`/rfq/${slug}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to RFQ
      </Link>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">
        Collaboration Workspace
      </h1>
      <p className="mb-6 text-sm text-slate-600">
        {rfq.rfq_title ?? rfq.title} · Internal comments and activity timeline
      </p>
      <RfqCollaborationWorkspace rfqId={rfq.id} />
    </div>
  );
}
