import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">404</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Page not found</h1>
        <p className="mt-3 text-sm text-slate-600">
          This link may be outdated, or the requested resource is no longer available.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/marketplace"><Button>Browse marketplace</Button></Link>
          <Link href="/"><Button variant="outline">Go home</Button></Link>
        </div>
      </div>
    </div>
  );
}
