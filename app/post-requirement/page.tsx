import { redirect } from "next/navigation";

const IRFQ_V2_ENABLED = process.env.NEXT_PUBLIC_IRFQ_V2 === "true";

export default function PostRequirementPage() {
  if (IRFQ_V2_ENABLED) {
    redirect("/rfq/new");
  }

  redirect("/rfq/new");
}
