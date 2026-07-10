'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  type LucideIcon,
} from 'lucide-react';
import { StatusBadge } from '@/components/ops/shared/StatusBadge';
import { publishOpsEvent, type OpsEventName } from '@/lib/ops/event-layer';
import { EnterpriseSelect } from '@/components/ui/EnterpriseSelect';

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

type UserAction = {
  label: string;
  icon: LucideIcon;
  danger?: boolean;
  run: (user: UserRow) => void;
};

type UserActionGroup = {
  label: string;
  danger?: boolean;
  actions: UserAction[];
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

const roleOptions = [
  { label: 'All roles', value: 'all' },
  ...roles.map((role) => ({ label: role, value: role })),
];

const statusOptions = [
  { label: 'All status', value: 'all' },
  { label: 'Active', value: 'Active' },
  { label: 'Suspended', value: 'Suspended' },
  { label: 'Banned', value: 'Banned' },
];

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [roleModalUser, setRoleModalUser] = useState<UserRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/admin/users?${params.toString()}`, { credentials: 'include' });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.error?.message || 'Failed to load users');
      }

      const rows = (payload.data ?? []) as Array<{
        id: string;
        full_name: string;
        email: string;
        role: string;
        verification_status: string;
        seller_profiles?: Array<{ company_name: string | null }> | { company_name: string | null } | null;
        buyer_profiles?: Array<{ company_name: string | null }> | { company_name: string | null } | null;
        created_at: string;
        last_login?: string | null;
      }>;

      setUsers(
        rows.map((u) => {
          const companyFromSeller = Array.isArray(u.seller_profiles)
            ? u.seller_profiles[0]?.company_name
            : (u.seller_profiles as any)?.company_name;
          const companyFromBuyer = Array.isArray(u.buyer_profiles)
            ? u.buyer_profiles[0]?.company_name
            : (u.buyer_profiles as any)?.company_name;

          const company = (companyFromSeller ?? companyFromBuyer ?? '').toString();

          return {
            id: u.id,
            name: u.full_name,
            email: u.email,
            role: u.role,
            status: u.verification_status === 'verified' ? 'Active' : (u.verification_status as any),
            kyc: u.verification_status === 'verified' ? 'Verified' : (u.verification_status as any),
            company,
            joined: u.created_at,
            lastLogin: (u as any).last_login ?? '',
            risk: 0,
          } satisfies UserRow;
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersStable = useCallback(fetchUsers, [page, limit, roleFilter, statusFilter, search]);

  useEffect(() => {
    void fetchUsersStable();
  }, [fetchUsersStable]);

  // NOTE: we intentionally keep mutations out until backend ops routes are implemented.


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

  function updateUser(id: string, patch: Partial<UserRow>, message: string, eventName: OpsEventName = 'user.status_changed') {
    setUsers((current) => current.map((user) => (user.id === id ? { ...user, ...patch } : user)));
    setOpenMenu(null);
    publishOpsEvent(eventName, { entityId: id, message, metadata: patch as Record<string, string | number | boolean> });
    notify(message);
  }

  function removeUser(id: string) {
    setUsers((current) => current.filter((user) => user.id !== id));
    setOpenMenu(null);
    publishOpsEvent('user.status_changed', { entityId: id, message: 'User deleted from governance queue' });
    notify('User deleted from governance queue');
  }

  const actionGroups: UserActionGroup[] = [
    {
      label: 'Information',
      actions: [
        { label: 'View Profile', icon: Eye, run: (u: UserRow) => notify(`Opening profile for ${u.name}`) },
        { label: 'View Activity', icon: Shield, run: (u: UserRow) => notify(`Opening activity trail for ${u.name}`) },
      ],
    },
    {
      label: 'Management',
      actions: [
        { label: 'Edit User', icon: Edit3, run: (u: UserRow) => notify(`Editing ${u.name}`) },
        { label: 'Change Role', icon: UserCog, run: (u: UserRow) => setRoleModalUser(u) },
        { label: 'Send Notification', icon: Bell, run: (u: UserRow) => {
          publishOpsEvent('user.notification_sent', { entityId: u.id, entityLabel: u.name, message: `Notification queued for ${u.name}` });
          notify(`Notification queued for ${u.name}`);
        } },
      ],
    },
    {
      label: 'Access Control',
      actions: [
        { label: 'Promote', icon: UserCheck, run: (u: UserRow) => setRoleModalUser(u) },
        { label: 'Demote', icon: UserX, run: (u: UserRow) => setRoleModalUser(u) },
        { label: 'Suspend', icon: Shield, run: (u: UserRow) => updateUser(u.id, { status: 'Suspended' }, `${u.name} suspended`) },
        { label: 'Unsuspend', icon: CheckCircle2, run: (u: UserRow) => updateUser(u.id, { status: 'Active' }, `${u.name} restored`) },
        { label: 'Force Logout', icon: LogOut, run: (u: UserRow) => notify(`${u.name} will be logged out on next request`) },
        { label: 'Reset Password', icon: KeyRound, run: (u: UserRow) => notify(`Password reset sent to ${u.email}`) },
        { label: 'Verify Account', icon: ShieldCheck, run: (u: UserRow) => updateUser(u.id, { kyc: 'Verified' }, `${u.name} verified`, 'user.verification_changed') },
        { label: 'Reject Verification', icon: UserX, run: (u: UserRow) => updateUser(u.id, { kyc: 'Rejected' }, `${u.name} verification rejected`, 'user.verification_changed') },
        { label: 'Impersonate User', icon: UserCog, run: (u: UserRow) => notify(`Impersonation request logged for ${u.name}`) },
      ],
    },
    {
      label: 'Enforcement',
      danger: true,
      actions: [
        { label: 'Ban', icon: Ban, run: (u: UserRow) => updateUser(u.id, { status: 'Banned' }, `${u.name} banned`) },
        { label: 'Unban', icon: ShieldCheck, run: (u: UserRow) => updateUser(u.id, { status: 'Active' }, `${u.name} unbanned`) },
        { label: 'Delete User', icon: Trash2, danger: true, run: (u: UserRow) => {
          if (window.confirm(`Delete ${u.name}? This action will be audit logged.`)) removeUser(u.id);
        } },
      ],
    },
  ];

  return (
    <div className="ops-users-page">
      {toast ? <div className="ops-toast">{toast}</div> : null}

      <div className="ops-section-header">
        <div>
          <h1 className="ops-section-title">User Governance</h1>
          <p className="ops-section-subtitle">Manage identity, roles, verification, sessions, and enforcement workflows.</p>
        </div>
      </div>

      <div className="ops-filter-bar">
        <label className="ops-filter-search">
          <Search className="w-4 h-4" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, company" />
        </label>
        <EnterpriseSelect value={roleFilter} onValueChange={setRoleFilter} options={roleOptions} searchable ariaLabel="Filter by role" />
        <EnterpriseSelect value={statusFilter} onValueChange={setStatusFilter} options={statusOptions} ariaLabel="Filter by status" />
        <div className="ops-filter-actions">
          <button className="ops-icon-btn ops-action-square" title="Export users"><Download className="w-4 h-4" /></button>
          <button className="ops-primary-action"><UserPlus className="w-4 h-4" /> Invite User</button>
        </div>
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
                      <button className="ops-icon-btn ops-action-square" title="View Profile" onClick={() => notify(`Opening profile for ${user.name}`)}><Eye className="w-4 h-4" /></button>
                      <button className="ops-icon-btn ops-action-square" title="Send Notification" onClick={() => {
                        publishOpsEvent('user.notification_sent', { entityId: user.id, entityLabel: user.name, message: `Notification queued for ${user.name}` });
                        notify(`Notification queued for ${user.name}`);
                      }}><Mail className="w-4 h-4" /></button>
                      <div className="ops-action-menu-wrap">
                        <button className="ops-icon-btn ops-action-square" title="More actions" onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}>
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openMenu === user.id ? (
                          <div className="ops-action-menu">
                            {actionGroups.map((group) => (
                              <div key={group.label} className={`ops-action-menu-section ${group.danger ? 'danger-zone' : ''}`}>
                                <div className="ops-action-menu-label">{group.label}</div>
                                {group.actions.map((action) => {
                                  const Icon = action.icon;
                                  return (
                                    <button key={action.label} className={action.danger ? 'danger' : ''} onClick={() => action.run(user)}>
                                      <Icon className="w-4 h-4" /> {action.label}
                                    </button>
                                  );
                                })}
                              </div>
                            ))}
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
                    updateUser(roleModalUser.id, { role }, `${roleModalUser.name} role changed to ${role}`, 'user.role_changed');
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
