'use client';

import { Mail, Zap } from 'lucide-react';
import { useState } from 'react';

const baseCampaigns = [
  { name: 'Dormant Supplier Reactivation', channel: 'Email + WhatsApp', audience: 'Suppliers inactive 30d', status: 'Running', conversion: '18.4%', owner: 'Growth Ops' },
  { name: 'GST Completion Reminder', channel: 'WhatsApp', audience: 'Pending verification', status: 'Scheduled', conversion: '31.2%', owner: 'Verification' },
  { name: 'RFQ No-Quote Recovery', channel: 'Email', audience: 'Buyers with open RFQs', status: 'Paused', conversion: '9.8%', owner: 'Marketplace Ops' },
];

export default function CampaignsPage() {
  const [campaigns] = useState(baseCampaigns);

  return (
    <div>
      <div className="ops-section-header">
        <div>
          <h1 className="ops-section-title">Campaign Management</h1>
          <p className="ops-section-subtitle">Email, WhatsApp, and automated campaign workflows</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Campaign management is currently read-only until the outreach workflow is connected.
        </div>
      </div>
      <div className="ops-kpi-grid">
        <div className="ops-panel"><div className="ops-panel-body"><p className="ops-mini-label">Active Campaigns</p><h3 className="ops-card-metric">8</h3></div></div>
        <div className="ops-panel"><div className="ops-panel-body"><p className="ops-mini-label">Conversion</p><h3 className="ops-card-metric">19.6%</h3></div></div>
        <div className="ops-panel"><div className="ops-panel-body"><p className="ops-mini-label">Messages Sent</p><h3 className="ops-card-metric">14,280</h3></div></div>
        <div className="ops-panel"><div className="ops-panel-body"><p className="ops-mini-label">Qualified Leads</p><h3 className="ops-card-metric">342</h3></div></div>
      </div>
      <div className="ops-panel">
        <div className="ops-panel-header">
          <div className="ops-panel-title">Campaign Operations Queue</div>
          <Zap className="w-4 h-4" />
        </div>
        <div className="ops-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Channel</th>
                <th>Audience</th>
                <th>Status</th>
                <th>Conversion</th>
                <th>Owner</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.name}>
                  <td>{campaign.name}</td>
                  <td><Mail className="w-4 h-4" /> {campaign.channel}</td>
                  <td>{campaign.audience}</td>
                  <td><span className={`ops-status-badge ${campaign.status === 'Running' ? 'success' : campaign.status === 'Scheduled' ? 'info' : 'warning'}`}>{campaign.status}</span></td>
                  <td>{campaign.conversion}</td>
                  <td>{campaign.owner}</td>
                  <td><span className="text-sm text-slate-500">Read-only</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
