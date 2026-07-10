import { AuditProjectionService } from '@/lib/ops/projections/audit.projection';
import { AuditClient } from './audit-client';

export default async function AuditPage({ searchParams }: { searchParams: { page?: string, search?: string } }) {
  const page = Number(searchParams.page) || 1;
  const search = searchParams.search || '';

  // Fetch live projection data
  const { data, count } = await AuditProjectionService.getLogs(page, 50, search);

  return (
    <AuditClient 
      initialData={data || []} 
      totalCount={count || 0} 
      currentPage={page} 
      currentSearch={search} 
    />
  );
}
