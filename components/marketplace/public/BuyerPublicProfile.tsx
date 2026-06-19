import { Building2, MapPin, ShieldCheck } from "lucide-react";
import type { BuyerPublicProfile } from "@/lib/marketplace/buyer-public-profile";

export function BuyerPublicProfileView({ buyer }: { buyer: BuyerPublicProfile }) {
  if (buyer.isUnavailable) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Profile unavailable</h1>
        <p className="mt-2 text-sm text-slate-600">
          This buyer profile is not publicly available at the moment.
        </p>
      </div>
    );
  }

  const location = [buyer.city, buyer.state, buyer.country].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100">
              {buyer.logoUrl ? (
                <img src={buyer.logoUrl} alt="" className="h-full w-full rounded-xl object-cover" />
              ) : (
                <Building2 className="h-8 w-8 text-slate-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-bold text-slate-950">{buyer.companyName ?? buyer.displayName}</h1>
              {buyer.buyerType ? (
                <p className="mt-1 text-sm font-medium text-blue-700">{buyer.buyerType}</p>
              ) : null}
              {location ? (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
                  <MapPin className="h-4 w-4" />
                  {location}
                </p>
              ) : null}
              {buyer.verificationStatus === "verified" ? (
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verified buyer
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 space-y-6">
            {buyer.shortDescription ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">About</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">{buyer.shortDescription}</p>
              </div>
            ) : null}

            {buyer.industries.length > 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Industries</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {buyer.industries.map((industry) => (
                    <span key={industry} className="rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {industry}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <aside className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-950">Procurement interests</h2>
              {buyer.procurementCategories.length > 0 ? (
                <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                  {buyer.procurementCategories.map((cat) => (
                    <li key={cat}>{cat}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Not specified</p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-950">Contact</h2>
              <p className="mt-2 text-sm text-slate-500">
                Contact details are protected. Send an inquiry through CustomTolerance to connect.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
