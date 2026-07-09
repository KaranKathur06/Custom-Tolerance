import { redirect } from "next/navigation";

export default function CreateSellerProductRedirectPage() {
  redirect("/dashboard/seller/products/new");
}

