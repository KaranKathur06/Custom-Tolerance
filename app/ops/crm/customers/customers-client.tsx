'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/ops/shared/StatusBadge';
import { Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

function EngagementBar({ score }: { score: number }) {
  const color = score >= 70 ? 'var(--ops-success)' : score >= 40 ? 'var(--ops-warning)' : 'var(--ops-danger)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 60, height: 6, borderRadius: 3, background: 'var(--ops-surface-2)', overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', borderRadius: 3, background: color, transition: 'width 300ms' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color }}>{score}</span>
    </div>
  );
}

export function CustomersClient({ initialCustomers, totalCount, currentPage, currentRole }: {
  initialCustomers: any[];
  totalCount: number;
  currentPage: number;
  currentRole: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const filtered = initialCustomers.filter(c => {
    const term = search.toLowerCase();
    const cName = c.company?.name?.toLowerCase() || '';
    const contact = c.full_name?.toLowerCase() || c.email?.toLowerCase() || '';
    return !search || cName.includes(term) || contact.includes(term);
  });

  const handlePageChange = (newPage: number) => {
    router.push(`/ops/crm/customers?role=${currentRole}&page=${newPage}`);
  };

  const handleRoleChange = (newRole: string) => {
    router.push(`/ops/crm/customers?role=${newRole}&page=1`);
  };

  return (
    <div>
      <div className="ops-section-header">
        <div>
          <h1 className="ops-section-title">Customer Intelligence</h1>
          <p className="ops-section-subtitle">{totalCount} customers · Track engagement, LTV, and churn risk</p>
          <div className="text-xs text-ops-text-muted mt-1">Live Projection View</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ position: 'relative', maxWidth: 400, flex: 1 }}>
          <Search className="w-4 h-4" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ops-text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search companies or contacts…"
            style={{
              width: '100%', padding: '9px 12px 9px 36px', borderRadius: 8,
              border: '1px solid var(--ops-border)', background: 'var(--ops-surface)',
              color: 'var(--ops-text)', fontSize: 13, outline: 'none',
            }} />
        </div>
        
        <select 
          className="ops-select" 
          value={currentRole} 
          onChange={e => handleRoleChange(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--ops-border)', fontSize: 13 }}
        >
          <option value="ALL">All Roles</option>
          <option value="BUYER">Buyers</option>
          <option value="SELLER">Sellers</option>
        </select>
      </div>

      <div className="ops-panel">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--ops-border)' }}>
                {['Company', 'Contact', 'Role', 'Status', ''].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left', fontWeight: 600,
                    color: 'var(--ops-text-secondary)', fontSize: 11,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: 'var(--ops-text-muted)' }}>No customers found.</td></tr>
              ) : filtered.map((c: any) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--ops-border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--ops-surface-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 8,
                        background: 'linear-gradient(135deg, var(--ops-accent-crm), #059669)',
                        color: 'white', display: 'grid', placeItems: 'center',
                        fontSize: 13, fontWeight: 700,
                      }}>{(c.company?.name || 'U')[0]}</div>
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--ops-text)', margin: 0 }}>{c.company?.name || 'Unknown Company'}</p>
                        <p style={{ fontSize: 11, color: 'var(--ops-text-muted)', margin: 0 }}>{c.id.substring(0,8)}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <p style={{ color: 'var(--ops-text)', margin: 0 }}>{c.full_name || 'N/A'}</p>
                    <p style={{ fontSize: 11, color: 'var(--ops-text-muted)', margin: 0 }}>{c.email}</p>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, padding: '2px 6px', background: 'var(--ops-surface-2)', borderRadius: 4, color: 'var(--ops-text-muted)' }}>{c.role}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <StatusBadge status="ACTIVE" variant="success" />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button className="ops-icon-btn" style={{ width: 30, height: 30 }}><Eye className="w-3.5 h-3.5" /></button>
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
