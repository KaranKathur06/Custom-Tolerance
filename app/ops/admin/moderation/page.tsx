'use client';

import { KPICard } from '@/components/ops/shared/KPICard';
import { StatusBadge } from '@/components/ops/shared/StatusBadge';
import { AlertTriangle, CheckCircle2, Eye, Flag, Shield, XCircle } from 'lucide-react';

const queues = [
  { id: 'MOD-1042', type: 'Listing', subject: 'Brass rods pricing outside tolerance band', source: 'Rajasthan Metals', status: 'Needs Review', severity: 'High' },
  { id: 'MOD-1041', type: 'RFQ', subject: 'Duplicate CNC machining RFQ submitted 4 times', source: 'Buyer account U-204', status: 'Queued', severity: 'High' },
  { id: 'MOD-1039', type: 'Review', subject: 'Reported review contains unsupported claim', source: 'Ahmedabad buyer', status: 'Needs Review', severity: 'Medium' },
  { id: 'MOD-1037', type: 'Supplier Risk', subject: 'Phone number reused across three suppliers', source: 'Trust rules', status: 'Escalated', severity: 'Critical' },
];

export default function ModerationPage() {
  return (
    <div>
      <div className="ops-section-header">
        <div>
          <h1 className="ops-section-title">Moderation Center</h1>
          <p className="ops-section-subtitle">Rules-based review queues for listings, RFQs, reviews, supplier risk, and marketplace policy enforcement.</p>
        </div>
      </div>

      <div className="ops-kpi-grid">
        <KPICard title="Open Reviews" value="43" icon={Flag} variant="warning" change={-6} changeLabel="vs yesterday" />
        <KPICard title="High Risk Queue" value="7" icon={AlertTriangle} variant="danger" />
        <KPICard title="Resolved Today" value="29" icon={CheckCircle2} variant="success" />
        <KPICard title="Policy SLA" value="92%" icon={Shield} variant="info" />
      </div>

      <div className="ops-panel">
        <div className="ops-panel-header">
          <div>
            <div className="ops-panel-title">Operational Moderation Queue</div>
            <p className="ops-section-subtitle">Every item opens a real moderation workflow and audit trail.</p>
          </div>
        </div>
        <div className="ops-moderation-list">
          {queues.map((item) => (
            <div key={item.id} className="ops-moderation-row">
              <div>
                <span>{item.id}</span>
                <strong>{item.subject}</strong>
                <small>{item.type} · {item.source}</small>
              </div>
              <StatusBadge status={item.status} />
              <StatusBadge status={item.severity} />
              <div className="ops-row-actions">
                <button className="ops-icon-btn" title="Open"><Eye className="w-4 h-4" /></button>
                <button className="ops-icon-btn" title="Resolve"><CheckCircle2 className="w-4 h-4" /></button>
                <button className="ops-icon-btn" title="Reject"><XCircle className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
