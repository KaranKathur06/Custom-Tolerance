import { redirect } from "next/navigation";

export default function SellerStoreSettingsRedirect() {
  redirect("/settings?tab=profile");
}
