import ComingSoonPage from "@/components/coming-soon/ComingSoonPage"
import { comingSoonRoutes } from "@/config/comingSoonRoutes"

import { brandPageTitle } from '@/config/brand';

export const metadata = {
  title: brandPageTitle("FAQ"),
}

export default function FAQComingSoon() {
  const config = comingSoonRoutes.find((r) => r.path === "/faq")
  
  return (
    <ComingSoonPage 
      featureName={config?.featureName || "FAQ Portal"} 
      description={config?.description} 
      backLink="/"
    />
  )
}
