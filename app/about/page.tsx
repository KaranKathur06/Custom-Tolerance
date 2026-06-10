import ComingSoonPage from "@/components/coming-soon/ComingSoonPage"
import { comingSoonRoutes } from "@/config/comingSoonRoutes"

import { brandPageTitle } from '@/config/brand';

export const metadata = {
  title: brandPageTitle("About Us"),
}

export default function AboutComingSoon() {
  const config = comingSoonRoutes.find((r) => r.path === "/about")
  
  return (
    <ComingSoonPage 
      featureName={config?.featureName || "About Us"} 
      description={config?.description} 
      backLink="/"
    />
  )
}
