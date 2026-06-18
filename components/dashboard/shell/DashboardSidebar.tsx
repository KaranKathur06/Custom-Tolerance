"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, Menu, X } from "lucide-react";
import type { DashboardNavItem } from "@/lib/dashboard/nav-config";

type DashboardSidebarProps = {
  items: DashboardNavItem[];
  roleLabel: string;
  mobileItems?: DashboardNavItem[];
};

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebar({ items, roleLabel, mobileItems }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = items;
  const bottomNavItems = mobileItems ?? items.slice(0, 5);

  return (
    <>
      {/* Mobile toggle */}
      <button
        type="button"
        className="ct-dash-mobile-toggle fixed left-4 top-[4.5rem] z-30 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="h-4 w-4 text-slate-600" />
      </button>

      {/* Overlay */}
      <div
        className={`ct-dash-sidebar-overlay ${mobileOpen ? "visible" : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={`ct-dash-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "open" : ""}`}
      >
        {!collapsed && (
          <div className="border-b border-slate-100 px-4 py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {roleLabel}
            </p>
          </div>
        )}

        <nav className="ct-dash-sidebar-nav">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`ct-dash-nav-item ${active ? "active" : ""}`}
                title={collapsed ? item.label : undefined}
                onClick={() => setMobileOpen(false)}
              >
                <Icon className="ct-dash-nav-icon" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="ct-dash-sidebar-footer hidden lg:block">
          <button
            type="button"
            className="ct-dash-collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>

        {/* Mobile close */}
        {mobileOpen && (
          <button
            type="button"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </aside>

      {/* Mobile bottom nav */}
      <nav className="ct-dash-mobile-nav lg:hidden" aria-label="Mobile navigation">
        {bottomNavItems.map((item) => {
          const active = isActive(pathname, item.href, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`ct-dash-mobile-nav-item ${active ? "active" : ""}`}
            >
              <Icon />
              <span>{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
