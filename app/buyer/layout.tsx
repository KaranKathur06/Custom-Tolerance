import { DashboardShell } from "@/components/dashboard/shell/DashboardShell";
import {
  buyerNavItems,
  buyerMobileNavItems,
} from "@/lib/dashboard/nav-config";
import "../dashboard/dashboard.css";

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      role="buyer"
      navItems={buyerNavItems}
      mobileNavItems={buyerMobileNavItems}
    >
      {children}
    </DashboardShell>
  );
}
