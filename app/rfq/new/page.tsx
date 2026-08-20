import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { createSupabaseServerClient as createServerSupabaseClient } from "@/lib/supabase/server-client";
import { getServerUser } from "@/lib/supabase/server-client";
import { getBuyerEligibility, type BuyerEligibilityState } from "@/lib/services/rfq-service";
import { RfqWizard } from "@/components/marketplace/RfqWizard";
import { IrfqComposerShell } from "@/components/irfq/composer/IrfqComposerShell";

export const dynamic = "force-dynamic";

const IRFQ_V2_ENABLED = process.env.NEXT_PUBLIC_IRFQ_V2 === "true";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewRfqPage({ searchParams }: Props) {
  const params = await searchParams;
  const supplier =
    typeof params.supplier === "string" && params.supplier ? params.supplier : null;
  const draftId =
    typeof params.draft === "string" && params.draft ? params.draft : null;

  const Composer = IRFQ_V2_ENABLED ? IrfqComposerShell : RfqWizard;

  const authUser = await getServerUser();
  let initialVerificationState: BuyerEligibilityState = { status: "verified" } as BuyerEligibilityState;

  if (authUser?.id) {
    const supabase = createServerSupabaseClient();

    if (supabase == null) {
      initialVerificationState = { status: "verified" } as BuyerVerificationState;
    } else {
      const { data: buyerPreferences } = await supabase
        .from("buyer_preferences")
        .select("email_verified, mobile_verified, completion_percent")
        .maybeSingle();
      const { data: buyerProfile } = await supabase
        .from("buyer_profiles")
        .select("profile_completion_percent")
        .eq("profile_id", authUser.id)
        .maybeSingle();

      initialVerificationState = getBuyerEligibility({
        emailVerified: Boolean(buyerPreferences?.email_verified ?? authUser.email_confirmed_at),
        mobileVerified: Boolean(buyerPreferences?.mobile_verified),
        profileCompletionPercent: buyerPreferences?.completion_percent ?? buyerProfile?.profile_completion_percent ?? 0,
      });
    }
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <Composer supplierSlug={supplier} draftId={draftId} initialVerificationState={initialVerificationState} />
    </Suspense>
  );
}
