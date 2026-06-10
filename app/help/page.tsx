import ComingSoonPage from "@/components/coming-soon/ComingSoonPage"
import { comingSoonRoutes } from "@/config/comingSoonRoutes"

import { brandPageTitle } from '@/config/brand';

export const metadata = {
  title: brandPageTitle("Help Center"),
}

export default function HelpComingSoon() {
  const config = comingSoonRoutes.find((r) => r.path === "/help")
  
  return (
    <ComingSoonPage 
      featureName={config?.featureName || "Interactive Help Center"} 
      description={config?.description} 
      backLink="/"
    />
  )
}
