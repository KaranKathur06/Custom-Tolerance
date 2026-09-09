import { redirect } from "next/navigation";

export default function VerificationLegacyRedirect() {
  redirect("/ops/admin/verification");
}
