import ComingSoonPage from "@/components/coming-soon/ComingSoonPage"
import { comingSoonRoutes } from "@/config/comingSoonRoutes"

import { brandPageTitle } from '@/config/brand';

export const metadata = {
  title: brandPageTitle("Products Catalog"),
}

export default function ProductsComingSoon() {
  const config = comingSoonRoutes.find((r) => r.path === "/products")
  
  return (
    <ComingSoonPage 
      featureName={config?.featureName || "Category Products Index"} 
      description={config?.description} 
      backLink="/"
    />
  )
}
