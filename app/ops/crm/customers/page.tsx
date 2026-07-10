import { CRMProjectionService } from '@/lib/ops/projections/crm.projection';
import { CustomersClient } from './customers-client';

export default async function CustomersPage({ searchParams }: { searchParams: { page?: string, role?: string } }) {
  const page = Number(searchParams.page) || 1;
  const role = (searchParams.role as 'BUYER' | 'SELLER' | 'ALL') || 'ALL';

  const { data, count } = await CRMProjectionService.getCustomers(role, page, 50);

  return (
    <CustomersClient 
      initialCustomers={data || []}
      totalCount={count || 0}
      currentPage={page}
      currentRole={role}
    />
  );
}
