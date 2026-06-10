import ComingSoonPage from "@/components/coming-soon/ComingSoonPage"
import { comingSoonRoutes } from "@/config/comingSoonRoutes"

import { brandPageTitle } from '@/config/brand';

export const metadata = {
  title: brandPageTitle("Contact Us"),
}

export default function ContactComingSoon() {
  const config = comingSoonRoutes.find((r) => r.path === "/contact")
  
  return (
    <ComingSoonPage 
      featureName={config?.featureName || "Contact Support Portal"} 
      description={config?.description} 
      backLink="/"
    />
  )
}
