'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Image, Layout, Megaphone, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function CMSClient({ stats, initialContent, totalCount, currentSection, currentPage }: {
  stats: any;
  initialContent: any[];
  totalCount: number;
  currentSection: string;
  currentPage: number;
}) {
  const router = useRouter();

  const cards = [
    { id: 'banners', icon: Image, title: 'Hero Banners', desc: 'Manage homepage carousel slides', count: stats.banners },
    { id: 'pages', icon: Layout, title: 'Landing Pages', desc: 'Create and edit landing pages', count: stats.pages },
    { id: 'blog', icon: FileText, title: 'Blog Posts', desc: 'Content moderation and publishing', count: stats.blogs },
    { id: 'announcements', icon: Megaphone, title: 'Announcements', desc: 'Platform-wide notifications', count: stats.announcements },
  ];

  const handlePageChange = (newPage: number) => {
    router.push(`/ops/admin/cms?section=${currentSection}&page=${newPage}`);
  };

  return (
    <div>
      <div className="ops-section-header">
        <div>
          <h1 className="ops-section-title">CMS & Content</h1>
          <p className="ops-section-subtitle">Manage banners, pages, SEO, and platform content</p>
          <div className="text-xs text-ops-text-muted mt-1">Live Projection View</div>
        </div>
        <button className="ops-primary-action"><Send className="w-4 h-4" /> Publish Selected</button>
      </div>
      
      <div className="ops-workspace-grid">
        {cards.map((card) => {
          const Icon = card.icon;
          const active = currentSection === card.id || (currentSection === 'all' && card.id === 'pages');
          return (
            <Link key={card.id} className={`ops-workspace-tile ${active ? 'active' : ''}`} href={`/ops/admin/cms?section=${card.id}`}>
              <div className="ops-workspace-icon"><Icon className="w-5 h-5" /></div>
              <strong>{card.title}</strong>
              <span>{card.desc}</span>
              <small>{card.count} items</small>
            </Link>
          );
        })}
      </div>
      
      <div className="ops-panel" style={{ marginTop: 16 }}>
        <div className="ops-panel-header">
          <div className="ops-panel-title">Content Governance Queue</div>
          <span className="ops-muted-cell">Filtered: {currentSection}</span>
        </div>
        
        <div className="ops-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Content</th>
                <th>Type</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Workflow</th>
              </tr>
            </thead>
            <tbody>
              {initialContent.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: 'var(--ops-text-muted)' }}>No content found.</td></tr>
              ) : initialContent.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{currentSection === 'all' ? 'Page' : currentSection}</td>
                  <td>
                    <span className={`ops-status-badge ${item.status === 'PUBLISHED' ? 'success' : item.status === 'REVIEW' ? 'info' : 'warning'}`}>
                      {item.status || 'DRAFT'}
                    </span>
                  </td>
                  <td>{formatDistanceToNow(new Date(item.updated_at || item.created_at), { addSuffix: true })}</td>
                  <td><button className="ops-text-btn">Edit content</button></td>
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
