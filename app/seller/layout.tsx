import { DashboardShell } from "@/components/dashboard/shell/DashboardShell";
import "../dashboard/dashboard.css";

export const dynamic = "force-dynamic";

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="seller">{children}</DashboardShell>;
}
