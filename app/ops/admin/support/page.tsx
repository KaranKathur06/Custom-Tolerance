import { SupportProjectionService } from '@/lib/ops/projections/support.projection';
import { SupportClient } from './support-client';

export default async function SupportPage({ searchParams }: { searchParams: { status?: string, category?: string, page?: string } }) {
  const page = Number(searchParams.page) || 1;
  const status = searchParams.status || '';
  const category = searchParams.category || '';

  // Fetch live ticket statistics
  const stats = await SupportProjectionService.getTicketStats();

  // Fetch live ticket queue
  const { data, count } = await SupportProjectionService.getTickets(page, 50, { 
    status: status || undefined, 
    category: category || undefined 
  });

  return (
    <SupportClient 
      stats={stats}
      initialTickets={data || []}
      totalCount={count || 0}
      currentPage={page}
      currentStatus={status}
      currentCategory={category}
    />
  );
}
