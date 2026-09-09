import { redirect } from "next/navigation";
import { getServerAuthBootstrap } from "@/lib/auth/bootstrap-server-auth";

export default async function DashboardResolverPage() {
  const auth = await getServerAuthBootstrap();

  if (!auth) {
    redirect("/login?redirect=/dashboard");
  }

  switch (auth.role) {
    case "admin":
    case "super_admin":
      redirect("/admin");
    case "moderator":
    case "support_agent":
    case "supplier_success":
      redirect("/ops");
    case "seller":
    case "manufacturer":
    case "distributor":
    case "logistics":
      redirect("/seller");
    case "buyer":
    case "both":
    default:
      redirect("/buyer");
  }
}
