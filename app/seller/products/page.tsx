import { redirect } from "next/navigation";

export default function SellerProductsLegacyRedirect() {
  redirect("/dashboard/seller/products");
}
