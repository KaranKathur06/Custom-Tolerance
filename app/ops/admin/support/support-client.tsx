'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KPICard } from '@/components/ops/shared/KPICard';
import { AlertTriangle, CheckCircle2, Clock, Headphones, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function SupportClient({ stats, initialTickets, totalCount, currentPage, currentStatus, currentCategory }: {
  stats: any;
  initialTickets: any[];
  totalCount: number;
  currentPage: number;
  currentStatus: string;
  currentCategory: string;
}) {
  const router = useRouter();

  const kpis = [
    { title: 'Open Tickets', value: String(stats.open), icon: Headphones, variant: 'warning' as const },
    { title: 'In Progress', value: String(stats.inProgress), icon: Clock, variant: 'info' as const },
    { title: 'Resolved', value: String(stats.resolved), icon: CheckCircle2, variant: 'success' as const },
    { title: 'Urgent', value: String(stats.urgent), icon: AlertTriangle, variant: 'danger' as const },
  ];

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams();
    if (currentStatus) params.set('status', currentStatus);
    if (currentCategory) params.set('category', currentCategory);
    params.set('page', String(newPage));
    router.push(`/ops/admin/support?${params.toString()}`);
  };

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams();
    if (key === 'status') {
      if (value) params.set('status', value);
      if (currentCategory) params.set('category', currentCategory);
    } else if (key === 'category') {
      if (currentStatus) params.set('status', currentStatus);
      if (value) params.set('category', value);
    }
    params.set('page', '1');
    router.push(`/ops/admin/support?${params.toString()}`);
  };

  return (
    <div>
      <div className="ops-section-header">
        <div>
          <h1 className="ops-section-title">Support Center</h1>
          <p className="ops-section-subtitle">Tickets, escalations, and SLA tracking (live metrics)</p>
          <div className="text-xs text-ops-text-muted mt-1">Live Projection View</div>
        </div>
        <button className="ops-primary-action" type="button">
          <UserCheck className="w-4 h-4" /> Assign Triage
        </button>
      </div>

      <div className="ops-kpi-grid mb-6">
        {kpis.map((c) => (
          <KPICard key={c.title} title={c.title} value={c.value} icon={c.icon} variant={c.variant} />
        ))}
      </div>

      <div className="flex gap-4 mb-4">
        <select 
          className="ops-select" 
          value={currentStatus} 
          onChange={e => handleFilterChange('status', e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--ops-border)', fontSize: 13 }}
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="WAITING_ON_CUSTOMER">Waiting</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      <div className="ops-panel">
        <div className="ops-panel-header">
          <div className="ops-panel-title">Operational Ticket Queue</div>
        </div>

        <div className="ops-table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--ops-border)' }}>
                {['Ticket #', 'Title', 'Customer', 'Priority', 'Status', 'Assigned To', 'Updated'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left', fontWeight: 600,
                    color: 'var(--ops-text-secondary)', fontSize: 11,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {initialTickets.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: 'var(--ops-text-muted)' }}>No tickets found matching filters.</td></tr>
              ) : initialTickets.map(ticket => (
                <tr key={ticket.id} style={{ borderBottom: '1px solid var(--ops-border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--ops-surface-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12, color: 'var(--ops-text-muted)' }}>#{ticket.ticket_number}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--ops-text)', fontWeight: 500 }}>{ticket.title}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--ops-text)' }}>
                    {ticket.user?.full_name || ticket.user?.email || 'Unknown'}
                    {ticket.company && <div className="text-xs text-ops-text-muted">{ticket.company.name}</div>}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span className={`ops-status-badge ${ticket.priority === 'URGENT' ? 'danger' : ticket.priority === 'HIGH' ? 'warning' : 'neutral'}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span className={`ops-status-badge ${ticket.status === 'RESOLVED' ? 'success' : ticket.status === 'IN_PROGRESS' ? 'info' : 'neutral'}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--ops-text-muted)' }}>{ticket.assigned_to?.full_name || 'Unassigned'}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--ops-text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {totalCount > 50 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--ops-border)' }}>
            <span style={{ fontSize: 12, color: 'var(--ops-text-muted)' }}>Showing {(currentPage - 1) * 50 + 1} to {Math.min(currentPage * 50, totalCount)} of {totalCount}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)} className="ops-icon-btn"><ChevronLeft className="w-4 h-4" /></button>
              <button disabled={currentPage * 50 >= totalCount} onClick={() => handlePageChange(currentPage + 1)} className="ops-icon-btn"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
