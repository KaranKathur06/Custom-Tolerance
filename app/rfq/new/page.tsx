import { Suspense } from "react";
import { Loader2 } from "lucide-react";
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

  const Composer = IRFQ_V2_ENABLED ? IrfqComposerShell : RfqWizard;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <Composer supplierSlug={supplier} />
    </Suspense>
  );
}
