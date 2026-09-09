import { redirect } from "next/navigation";
import { getServerAuthBootstrap } from "@/lib/auth/bootstrap-server-auth";

export default async function MembershipRedirect() {
  const auth = await getServerAuthBootstrap();
  if (!auth) redirect("/login?redirect=/pricing");

  if (["seller", "manufacturer", "distributor", "logistics", "both"].includes(auth.role)) {
    redirect("/seller/membership");
  }

  redirect("/pricing");
}
