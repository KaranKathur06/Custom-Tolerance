import ComingSoonPage from "@/components/coming-soon/ComingSoonPage"
import { comingSoonRoutes } from "@/config/comingSoonRoutes"

import { brandPageTitle } from '@/config/brand';

export const metadata = {
  title: brandPageTitle("Industry Specific Sourcing"),
}

export default function IndustriesComingSoon() {
  const config = comingSoonRoutes.find((r) => r.path === "/industries")
  
  return (
    <ComingSoonPage 
      featureName={config?.featureName || "Industry Portals"} 
      description={config?.description} 
      backLink="/"
    />
  )
}
