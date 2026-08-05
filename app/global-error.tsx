'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('global error boundary', error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-16">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Something went wrong</h2>
            <p className="mt-2 text-sm text-slate-600">
              The portal hit an unexpected error. Please retry or return home.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={() => reset()} variant="outline" className="gap-2">
                <RotateCw className="h-4 w-4" /> Retry
              </Button>
              <Link href="/">
                <Button>Back home</Button>
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
