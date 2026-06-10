'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  Cog,
  Factory,
  FlaskConical,
  GitBranch,
  Package,
  ShieldCheck,
  Truck,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { ProgressiveDisclosureCards } from '@/components/navigation/ProgressiveDisclosureCards';

const ICON_MAP: Record<string, LucideIcon> = {
  Building2,
  Cog,
  Factory,
  FlaskConical,
  GitBranch,
  Package,
  ShieldCheck,
  Truck,
  Wrench,
  Zap,
};

function IndustryIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && ICON_MAP[name]) || Factory;
  return <Icon className={className || 'h-6 w-6'} aria-hidden="true" />;
}

type IndustryItem = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string | null;
};

export default function IndustriesGrid({ industries }: { industries: IndustryItem[] }) {
  return (
    <section className="py-20">
      <div className="container">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Industries We Serve</h2>
          <p className="mt-4 text-base text-slate-600">
            Source verified suppliers by industry — from automotive and aerospace to medical devices and industrial machinery.
          </p>
        </div>

        <ProgressiveDisclosureCards
          items={industries}
          kind="industries"
          getHref={(industry) => `/industries/${industry.slug}`}
          renderCard={(industry) => (
            <Link href={`/industries/${industry.slug}`} className="group block h-full">
              <article className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
                <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-blue-50 group-hover:text-blue-700">
                  <IndustryIcon name={industry.icon} />
                </span>
                <h3 className="text-xl font-semibold text-slate-900 transition-colors group-hover:text-blue-700">
                  {industry.name}
                </h3>
                <p className="mt-2 line-clamp-3 flex-1 text-sm text-slate-600">{industry.description}</p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
                  Explore Industry
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </article>
            </Link>
          )}
        />
      </div>
    </section>
  );
}
