import type { DashboardNavItem } from "@/lib/dashboard/nav-config";
import { DashboardSidebar } from "./DashboardSidebar";

type DashboardShellProps = {
  children: React.ReactNode;
  role: "buyer" | "seller";
  navItems: DashboardNavItem[];
  mobileNavItems?: DashboardNavItem[];
};

export function DashboardShell({
  children,
  role,
  navItems,
  mobileNavItems,
}: DashboardShellProps) {
  return (
    <div className="ct-dash-shell">
      <DashboardSidebar
        items={navItems}
        mobileItems={mobileNavItems}
        roleLabel={role === "buyer" ? "Buyer Portal" : "Seller Portal"}
      />
      <div className="ct-dash-main">
        <div className="ct-dash-content">{children}</div>
      </div>
    </div>
  );
}
