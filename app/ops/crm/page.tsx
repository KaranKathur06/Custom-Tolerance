import { CRMProjectionService } from '@/lib/ops/projections/crm.projection';
import { KPICard } from '@/components/ops/shared/KPICard';
import { StatusBadge } from '@/components/ops/shared/StatusBadge';
import {
  Target, DollarSign, TrendingUp, UserCheck,
  ArrowRight, Phone, Mail, Calendar,
} from 'lucide-react';
import Link from 'next/link';

export default async function CRMCommandCenter() {
  // Fetch live projections
  const kpis = await CRMProjectionService.getKPIs();
  const pipeline = await CRMProjectionService.getPipeline();
  
  // For hot leads, we query tasks or leads. 
  // Since we don't have a topLeads projection yet, we will fetch recent active customers
  const recentLeads = await CRMProjectionService.getCustomers('BUYER', 1, 5);
  
  // For tasks, fetch live tasks
  const tasksRes = await CRMProjectionService.getTasks(1, 5, { status: 'TODO' });

  return (
    <div>
      <div className="ops-section-header">
        <div>
          <h1 className="ops-section-title">CRM Command Center</h1>
          <p className="ops-section-subtitle">Live projection of marketplace sales and activity</p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="ops-kpi-grid">
        <KPICard title="Total Buyers" value={String(kpis.buyers)} change={0} changeLabel="Live" icon={Target} variant="info" />
        <KPICard title="Total Sellers" value={String(kpis.sellers)} change={0} changeLabel="Live" icon={DollarSign} variant="success" />
        <KPICard title="Active Leads" value={String(kpis.activeLeads)} change={0} changeLabel="Live" icon={TrendingUp} variant="warning" />
        <KPICard title="Pipeline Value" value="--" change={0} changeLabel="Calculating" icon={UserCheck} variant="info" />
      </div>

      {/* Pipeline Visual */}
      <div className="ops-panel" style={{ marginBottom: 16 }}>
        <div className="ops-panel-header">
          <div className="ops-panel-title">Sales Pipeline</div>
          <Link href="/ops/crm/pipeline" className="ops-text-btn" style={{ display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
            Open Kanban <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="ops-panel-body">
          <div style={{ display: 'flex', gap: 8 }}>
            {pipeline.map((s, i) => {
              const colors = ['var(--ops-info)', '#8b5cf6', 'var(--ops-warning)', '#f97316', 'var(--ops-success)'];
              const color = colors[i % colors.length];
              return (
                <div key={s.id} style={{
                  flex: 1,
                  padding: '14px 16px',
                  borderRadius: 'var(--ops-radius-sm)',
                  background: 'var(--ops-surface-2)',
                  border: '1px solid var(--ops-border)',
                  textAlign: 'center',
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 12, color: 'var(--ops-text-secondary)', marginBottom: 4 }}>{s.title}</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--ops-text)', lineHeight: 1.2 }}>{s.count}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Two Columns */}
      <div className="ops-grid-2">
        {/* Top Leads */}
        <div className="ops-panel">
          <div className="ops-panel-header">
            <div className="ops-panel-title">Recent Active Buyers</div>
            <Link href="/ops/crm/customers" className="ops-text-btn" style={{ display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
              All Customers <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="ops-panel-body" style={{ padding: 0 }}>
            {recentLeads.data.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ops-text-muted)', fontSize: 13 }}>No recent buyers.</div>
            ) : recentLeads.data.map((lead: any) => (
              <div key={lead.id} style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--ops-border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ops-text)' }}>{lead.company?.name || 'Unknown Company'}</span>
                    <StatusBadge status="ACTIVE" />
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--ops-text-secondary)', margin: 0 }}>
                    {lead.full_name || lead.email}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Tasks */}
        <div className="ops-panel">
          <div className="ops-panel-header">
            <div className="ops-panel-title">Upcoming Tasks</div>
            <Link href="/ops/crm/tasks" className="ops-text-btn" style={{ display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
              All Tasks <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="ops-panel-body">
            <div className="ops-activity-list">
              {tasksRes.data.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ops-text-muted)', fontSize: 13 }}>No upcoming tasks.</div>
              ) : tasksRes.data.map((task: any) => {
                const Icon = task.task_type === 'CALL' ? Phone : task.task_type === 'EMAIL' ? Mail : Calendar;
                return (
                  <div key={task.id} className="ops-activity-item">
                    <div className="ops-activity-icon" style={{
                      background: 'rgba(16,185,129,0.12)',
                      color: 'var(--ops-accent-crm)',
                    }}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="ops-activity-content">
                      <p className="ops-activity-text">{task.title}</p>
                      <p className="ops-activity-time">
                        {task.due_date ? new Date(task.due_date).toLocaleString() : 'No due date'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
