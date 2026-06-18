import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  Users,
  MessageSquare,
  Bell,
  BarChart3,
  Settings,
  User,
  Package,
  Search,
  Crown,
  Building2,
} from "lucide-react";

export type DashboardNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
};

export const buyerNavItems: DashboardNavItem[] = [
  { label: "Dashboard", href: "/buyer", icon: LayoutDashboard, exact: true },
  { label: "RFQs", href: "/buyer/rfqs", icon: ClipboardList },
  { label: "Quotes", href: "/buyer/quotes", icon: FileText },
  { label: "Suppliers", href: "/buyer/suppliers", icon: Users },
  { label: "Messages", href: "/buyer/messages", icon: MessageSquare },
  { label: "Notifications", href: "/buyer/notifications", icon: Bell },
  { label: "Market Intelligence", href: "/market", icon: BarChart3 },
  { label: "Profile", href: "/settings/profile", icon: User },
  { label: "Settings", href: "/settings", icon: Settings },
];

export const sellerNavItems: DashboardNavItem[] = [
  { label: "Dashboard", href: "/seller", icon: LayoutDashboard, exact: true },
  { label: "Browse RFQs", href: "/seller/rfqs", icon: Search },
  { label: "Quotes", href: "/seller/quotes", icon: FileText },
  { label: "Orders", href: "/seller/orders", icon: Package },
  { label: "Messages", href: "/seller/messages", icon: MessageSquare },
  { label: "Buyer Directory", href: "/seller/buyers", icon: Building2 },
  { label: "Analytics", href: "/seller/analytics", icon: BarChart3 },
  { label: "Membership", href: "/seller/membership", icon: Crown },
  { label: "Profile", href: "/settings/profile", icon: User },
  { label: "Settings", href: "/settings", icon: Settings },
];

export const buyerMobileNavItems = buyerNavItems.slice(0, 5);
export const sellerMobileNavItems = sellerNavItems.slice(0, 5);
