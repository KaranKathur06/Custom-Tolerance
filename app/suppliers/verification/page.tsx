import ComingSoonPage from "@/components/coming-soon/ComingSoonPage"
import { comingSoonRoutes } from "@/config/comingSoonRoutes"

import { brandPageTitle } from '@/config/brand';

export const metadata = {
  title: brandPageTitle("Supplier Verification"),
}

export default function VerificationComingSoon() {
  const config = comingSoonRoutes.find((r) => r.path === "/suppliers/verification")
  
  return (
    <ComingSoonPage 
      featureName={config?.featureName || "Verification Flow"} 
      description={config?.description} 
      backLink="/seller"
    />
  )
}
