import ComingSoonPage from "@/components/coming-soon/ComingSoonPage"
import { comingSoonRoutes } from "@/config/comingSoonRoutes"

import { brandPageTitle } from '@/config/brand';

export const metadata = {
  title: brandPageTitle("Privacy Policy"),
}

export default function PrivacyComingSoon() {
  const config = comingSoonRoutes.find((r) => r.path === "/privacy")
  
  return (
    <ComingSoonPage 
      featureName={config?.featureName || "Privacy Policy Center"} 
      description={config?.description} 
      backLink="/"
    />
  )
}
