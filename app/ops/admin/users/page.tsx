'use client';

import { useMemo, useState } from 'react';
import {
  Ban,
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  KeyRound,
  LogOut,
  Mail,
  MoreVertical,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserCog,
  UserPlus,
  UserX,
} from 'lucide-react';
import { StatusBadge } from '@/components/ops/shared/StatusBadge';

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Suspended' | 'Banned';
  kyc: 'Verified' | 'Pending' | 'Rejected';
  company: string;
  joined: string;
  lastLogin: string;
  risk: number;
};

const roles = [
  'Buyer',
  'Seller',
  'Moderator',
  'Verification Officer',
  'Support Agent',
  'Finance Manager',
  'Admin',
  'Superadmin',
];

const initialUsers: UserRow[] = [
  { id: 'U-001', name: 'Rajesh Kumar', email: 'rajesh@tatasteel.com', role: 'Seller', status: 'Active', kyc: 'Verified', company: 'Tata Steel Traders', joined: '2025-12-10', lastLogin: '2 hrs ago', risk: 12 },
  { id: 'U-002', name: 'Priya Sharma', email: 'priya@hindalco.com', role: 'Buyer', status: 'Active', kyc: 'Verified', company: 'Hindalco Exports', joined: '2026-01-05', lastLogin: '30 min ago', risk: 8 },
  { id: 'U-003', name: 'Amit Patel', email: 'amit@jswsteel.in', role: 'Seller', status: 'Suspended', kyc: 'Pending', company: 'JSW Steel Group', joined: '2026-02-15', lastLogin: '3 days ago', risk: 74 },
  { id: 'U-004', name: 'Neha Gupta', email: 'neha@vedanta.com', role: 'Buyer', status: 'Active', kyc: 'Rejected', company: 'Vedanta Metals', joined: '2026-03-01', lastLogin: '1 day ago', risk: 39 },
  { id: 'U-005', name: 'Vikram Singh', email: 'vikram@sailsteel.com', role: 'Seller', status: 'Active', kyc: 'Verified', company: 'SAIL Distributors', joined: '2026-03-20', lastLogin: '5 hrs ago', risk: 18 },
  { id: 'U-006', name: 'Anita Desai', email: 'anita@birlacopper.com', role: 'Buyer', status: 'Banned', kyc: 'Verified', company: 'Birla Copper', joined: '2025-11-08', lastLogin: '2 weeks ago', risk: 92 },
  { id: 'U-007', name: 'Suresh Menon', email: 'suresh@nalco.in', role: 'Verification Officer', status: 'Active', kyc: 'Pending', company: 'NALCO Trading', joined: '2026-04-10', lastLogin: '1 hr ago', risk: 24 },
  { id: 'U-008', name: 'Kavita Reddy', email: 'kavita@essar.com', role: 'Finance Manager', status: 'Active', kyc: 'Verified', company: 'Essar Steel', joined: '2026-04-22', lastLogin: '45 min ago', risk: 11 },
];

export default function UsersPage() {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [roleModalUser, setRoleModalUser] = useState<UserRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => users.filter((user) => {
    const needle = `${user.name} ${user.email} ${user.company}`.toLowerCase();
    if (search && !needle.includes(search.toLowerCase())) return false;
    if (roleFilter !== 'all' && user.role !== roleFilter) return false;
    if (statusFilter !== 'all' && user.status !== statusFilter) return false;
    return true;
  }), [roleFilter, search, statusFilter, users]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  }

  function updateUser(id: string, patch: Partial<UserRow>, message: string) {
    setUsers((current) => current.map((user) => (user.id === id ? { ...user, ...patch } : user)));
    setOpenMenu(null);
    notify(message);
  }

  function removeUser(id: string) {
    setUsers((current) => current.filter((user) => user.id !== id));
    setOpenMenu(null);
    notify('User deleted from governance queue');
  }

  const primaryActions = [
    { label: 'View Profile', icon: Eye, run: (u: UserRow) => notify(`Opening profile for ${u.name}`) },
    { label: 'View Activity', icon: Shield, run: (u: UserRow) => notify(`Opening activity trail for ${u.name}`) },
    { label: 'Edit User', icon: Edit3, run: (u: UserRow) => notify(`Editing ${u.name}`) },
    { label: 'Change Role', icon: UserCog, run: (u: UserRow) => setRoleModalUser(u) },
    { label: 'Send Notification', icon: Bell, run: (u: UserRow) => notify(`Notification queued for ${u.name}`) },
  ];

  const governanceActions = [
    { label: 'Promote', icon: UserCheck, run: (u: UserRow) => setRoleModalUser(u) },
    { label: 'Demote', icon: UserX, run: (u: UserRow) => setRoleModalUser(u) },
    { label: 'Suspend', icon: Shield, run: (u: UserRow) => updateUser(u.id, { status: 'Suspended' }, `${u.name} suspended`) },
    { label: 'Unsuspend', icon: CheckCircle2, run: (u: UserRow) => updateUser(u.id, { status: 'Active' }, `${u.name} restored`) },
    { label: 'Ban', icon: Ban, run: (u: UserRow) => updateUser(u.id, { status: 'Banned' }, `${u.name} banned`) },
    { label: 'Unban', icon: ShieldCheck, run: (u: UserRow) => updateUser(u.id, { status: 'Active' }, `${u.name} unbanned`) },
    { label: 'Reset Password', icon: KeyRound, run: (u: UserRow) => notify(`Password reset sent to ${u.email}`) },
    { label: 'Force Logout', icon: LogOut, run: (u: UserRow) => notify(`${u.name} will be logged out on next request`) },
    { label: 'Verify Account', icon: ShieldCheck, run: (u: UserRow) => updateUser(u.id, { kyc: 'Verified' }, `${u.name} verified`) },
    { label: 'Reject Verification', icon: UserX, run: (u: UserRow) => updateUser(u.id, { kyc: 'Rejected' }, `${u.name} verification rejected`) },
    { label: 'Impersonate User', icon: UserCog, run: (u: UserRow) => notify(`Impersonation request logged for ${u.name}`) },
    { label: 'Delete', icon: Trash2, danger: true, run: (u: UserRow) => removeUser(u.id) },
  ];

  return (
    <div className="ops-users-page">
      {toast ? <div className="ops-toast">{toast}</div> : null}

      <div className="ops-section-header">
        <div>
          <h1 className="ops-section-title">User Governance</h1>
          <p className="ops-section-subtitle">Manage identity, roles, verification, sessions, and enforcement workflows.</p>
        </div>
        <div className="ops-toolbar-actions">
          <button className="ops-icon-btn" title="Export users"><Download className="w-4 h-4" /></button>
          <button className="ops-primary-action"><UserPlus className="w-4 h-4" /> Invite User</button>
        </div>
      </div>

      <div className="ops-user-filters">
        <label className="ops-filter-search">
          <Search className="w-4 h-4" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, company" />
        </label>
        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
          <option value="all">All roles</option>
          {roles.map((role) => <option key={role} value={role}>{role}</option>)}
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All status</option>
          <option value="Active">Active</option>
          <option value="Suspended">Suspended</option>
          <option value="Banned">Banned</option>
        </select>
      </div>

      <div className="ops-panel ops-users-table-panel">
        <div className="ops-table-scroll">
          <table className="ops-users-table">
            <thead>
              <tr>
                {['User', 'Role', 'Status', 'Verification', 'Company', 'Risk', 'Last Login', 'Actions'].map((heading) => (
                  <th key={heading}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td className="ops-user-cell">
                    <div className="ops-user-avatar">{user.name[0]}</div>
                    <div>
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
                  </td>
                  <td><span className="ops-role-chip">{user.role}</span></td>
                  <td><StatusBadge status={user.status} /></td>
                  <td><StatusBadge status={user.kyc} /></td>
                  <td className="ops-muted-cell">{user.company}</td>
                  <td><span className={`ops-risk-score ${user.risk > 70 ? 'danger' : user.risk > 35 ? 'warning' : 'safe'}`}>{user.risk}</span></td>
                  <td className="ops-muted-cell">{user.lastLogin}</td>
                  <td>
                    <div className="ops-row-actions">
                      <button className="ops-icon-btn" title="View Profile" onClick={() => notify(`Opening profile for ${user.name}`)}><Eye className="w-4 h-4" /></button>
                      <button className="ops-icon-btn" title="Send Notification" onClick={() => notify(`Notification queued for ${user.name}`)}><Mail className="w-4 h-4" /></button>
                      <div className="ops-action-menu-wrap">
                        <button className="ops-icon-btn" title="More actions" onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}>
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openMenu === user.id ? (
                          <div className="ops-action-menu">
                            <div className="ops-action-menu-section">
                              {primaryActions.map((action) => {
                                const Icon = action.icon;
                                return <button key={action.label} onClick={() => action.run(user)}><Icon className="w-4 h-4" /> {action.label}</button>;
                              })}
                            </div>
                            <div className="ops-action-menu-section">
                              {governanceActions.map((action) => {
                                const Icon = action.icon;
                                return (
                                  <button key={action.label} className={action.danger ? 'danger' : ''} onClick={() => action.run(user)}>
                                    <Icon className="w-4 h-4" /> {action.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ops-table-footer">
          <span>Showing {filtered.length} of {users.length} users</span>
          <div>
            <button className="ops-icon-btn"><ChevronLeft className="w-4 h-4" /></button>
            <button className="ops-icon-btn active-page">1</button>
            <button className="ops-icon-btn">2</button>
            <button className="ops-icon-btn">3</button>
            <button className="ops-icon-btn"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {roleModalUser ? (
        <div className="ops-modal-backdrop" role="dialog" aria-modal="true">
          <div className="ops-role-modal">
            <div className="ops-modal-header">
              <div>
                <h2>Change Role</h2>
                <p>{roleModalUser.name} · {roleModalUser.email}</p>
              </div>
              <button className="ops-icon-btn" onClick={() => setRoleModalUser(null)}>×</button>
            </div>
            <div className="ops-role-grid">
              {roles.map((role) => (
                <button
                  key={role}
                  className={roleModalUser.role === role ? 'selected' : ''}
                  onClick={() => {
                    updateUser(roleModalUser.id, { role }, `${roleModalUser.name} role changed to ${role}`);
                    setRoleModalUser(null);
                  }}
                >
                  <strong>{role}</strong>
                  <span>{role === 'Superadmin' ? 'All permissions' : role === 'Admin' ? 'Assigned admin permissions' : 'Scoped workspace access'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
