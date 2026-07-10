'use client';

import { DollarSign, Plus } from 'lucide-react';

export function PipelineClient({ initialStages }: { initialStages: any[] }) {
  const totalValue = initialStages.reduce((sum, s) => {
    return sum + s.leads.reduce((ls: number, l: any) => {
      const val = typeof l.value === 'string' ? parseFloat(l.value.replace(/[₹,L]/g, '')) * 100000 : 0;
      return ls + (isNaN(val) ? 0 : val);
    }, 0);
  }, 0);

  return (
    <div>
      <div className="ops-section-header">
        <div>
          <h1 className="ops-section-title">Lead Pipeline</h1>
          <p className="ops-section-subtitle">
            {initialStages.reduce((sum, s) => sum + s.leads.length, 0)} leads · Total value ₹{(totalValue / 100000).toFixed(1)}L
          </p>
          <div className="text-xs text-ops-text-muted mt-1">Live Projection View</div>
        </div>
        <button style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
          borderRadius: 8, border: 'none', background: 'var(--ops-accent-crm)',
          color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          <Plus className="w-4 h-4" /> Add Lead
        </button>
      </div>

      {/* Kanban Board */}
      <div style={{
        display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16,
        minHeight: 'calc(100vh - 220px)',
      }}>
        {initialStages.map(stage => (
          <div key={stage.key} style={{
            flex: '0 0 280px', display: 'flex', flexDirection: 'column',
          }}>
            {/* Stage Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 12px', marginBottom: 8,
              borderRadius: 'var(--ops-radius-sm)',
              background: 'var(--ops-surface)',
              border: '1px solid var(--ops-border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ops-text)' }}>{stage.label}</span>
                <span style={{
                  padding: '1px 7px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                  background: 'var(--ops-surface-2)', color: 'var(--ops-text-muted)',
                }}>{stage.leads.length}</span>
              </div>
            </div>

            {/* Lead Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {stage.leads.map((lead: any) => (
                <div key={lead.id} style={{
                  background: 'var(--ops-surface)',
                  border: '1px solid var(--ops-border)',
                  borderRadius: 'var(--ops-radius)',
                  padding: '14px',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--ops-border-light)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--ops-border)';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ops-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.company}</p>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--ops-text-muted)' }}>{lead.id.substring(0,8)}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--ops-text-secondary)', margin: '0 0 8px' }}>{lead.contact}</p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 700, color: 'var(--ops-accent-crm)' }}>
                      <DollarSign className="w-3.5 h-3.5" /> {lead.value}
                    </span>
                    <span style={{
                      padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                      background: lead.probability >= 70 ? 'rgba(34,197,94,0.12)' :
                                  lead.probability >= 40 ? 'rgba(245,158,11,0.12)' : 'rgba(59,130,246,0.12)',
                      color: lead.probability >= 70 ? 'var(--ops-success)' :
                             lead.probability >= 40 ? 'var(--ops-warning)' : 'var(--ops-info)',
                    }}>{lead.probability}%</span>
                  </div>

                  {/* Footer */}
                  <div style={{
                    paddingTop: 8, borderTop: '1px solid var(--ops-border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ fontSize: 11, color: 'var(--ops-text-muted)' }}>
                      {lead.nextAction} · {lead.dueIn}
                    </span>
                    <span style={{
                      padding: '1px 6px', borderRadius: 3, fontSize: 10,
                      background: 'var(--ops-surface-2)', color: 'var(--ops-text-muted)',
                    }}>{lead.source}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
