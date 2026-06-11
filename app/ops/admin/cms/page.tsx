'use client';

import Link from 'next/link';
import { FileText, Image, Layout, Megaphone, Send } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

const cards = [
  { icon: Image, title: 'Hero Banners', desc: 'Manage homepage carousel slides', count: 4, href: '/ops/admin/cms?section=banners' },
  { icon: Layout, title: 'Landing Pages', desc: 'Create and edit landing pages', count: 6, href: '/ops/admin/cms?section=pages' },
  { icon: FileText, title: 'Blog Posts', desc: 'Content moderation and publishing', count: 12, href: '/ops/admin/cms?section=blog' },
  { icon: Megaphone, title: 'Announcements', desc: 'Platform-wide notifications', count: 2, href: '/ops/admin/cms?section=announcements' },
];

const contentQueue = [
  { title: 'Supplier verification help center update', type: 'Page', owner: 'Ops Content', status: 'Draft', updated: 'Today' },
  { title: 'June marketplace reliability notice', type: 'Announcement', owner: 'Platform Ops', status: 'Ready', updated: 'Today' },
  { title: 'CNC machining supplier guide', type: 'Blog', owner: 'Growth', status: 'Review', updated: 'Yesterday' },
  { title: 'Industrial procurement homepage banner', type: 'Banner', owner: 'Marketing', status: 'Live', updated: '2 days ago' },
];

export default function CMSPage() {
  const section = useSearchParams().get('section') ?? 'all';

  return (
    <div>
      <div className="ops-section-header">
        <div>
          <h1 className="ops-section-title">CMS & Content</h1>
          <p className="ops-section-subtitle">Manage banners, pages, SEO, and platform content</p>
        </div>
        <button className="ops-primary-action"><Send className="w-4 h-4" /> Publish Selected</button>
      </div>
      <div className="ops-workspace-grid">
        {cards.map((card) => {
          const Icon = card.icon;
          const active = card.href.includes(`section=${section}`);
          return (
            <Link key={card.title} className={`ops-workspace-tile ${active ? 'active' : ''}`} href={card.href}>
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
          <span className="ops-muted-cell">Filtered: {section}</span>
        </div>
        <div className="ops-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Content</th>
                <th>Type</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Workflow</th>
              </tr>
            </thead>
            <tbody>
              {contentQueue.map((item) => (
                <tr key={item.title}>
                  <td>{item.title}</td>
                  <td>{item.type}</td>
                  <td>{item.owner}</td>
                  <td><span className={`ops-status-badge ${item.status === 'Live' ? 'success' : item.status === 'Ready' ? 'info' : 'warning'}`}>{item.status}</span></td>
                  <td>{item.updated}</td>
                  <td><button className="ops-text-btn">Open workflow</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
