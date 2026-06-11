'use client';

import { KPICard } from '@/components/ops/shared/KPICard';
import { ArrowDownLeft, CreditCard, DollarSign, Download, RotateCcw, TrendingUp } from 'lucide-react';

const transactions = [
  { id: 'PAY-1048', company: 'Rajkot Precision Works', type: 'Subscription', amount: 'INR 48,000', tax: 'INR 8,640', status: 'Settled', payout: 'Completed' },
  { id: 'PAY-1047', company: 'Mumbai Alloy Traders', type: 'Commission', amount: 'INR 22,400', tax: 'INR 4,032', status: 'Captured', payout: 'Queued' },
  { id: 'PAY-1046', company: 'Pune CNC Systems', type: 'Subscription', amount: 'INR 36,000', tax: 'INR 6,480', status: 'Failed', payout: 'Blocked' },
  { id: 'PAY-1045', company: 'Coimbatore Foundry Hub', type: 'Refund', amount: 'INR 12,000', tax: 'INR 2,160', status: 'Refunded', payout: 'Reconciled' },
];

const payouts = [
  { supplier: 'Rajkot Precision Works', due: 'INR 1.8L', cycle: 'T+2', risk: 'Clear' },
  { supplier: 'Mumbai Alloy Traders', due: 'INR 92K', cycle: 'T+3', risk: 'GST review' },
  { supplier: 'Pune CNC Systems', due: 'INR 0', cycle: 'Hold', risk: 'Payment failed' },
];

export default function FinancePage() {
  const exportLedger = () => {
    window.dispatchEvent(new CustomEvent('customtolerance:ops-event', {
      detail: { name: 'finance.exported', payload: { message: 'Finance ledger export queued' }, occurredAt: new Date().toISOString() },
    }));
  };

  return (
    <div>
      <div className="ops-section-header">
        <div>
          <h1 className="ops-section-title">Revenue Operations</h1>
          <p className="ops-section-subtitle">GMV, commissions, payouts, and transaction monitoring</p>
        </div>
      </div>
      <div className="ops-kpi-grid">
        <KPICard title="GMV (This Month)" value="INR 28.4L" icon={DollarSign} variant="success" change={15.2} changeLabel="vs last month" sparkline={[3, 5, 4, 7, 8, 6, 9, 11, 10, 14]} />
        <KPICard title="Commission Revenue" value="INR 2.84L" icon={TrendingUp} variant="info" change={15.2} changeLabel="10% rate" />
        <KPICard title="Successful Payments" value="342" icon={CreditCard} variant="success" change={8.5} changeLabel="vs last month" />
        <KPICard title="Refunds" value="INR 45K" icon={ArrowDownLeft} variant="warning" change={-12} changeLabel="vs last month" />
      </div>
      <div className="ops-panel">
        <div className="ops-panel-header">
          <div className="ops-panel-title">Transaction History</div>
          <button className="ops-primary-action" onClick={exportLedger}><Download className="w-4 h-4" /> Export Ledger</button>
        </div>
        <div className="ops-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Payment</th>
                <th>Company</th>
                <th>Type</th>
                <th>Amount</th>
                <th>GST</th>
                <th>Status</th>
                <th>Payout</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{transaction.id}</td>
                  <td>{transaction.company}</td>
                  <td>{transaction.type}</td>
                  <td>{transaction.amount}</td>
                  <td>{transaction.tax}</td>
                  <td><span className={`ops-status-badge ${transaction.status === 'Failed' ? 'danger' : transaction.status === 'Refunded' ? 'warning' : 'success'}`}>{transaction.status}</span></td>
                  <td>{transaction.payout}</td>
                  <td><button className="ops-text-btn"><RotateCcw className="w-4 h-4" /> Reconcile</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="ops-grid-3" style={{ marginTop: 16 }}>
        {payouts.map((payout) => (
          <div key={payout.supplier} className="ops-panel">
            <div className="ops-panel-body">
              <p className="ops-mini-label">Supplier Payout</p>
              <h3 className="ops-card-heading">{payout.supplier}</h3>
              <div className="ops-mini-grid">
                <span>Due<strong>{payout.due}</strong></span>
                <span>Cycle<strong>{payout.cycle}</strong></span>
                <span>Risk<strong>{payout.risk}</strong></span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
