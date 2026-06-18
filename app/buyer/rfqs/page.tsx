import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import BuyerRfqsContent from "./BuyerRfqsContent";

export default function BuyerRfqsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
        </div>
      }
    >
      <BuyerRfqsContent />
    </Suspense>
  );
}
