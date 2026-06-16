import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import ProfilePageContent from "./ProfilePageContent";

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}
