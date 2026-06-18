import ComingSoonPage from "@/components/coming-soon/ComingSoonPage"
import { comingSoonRoutes } from "@/config/comingSoonRoutes"

import { brandPageTitle } from '@/config/brand';

export const metadata = {
  title: brandPageTitle("Analytics Dashboard"),
}

export default function AnalyticsComingSoon() {
  const config = comingSoonRoutes.find((r) => r.path === "/dashboard/analytics")
  
  return (
    <ComingSoonPage 
      featureName={config?.featureName || "Analytics"} 
      description={config?.description} 
      backLink="/seller"
    />
  )
}
