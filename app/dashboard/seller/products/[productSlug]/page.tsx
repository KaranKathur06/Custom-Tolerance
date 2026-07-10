import { ProductWorkspace } from "@/components/products/ProductWorkspace";

type Props = { params: Promise<{ productSlug: string }> };

export default async function SellerProductWizardPage(props: Props) {
  const { productSlug } = await props.params;

  return <ProductWorkspace existingDraftId={productSlug} />;
}

