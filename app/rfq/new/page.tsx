import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { RfqWizard } from "@/components/marketplace/RfqWizard";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewRfqPage({ searchParams }: Props) {
  const params = await searchParams;
  const supplier =
    typeof params.supplier === "string" && params.supplier ? params.supplier : null;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <RfqWizard supplierSlug={supplier} />
    </Suspense>
  );
}
