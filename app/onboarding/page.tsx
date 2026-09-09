import { redirect } from "next/navigation";
import { getServerAuthBootstrap } from "@/lib/auth/bootstrap-server-auth";

export default async function OnboardingResolverPage() {
  const auth = await getServerAuthBootstrap();

  if (!auth) {
    redirect("/login?redirect=/onboarding");
  }

  if (["seller", "manufacturer", "distributor", "logistics"].includes(auth.role)) {
    redirect("/onboarding/seller");
  }

  redirect("/onboarding/buyer");
}
