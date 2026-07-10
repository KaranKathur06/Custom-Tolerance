import { CRMProjectionService } from '@/lib/ops/projections/crm.projection';
import { PipelineClient } from './pipeline-client';

export default async function PipelinePage() {
  const initialStages = await CRMProjectionService.getKanbanLeads();

  return (
    <PipelineClient initialStages={initialStages} />
  );
}
