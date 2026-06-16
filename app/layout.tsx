import type { Metadata } from "next"
import { Inter, Outfit } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { MarketplaceProviders } from "@/components/providers/MarketplaceProviders"
import { getServerAuthBootstrap } from "@/lib/auth/bootstrap-server-auth"
import { BRAND, brandPageTitle, brandSiteUrl } from "@/config/brand"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", weight: ["400", "500", "600", "700", "800"] })

export const metadata: Metadata = {
  metadataBase: new URL(brandSiteUrl()),
  title: brandPageTitle(),
  description: `${BRAND.name} — India's verified B2B marketplace for metal buyers, sellers, and industrial procurement. Source from trusted suppliers with enterprise-grade verification.`,
  keywords: "industrial marketplace, B2B procurement, metal suppliers India, steel buyers, industrial sourcing, custom tolerance",
  openGraph: {
    title: brandPageTitle(),
    description: `${BRAND.name} — verified B2B industrial procurement marketplace.`,
    siteName: BRAND.name,
    url: brandSiteUrl(),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: brandPageTitle(),
    description: `${BRAND.name} — verified B2B industrial procurement marketplace.`,
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const initialAuth = await getServerAuthBootstrap()

  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable} ${inter.className}`}>
        <MarketplaceProviders initialAuth={initialAuth}>
          <Header />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </MarketplaceProviders>
      </body>
    </html>
  )
}
