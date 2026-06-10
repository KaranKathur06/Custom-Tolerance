import ComingSoonPage from "@/components/coming-soon/ComingSoonPage"
import { comingSoonRoutes } from "@/config/comingSoonRoutes"

import { brandPageTitle } from '@/config/brand';

export const metadata = {
  title: brandPageTitle("Terms of Service"),
}

export default function TermsComingSoon() {
  const config = comingSoonRoutes.find((r) => r.path === "/terms")
  
  return (
    <ComingSoonPage 
      featureName={config?.featureName || "Terms of Service"} 
      description={config?.description} 
      backLink="/"
    />
  )
}
