import { CRMProjectionService } from '@/lib/ops/projections/crm.projection';
import { TasksClient } from './tasks-client';

export default async function TasksPage() {
  // Fetch up to 100 recent tasks regardless of status
  const { data: tasks, count } = await CRMProjectionService.getTasks(1, 100);

  return (
    <TasksClient initialTasks={tasks || []} totalCount={count || 0} />
  );
}
