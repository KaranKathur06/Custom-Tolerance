import { brandPageTitle, BRAND } from '@/config/brand';
import type { Metadata } from 'next';
import IndustriesGrid from '@/components/industries/IndustriesGrid';
import { getIndustries } from '@/lib/server/content';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: brandPageTitle('Industries'),
  description: `Browse industry-specific supplier networks on ${BRAND.name} — automotive, aerospace, defense, medical, and more.`,
};

export default async function IndustriesPage() {
  const industries = await getIndustries();

  return (
    <div className="pb-12">
      <section className="border-b bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 py-20 text-white">
        <div className="container">
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
            Industry-Specific Industrial Sourcing
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-200 md:text-lg">
            Discover verified suppliers aligned to your sector — curated for enterprise procurement teams.
          </p>
        </div>
      </section>

      <IndustriesGrid industries={industries} />
    </div>
  );
}
