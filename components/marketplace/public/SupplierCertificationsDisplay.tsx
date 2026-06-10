import { Award, BadgeCheck, Download, FileWarning } from "lucide-react";
import type { SupplierCertificationDetail } from "@/lib/marketplace/supplier-profile-extended";

type SupplierCertificationsDisplayProps = {
  certifications: SupplierCertificationDetail[];
};

function formatExpiry(expiresAt: string | null): { label: string; isExpired: boolean; isExpiringSoon: boolean } {
  if (!expiresAt) {
    return { label: "No expiry", isExpired: false, isExpiringSoon: false };
  }

  const expiry = new Date(expiresAt);
  const now = new Date();
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return { label: `Expired ${expiry.toLocaleDateString("en-IN")}`, isExpired: true, isExpiringSoon: false };
  }
  if (daysLeft <= 90) {
    return { label: `Expires ${expiry.toLocaleDateString("en-IN")} (${daysLeft}d)`, isExpired: false, isExpiringSoon: true };
  }
  return { label: `Valid until ${expiry.toLocaleDateString("en-IN")}`, isExpired: false, isExpiringSoon: false };
}

function isVerified(cert: SupplierCertificationDetail): boolean {
  return cert.verification_status === "active" && Boolean(cert.verified_at);
}

export function SupplierCertificationsDisplay({
  certifications,
}: SupplierCertificationsDisplayProps) {
  if (!certifications.length) {
    return (
      <p className="text-sm text-slate-500">
        Certification details will be updated soon.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {certifications.map((cert) => {
        const expiry = formatExpiry(cert.expires_at);
        const verified = isVerified(cert);

        return (
          <div
            key={cert.id}
            className={`rounded-xl border p-4 ${
              expiry.isExpired
                ? "border-red-200 bg-red-50/50"
                : expiry.isExpiringSoon
                  ? "border-amber-200 bg-amber-50/50"
                  : "border-slate-200 bg-slate-50/50"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                  <Award className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{cert.name}</h3>
                  {cert.certificate_number ? (
                    <p className="mt-0.5 text-xs text-slate-500">
                      #{cert.certificate_number}
                    </p>
                  ) : null}
                </div>
              </div>
              {verified ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Verified
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  Pending
                </span>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
              {expiry.isExpired ? (
                <FileWarning className="h-3.5 w-3.5 text-red-500" />
              ) : null}
              <span className={expiry.isExpired ? "text-red-600" : expiry.isExpiringSoon ? "text-amber-700" : ""}>
                {expiry.label}
              </span>
            </div>

            {cert.document_url ? (
              <a
                href={cert.document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                <Download className="h-4 w-4" />
                Download certificate
              </a>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
