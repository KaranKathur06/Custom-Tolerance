'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/ops/shared/StatusBadge';
import { Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const actionColors: Record<string, string> = {
  'user.suspend': 'danger', 'listing.approve': 'success', 'listing.reject': 'danger',
  'role.assign': 'info', 'payment.refund': 'warning', 'supplier.verify': 'success',
};

export function AuditClient({ initialData, totalCount, currentPage, currentSearch }: { initialData: any[], totalCount: number, currentPage: number, currentSearch: string }) {
  const [search, setSearch] = useState(currentSearch);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/ops/admin/audit?page=1&search=${encodeURIComponent(search)}`);
  };

  const handlePageChange = (newPage: number) => {
    router.push(`/ops/admin/audit?page=${newPage}&search=${encodeURIComponent(currentSearch)}`);
  };

  return (
    <div>
      <div className="ops-section-header">
        <div>
          <h1 className="ops-section-title">Audit Logs</h1>
          <p className="ops-section-subtitle">Complete trail of administrative actions across the platform</p>
          <div className="text-xs text-ops-text-muted mt-1">Live Projection View</div>
        </div>
        <button className="ops-icon-btn" title="Export Logs"><Download className="w-4 h-4" /></button>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search className="w-4 h-4" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ops-text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by action, resource, or detail..."
            style={{
              width: '100%', padding: '9px 12px 9px 36px', borderRadius: 8,
              border: '1px solid var(--ops-border)', background: 'var(--ops-surface)',
              color: 'var(--ops-text)', fontSize: 13, outline: 'none',
            }}
          />
        </div>
      </form>

      <div className="ops-panel">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--ops-border)' }}>
                {['ID', 'User', 'Action', 'Detail', 'IP', 'Time'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left', fontWeight: 600,
                    color: 'var(--ops-text-secondary)', fontSize: 11,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {initialData.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: 'var(--ops-text-muted)' }}>No audit logs found.</td></tr>
              ) : initialData.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--ops-border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--ops-surface-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 11, color: 'var(--ops-text-muted)' }}>{log.id.slice(0, 8)}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--ops-text)' }}>{log.profiles?.email || 'System'}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <StatusBadge status={log.action} variant={actionColors[log.action] as any || 'neutral'} dot={false} />
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--ops-text-secondary)', maxWidth: 300 }}>{log.detail}</td>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12, color: 'var(--ops-text-muted)' }}>{log.ip || '-'}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--ops-text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
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
