'use client';

import { useState } from 'react';
import { Activity, Bell, KeyRound, Monitor, Palette, Save, ShieldCheck, User } from 'lucide-react';
import { EnterpriseSelect } from '@/components/ui/EnterpriseSelect';

const accountTabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: KeyRound },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'activity', label: 'Activity Logs', icon: Activity },
  { id: 'sessions', label: 'Sessions', icon: Monitor },
];

export default function OpsAccountPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [theme, setTheme] = useState('graphite');
  const [density, setDensity] = useState('comfortable');

  return (
    <div className="ops-account-page">
      <div className="ops-section-header">
        <div>
          <h1 className="ops-section-title">Account Center</h1>
          <p className="ops-section-subtitle">Manage admin identity, security, sessions, notifications, and workspace preferences.</p>
        </div>
        <button className="ops-primary-action"><Save className="w-4 h-4" /> Save Profile</button>
      </div>

      <div className="ops-account-layout">
        <aside className="ops-settings-nav">
          {accountTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </aside>

        <section className="ops-settings-panel">
          {activeTab === 'profile' ? (
            <>
              <div className="ops-account-hero">
                <div className="ops-account-avatar">A</div>
                <div>
                  <h2>Super Admin</h2>
                  <p>Marketplace Operations Director</p>
                </div>
              </div>
              <div className="ops-settings-grid">
                <label className="ops-settings-field"><span>Name</span><input className="ops-settings-input" defaultValue="Super Admin" /></label>
                <label className="ops-settings-field"><span>Email</span><input className="ops-settings-input" defaultValue="admin@customtolerance.com" /></label>
                <label className="ops-settings-field"><span>Phone</span><input className="ops-settings-input" defaultValue="+91 98765 43210" /></label>
                <label className="ops-settings-field"><span>Designation</span><input className="ops-settings-input" defaultValue="Marketplace Operations Director" /></label>
              </div>
            </>
          ) : null}

          {activeTab === 'security' ? (
            <div className="ops-settings-stack">
              <div className="ops-account-security"><ShieldCheck className="w-5 h-5" /><div><strong>2FA Enabled</strong><span>Admin sessions require OTP verification.</span></div></div>
              <button className="ops-setting-toggle"><span><strong>Change Password</strong><small>Update account password and revoke older credentials.</small></span><i /></button>
              <button className="ops-setting-toggle"><span><strong>Recovery Codes</strong><small>Generate and download recovery codes.</small></span><i /></button>
              <button className="ops-setting-toggle"><span><strong>Session History</strong><small>Review active and recent admin sessions.</small></span><i className="checked" /></button>
            </div>
          ) : null}

          {activeTab === 'notifications' ? (
            <div className="ops-settings-stack">
              {['Verification escalations', 'Failed payments', 'Security alerts', 'RFQs without quotes', 'System health incidents'].map((label) => (
                <button key={label} className="ops-setting-toggle"><span><strong>{label}</strong><small>Notify me inside the operations queue.</small></span><i className="checked" /></button>
              ))}
            </div>
          ) : null}

          {activeTab === 'appearance' ? (
            <div className="ops-settings-grid">
              <label className="ops-settings-field">
                <span>Theme</span>
                <EnterpriseSelect
                  value={theme}
                  onValueChange={setTheme}
                  options={[
                    { label: 'Graphite Pro', value: 'graphite' },
                    { label: 'High Contrast', value: 'contrast' },
                  ]}
                  ariaLabel="Theme"
                />
              </label>
              <label className="ops-settings-field">
                <span>Density</span>
                <EnterpriseSelect
                  value={density}
                  onValueChange={setDensity}
                  options={[
                    { label: 'Comfortable', value: 'comfortable' },
                    { label: 'Compact', value: 'compact' },
                  ]}
                  ariaLabel="Density"
                />
              </label>
            </div>
          ) : null}

          {activeTab === 'activity' ? (
            <div className="ops-activity-list">
              {['Approved GST verification', 'Changed supplier role', 'Dismissed fraud alert', 'Exported revenue report'].map((item, index) => (
                <div key={item} className="ops-activity-item"><div className="ops-activity-icon"><Activity className="w-4 h-4" /></div><div><p className="ops-activity-text">{item}</p><p className="ops-activity-time">{index + 1} hours ago</p></div></div>
              ))}
            </div>
          ) : null}

          {activeTab === 'sessions' ? (
            <div className="ops-settings-stack">
              {['Windows · Chrome · Ahmedabad', 'MacBook Pro · Safari · Mumbai', 'iPhone · Mobile Safari · Ahmedabad'].map((session) => (
                <div key={session} className="ops-account-security"><Monitor className="w-5 h-5" /><div><strong>{session}</strong><span>Active session with admin permissions.</span></div></div>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
