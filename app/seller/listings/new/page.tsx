import { redirect } from "next/navigation";

export default function SellerListingCreateRedirect() {
  redirect("/dashboard/seller/products/new");
}
