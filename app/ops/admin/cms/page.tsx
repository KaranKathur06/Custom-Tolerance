import { CMSProjectionService } from '@/lib/ops/projections/cms.projection';
import { CMSClient } from './cms-client';

export default async function CMSPage({ searchParams }: { searchParams: { section?: string, page?: string } }) {
  const section = (searchParams.section as any) || 'all';
  const page = Number(searchParams.page) || 1;

  // Fetch live stats for the cards
  const stats = await CMSProjectionService.getStats();

  // Fetch live content for the table based on selected section
  let content = [];
  let count = 0;
  
  if (section === 'banners' || section === 'pages' || section === 'announcements' || section === 'blogs') {
    const res = await CMSProjectionService.getContent(section, page, 50);
    content = res.data;
    count = res.count || 0;
  } else {
    // If 'all', we might fetch the most recent of each or just pages by default
    const res = await CMSProjectionService.getContent('pages', page, 50);
    content = res.data;
    count = res.count || 0;
  }

  return (
    <CMSClient 
      stats={stats}
      initialContent={content || []}
      totalCount={count}
      currentSection={section}
      currentPage={page}
    />
  );
}
