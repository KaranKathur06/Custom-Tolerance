'use client';

import { useState } from 'react';
import {
  Bell,
  Building2,
  CreditCard,
  Lock,
  Save,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { EnterpriseSelect } from '@/components/ui/EnterpriseSelect';

const sections = [
  { id: 'configuration', title: 'Marketplace Configuration', icon: Building2 },
  { id: 'rules', title: 'Marketplace Rules', icon: SlidersHorizontal },
  { id: 'notifications', title: 'Notification Settings', icon: Bell },
  { id: 'payments', title: 'Payment Settings', icon: CreditCard },
  { id: 'security', title: 'Security Settings', icon: Lock },
];

function Toggle({ label, description, defaultChecked = false }: { label: string; description: string; defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <button className="ops-setting-toggle" onClick={() => setChecked((value) => !value)} type="button">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <i className={checked ? 'checked' : ''} />
    </button>
  );
}

function Field({ label, value, type = 'text' }: { label: string; value: string; type?: string }) {
  const [current, setCurrent] = useState(value);
  return (
    <label className="ops-settings-field">
      <span>{label}</span>
      <input className="ops-settings-input" type={type} value={current} onChange={(event) => setCurrent(event.target.value)} />
    </label>
  );
}

export default function PlatformSettingsPage() {
  const [activeSection, setActiveSection] = useState('configuration');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const ActiveIcon = sections.find((section) => section.id === activeSection)?.icon ?? ShieldCheck;

  return (
    <div className="ops-settings-page">
      <div className="ops-section-header">
        <div>
          <h1 className="ops-section-title">Platform Settings</h1>
          <p className="ops-section-subtitle">Governance controls for marketplace rules, payments, security, and operating policies.</p>
        </div>
        <button className="ops-primary-action"><Save className="w-4 h-4" /> Save Changes</button>
      </div>

      <div className="ops-settings-layout">
        <aside className="ops-settings-nav">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button key={section.id} className={activeSection === section.id ? 'active' : ''} onClick={() => setActiveSection(section.id)}>
                <Icon className="w-4 h-4" />
                {section.title}
              </button>
            );
          })}
        </aside>

        <section className="ops-settings-panel">
          <div className="ops-settings-panel-header">
            <ActiveIcon className="w-5 h-5" />
            <div>
              <h2>{sections.find((section) => section.id === activeSection)?.title}</h2>
              <p>Changes are audit logged and applied through the shared operations configuration layer.</p>
            </div>
          </div>

          {activeSection === 'configuration' ? (
            <div className="ops-settings-grid">
              <Field label="Platform Name" value="CustomTolerance" />
              <Field label="Domain" value="customtolerance.com" />
              <Field label="Support Email" value="support@customtolerance.com" type="email" />
              <Field label="Support Phone" value="+91 98765 43210" />
              <Field label="Business Address" value="Ahmedabad, Gujarat, India" />
              <Field label="GST Number" value="24AAACC0000A1Z5" />
              <label className="ops-settings-field">
                <span>Timezone</span>
                <EnterpriseSelect
                  value={timezone}
                  onValueChange={setTimezone}
                  options={[
                    { label: 'Asia/Kolkata', value: 'Asia/Kolkata' },
                    { label: 'UTC', value: 'UTC' },
                  ]}
                  ariaLabel="Timezone"
                />
              </label>
              <Toggle label="Maintenance Mode" description="Temporarily restrict public marketplace access." />
            </div>
          ) : null}

          {activeSection === 'rules' ? (
            <div className="ops-settings-stack">
              <Toggle label="Auto Approve Listings" description="Allow low-risk suppliers to publish without moderator approval." />
              <Toggle label="Require GST Verification" description="Block supplier verification until GST is approved." defaultChecked />
              <Toggle label="Require Supplier Profile Completion" description="Require profile completion before quote submission." defaultChecked />
              <Toggle label="RFQ Moderation Rules" description="Route suspicious RFQs into moderation before supplier distribution." defaultChecked />
              <Toggle label="Review Moderation Rules" description="Hold reported reviews for trust team resolution." defaultChecked />
            </div>
          ) : null}

          {activeSection === 'notifications' ? (
            <div className="ops-settings-stack">
              <Toggle label="Email Notifications" description="Send operational alerts and workflow updates by email." defaultChecked />
              <Toggle label="WhatsApp Notifications" description="Send supplier and buyer workflow messages through WhatsApp." defaultChecked />
              <Toggle label="SMS Notifications" description="Use SMS for OTPs and critical escalation alerts." />
              <Toggle label="Push Notifications" description="Send browser push notifications for operations work queues." />
            </div>
          ) : null}

          {activeSection === 'payments' ? (
            <div className="ops-settings-grid">
              <Toggle label="Razorpay Enabled" description="Accept subscription and marketplace payments through Razorpay." defaultChecked />
              <Toggle label="Subscriptions Enabled" description="Allow paid supplier plans and renewals." defaultChecked />
              <Field label="Commission %" value="3.5" type="number" />
              <Toggle label="Escrow Rules" description="Hold enterprise procurement payments until delivery confirmation." />
            </div>
          ) : null}

          {activeSection === 'security' ? (
            <div className="ops-settings-grid">
              <Toggle label="Admin 2FA" description="Require 2FA for admin and superadmin sessions." defaultChecked />
              <Field label="Session Timeout (minutes)" value="60" type="number" />
              <Toggle label="Strict Login Policies" description="Throttle suspicious login patterns and impossible travel." defaultChecked />
              <Toggle label="Admin Restrictions" description="Restrict destructive actions to senior admin roles." defaultChecked />
              <Toggle label="IP Restrictions" description="Allow admin access only from approved network ranges." />
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
