import { DashboardShell } from "@/components/dashboard/shell/DashboardShell";
import "../dashboard/dashboard.css";

export const dynamic = "force-dynamic";

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="buyer">{children}</DashboardShell>;
}
