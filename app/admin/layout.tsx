import { AdminOtpBypassBanner } from "@/components/admin/AdminOtpBypassBanner";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminOtpBypassBanner />
      {children}
    </>
  );
}
