"use client";

import {
  getMobileNavItemsForRole,
  getNavItemsForRole,
} from "@/lib/dashboard/nav-config";
import { DashboardSidebar } from "./DashboardSidebar";

type DashboardShellProps = {
  children: React.ReactNode;
  role: "buyer" | "seller";
};

export function DashboardShell({ children, role }: DashboardShellProps) {
  const navItems = getNavItemsForRole(role);
  const mobileNavItems = getMobileNavItemsForRole(role);

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
