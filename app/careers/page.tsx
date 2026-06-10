import ComingSoonPage from "@/components/coming-soon/ComingSoonPage"
import { comingSoonRoutes } from "@/config/comingSoonRoutes"

import { brandPageTitle } from '@/config/brand';

export const metadata = {
  title: brandPageTitle("Careers Hub"),
}

export default function CareersComingSoon() {
  const config = comingSoonRoutes.find((r) => r.path === "/careers")
  
  return (
    <ComingSoonPage 
      featureName={config?.featureName || "Careers Hub"} 
      description={config?.description} 
      backLink="/"
    />
  )
}
