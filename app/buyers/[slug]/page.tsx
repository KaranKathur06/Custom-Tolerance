import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BuyerPublicProfileView } from "@/components/marketplace/public/BuyerPublicProfile";
import { loadBuyerPublicProfile } from "@/lib/marketplace/buyer-public-profile";
import { buildSeoMetadata } from "@/lib/marketplace/seo";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createSupabaseServerClient();
  if (!supabase) return { title: "Buyer | CustomTolerance" };

  const buyer = await loadBuyerPublicProfile(supabase, slug);
  if (!buyer || buyer.isUnavailable) return { title: "Profile Unavailable | CustomTolerance" };

  const location = [buyer.city, buyer.state, buyer.country].filter(Boolean).join(", ");

  return buildSeoMetadata({
    title: `${buyer.companyName ?? buyer.displayName} | Buyer Profile | CustomTolerance`,
    description:
      buyer.shortDescription ??
      `${buyer.companyName ?? buyer.displayName} — B2B buyer on CustomTolerance. ${location}. View procurement interests and requirements.`,
    canonicalPath: `/buyers/${buyer.slug}`,
    imageUrl: buyer.logoUrl,
  });
}

export default async function BuyerProfilePage({ params }: Props) {
  const { slug } = await params;
  const supabase = createSupabaseServerClient();
  if (!supabase) notFound();

  const buyer = await loadBuyerPublicProfile(supabase, slug);
  if (!buyer) notFound();

  return <BuyerPublicProfileView buyer={buyer} />;
}
