'use client';

import { KPICard } from '@/components/ops/shared/KPICard';
import { DollarSign, Target, TrendingUp, Users } from 'lucide-react';

const trend = [
  { month: 'Jan', value: 42 },
  { month: 'Feb', value: 48 },
  { month: 'Mar', value: 54 },
  { month: 'Apr', value: 51 },
  { month: 'May', value: 62 },
  { month: 'Jun', value: 74 },
];

const sources = [
  { label: 'Subscriptions', value: 'INR 2.1L', percent: 66 },
  { label: 'Commissions', value: 'INR 82K', percent: 26 },
  { label: 'Promoted Listings', value: 'INR 26K', percent: 8 },
];

export default function RevenuePage() {
  return (
    <div>
      <div className="ops-section-header">
        <div>
          <h1 className="ops-section-title">Revenue Analytics</h1>
          <p className="ops-section-subtitle">MRR, ARR, LTV/CAC, and revenue forecasting</p>
        </div>
      </div>
      <div className="ops-kpi-grid">
        <KPICard title="MRR" value="INR 3.2L" icon={DollarSign} variant="success" change={12.5} changeLabel="vs last month" sparkline={[3, 4, 5, 4, 6, 7, 6, 8, 9, 10]} />
        <KPICard title="ARR" value="INR 38.4L" icon={TrendingUp} variant="info" change={12.5} changeLabel="projected" />
        <KPICard title="Avg LTV" value="INR 2.8L" icon={Users} variant="success" />
        <KPICard title="CAC" value="INR 4,200" icon={Target} variant="warning" change={-8} changeLabel="improving" />
      </div>
      <div className="ops-grid-2">
        <div className="ops-panel">
          <div className="ops-panel-header"><div className="ops-panel-title">Revenue Trend</div></div>
          <div className="ops-chart-bars">
            {trend.map((item) => (
              <div key={item.month} className="ops-chart-bar-wrap">
                <div className="ops-chart-bar" style={{ height: `${item.value * 2}px` }} />
                <span>{item.month}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="ops-panel">
          <div className="ops-panel-header"><div className="ops-panel-title">Revenue by Source</div></div>
          <div className="ops-source-list">
            {sources.map((source) => (
              <div key={source.label} className="ops-source-row">
                <div>
                  <strong>{source.label}</strong>
                  <span>{source.value}</span>
                </div>
                <div className="ops-source-track"><i style={{ width: `${source.percent}%` }} /></div>
                <b>{source.percent}%</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
