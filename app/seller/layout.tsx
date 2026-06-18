import { DashboardShell } from "@/components/dashboard/shell/DashboardShell";
import {
  sellerNavItems,
  sellerMobileNavItems,
} from "@/lib/dashboard/nav-config";
import "../dashboard/dashboard.css";

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      role="seller"
      navItems={sellerNavItems}
      mobileNavItems={sellerMobileNavItems}
    >
      {children}
    </DashboardShell>
  );
}
