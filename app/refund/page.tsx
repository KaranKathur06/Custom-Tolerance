import ComingSoonPage from "@/components/coming-soon/ComingSoonPage"
import { comingSoonRoutes } from "@/config/comingSoonRoutes"

import { brandPageTitle } from '@/config/brand';

export const metadata = {
  title: brandPageTitle("Refund Policy"),
}

export default function RefundComingSoon() {
  const config = comingSoonRoutes.find((r) => r.path === "/refund")
  
  return (
    <ComingSoonPage 
      featureName={config?.featureName || "Global Refund Policy"} 
      description={config?.description} 
      backLink="/"
    />
  )
}
