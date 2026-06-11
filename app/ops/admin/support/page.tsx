'use client';

import { KPICard } from '@/components/ops/shared/KPICard';
import { AlertTriangle, CheckCircle2, Clock, Headphones, UserCheck } from 'lucide-react';
import { useState } from 'react';

const initialTickets = [
  { id: 'SUP-2201', account: 'Tata Steel Industries', topic: 'GST verification blocked', owner: 'Verification Team', priority: 'Critical', status: 'Open', sla: '42m' },
  { id: 'SUP-2198', account: 'Rajkot Precision Works', topic: 'Quote attachment failed', owner: 'Support Agent', priority: 'High', status: 'Assigned', sla: '2h 10m' },
  { id: 'SUP-2193', account: 'Mumbai Alloy Traders', topic: 'Subscription invoice mismatch', owner: 'Finance Team', priority: 'Medium', status: 'Open', sla: '5h 30m' },
  { id: 'SUP-2187', account: 'Coimbatore Foundry Hub', topic: 'Buyer message not received', owner: 'Marketplace Ops', priority: 'Low', status: 'Resolved', sla: 'Closed' },
];

export default function SupportPage() {
  const [tickets, setTickets] = useState(initialTickets);

  const updateTicket = (id: string, status: string) => {
    setTickets((current) => current.map((ticket) => ticket.id === id ? { ...ticket, status } : ticket));
    window.dispatchEvent(new CustomEvent('customtolerance:ops-event', {
      detail: { name: 'support.ticket_updated', payload: { entityId: id, message: `Ticket ${id} moved to ${status}` }, occurredAt: new Date().toISOString() },
    }));
  };

  return (
    <div>
      <div className="ops-section-header">
        <div>
          <h1 className="ops-section-title">Support Center</h1>
          <p className="ops-section-subtitle">Tickets, escalations, and SLA tracking</p>
        </div>
      </div>
      <div className="ops-kpi-grid">
        <KPICard title="Open Tickets" value="12" icon={Headphones} variant="warning" />
        <KPICard title="Avg Resolution" value="4.2 hrs" icon={Clock} variant="info" change={-18} changeLabel="improving" />
        <KPICard title="Resolved (Week)" value="48" icon={CheckCircle2} variant="success" />
        <KPICard title="Escalations" value="3" icon={AlertTriangle} variant="danger" />
      </div>
      <div className="ops-panel">
        <div className="ops-panel-header">
          <div className="ops-panel-title">Operational Ticket Queue</div>
          <button className="ops-primary-action"><UserCheck className="w-4 h-4" /> Assign Triage</button>
        </div>
        <div className="ops-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Account</th>
                <th>Issue</th>
                <th>Owner</th>
                <th>Priority</th>
                <th>Status</th>
                <th>SLA</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td>{ticket.id}</td>
                  <td>{ticket.account}</td>
                  <td>{ticket.topic}</td>
                  <td>{ticket.owner}</td>
                  <td><span className={`ops-status-badge ${ticket.priority === 'Critical' ? 'danger' : ticket.priority === 'High' ? 'warning' : 'neutral'}`}>{ticket.priority}</span></td>
                  <td>{ticket.status}</td>
                  <td>{ticket.sla}</td>
                  <td>
                    <div className="ops-inline-actions">
                      <button className="ops-text-btn" onClick={() => updateTicket(ticket.id, 'Assigned')}>Assign</button>
                      <button className="ops-text-btn" onClick={() => updateTicket(ticket.id, 'Resolved')}>Resolve</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
