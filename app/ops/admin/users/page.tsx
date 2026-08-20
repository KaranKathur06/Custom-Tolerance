'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Ban,
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  KeyRound,
  LogOut,
  Mail,
  MoreVertical,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
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

type Confirmation = {
  title: string;
  description: string;
  confirmLabel: string;
  requiresTypedConfirmation?: boolean;
  severity?: 'warning' | 'danger' | 'critical';
  run: () => void;
};

const roles = [
  'Buyer',
  'Seller',
  'Moderator',
  'Support Agent',
  'Supplier Success',
  'Finance',
  'Marketing',
  'Admin',
  'Super Admin',
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
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [confirmationText, setConfirmationText] = useState('');
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

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

      setTotalPages(Math.max(1, payload.meta?.totalPages ?? 1));

      const rows = (payload.data ?? []) as Array<{
        id: string;
        full_name: string;
        email: string;
        role: string;
        verification_status: string;
        enforcement_status: 'normal' | 'suspended' | 'banned';
        company_name?: string | null;
        created_at: string;
        last_login?: string | null;
      }>;

      setUsers(
        rows.map((u) => {
          const company = (u.company_name || '').toString();
          const email = (u.email || '').toString();
          const name = (u.full_name || email || 'Unknown user').toString();
          const verificationStatus = (u.verification_status || 'pending').toString().toLowerCase();
          const displayStatus: UserRow['status'] = u.enforcement_status === 'suspended'
            ? 'Suspended'
            : u.enforcement_status === 'banned'
              ? 'Banned'
              : 'Active';
          const displayKyc: UserRow['kyc'] = verificationStatus === 'verified'
            ? 'Verified'
            : verificationStatus === 'rejected'
              ? 'Rejected'
              : 'Pending';

          return {
            id: u.id,
            name,
            email: email || 'No email available',
            role: u.role.toLowerCase().replaceAll('_', ' '),
            status: displayStatus,
            kyc: displayKyc,
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

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const filtered = useMemo(
    () =>
      users.filter((user) => {
        const needle = `${user.name} ${user.email} ${user.company}`.toLowerCase();
        if (search && !needle.includes(search.toLowerCase())) return false;
        if (roleFilter !== 'all' && user.role.toLowerCase() !== roleFilter.toLowerCase()) return false;
        if (statusFilter !== 'all' && user.status !== statusFilter) return false;
        return true;
      }),
    [roleFilter, search, statusFilter, users],
  );

  const pageButtons = useMemo(() => {
    const pages: Array<number | 'ellipsis'> = [];
    if (totalPages <= 5) {
      for (let index = 1; index <= totalPages; index += 1) {
        pages.push(index);
      }
    } else {
      pages.push(1);
      if (page > 3) {
        pages.push('ellipsis');
      }
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let index = start; index <= end; index += 1) {
        if (index > 1 && index < totalPages) {
          pages.push(index);
        }
      }
      if (page < totalPages - 2) {
        pages.push('ellipsis');
      }
      pages.push(totalPages);
    }
    return pages;
  }, [page, totalPages]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  }

  function askForConfirmation(next: Confirmation) {
    setConfirmationText('');
    setConfirmation(next);
  }

  function confirmPendingAction() {
    if (!confirmation) return;
    if (confirmation.requiresTypedConfirmation && confirmationText !== 'DELETE') return;
    confirmation.run();
    setConfirmation(null);
  }

  function actionIsAvailable(label: string, user: UserRow) {
    if (label === 'Suspend') return user.status === 'Active';
    if (label === 'Unsuspend') return user.status === 'Suspended';
    if (label === 'Ban') return user.status !== 'Banned';
    if (label === 'Unban') return user.status === 'Banned';
    if (label === 'Verify Account') return user.kyc !== 'Verified';
    if (label === 'Reject Verification') return user.kyc === 'Pending';
    return true;
  }

  function updateUser(id: string, patch: Partial<UserRow>, message: string, eventName: OpsEventName = 'user.status_changed') {
    void performUserAction(id, patch, message, eventName);
  }

  async function performUserAction(id: string, patch: Partial<UserRow>, message: string, eventName: OpsEventName = 'user.status_changed') {
    const user = users.find((item) => item.id === id);
    if (!user) return;
    const action = patch.role ? 'role' : patch.kyc ? 'verification' : 'status';
    const value = patch.role
      ? patch.role.toLowerCase().replaceAll(' ', '_')
      : patch.kyc === 'Verified'
        ? 'verified'
        : patch.kyc === 'Rejected'
          ? 'rejected'
          : patch.status?.toLowerCase() === 'active'
            ? 'normal'
            : patch.status?.toLowerCase();
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: id, action, value }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.success) {
      notify(payload?.error?.message || 'User action failed');
      return;
    }
    setUsers((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    setOpenMenu(null);
    publishOpsEvent(eventName, { entityId: id, message, metadata: patch as Record<string, string | number | boolean> });
    notify(message);
  }

  async function removeUser(id: string) {
    const res = await fetch('/api/admin/users', { method: 'PATCH', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId: id, action: 'delete' }) });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.success) return notify(payload?.error?.message || 'Delete failed');
    setUsers((current) => current.filter((user) => user.id !== id));
    setOpenMenu(null);
    notify('User deleted from governance queue');
  }

  async function sendUserNotification(user: UserRow) {
    const message = window.prompt(`Message for ${user.name}`);
    if (!message?.trim()) return;
    const res = await fetch('/api/admin/users', { method: 'PATCH', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId: user.id, action: 'notify', message }) });
    const payload = await res.json().catch(() => null);
    notify(res.ok && payload?.success ? `Notification sent to ${user.name}` : payload?.error?.message || 'Notification failed');
  }

  async function resetPassword(user: UserRow) {
    const res = await fetch('/api/admin/users', { method: 'PATCH', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId: user.id, action: 'reset_password' }) });
    const payload = await res.json().catch(() => null);
    notify(res.ok && payload?.success ? `Password reset sent to ${user.email}` : payload?.error?.message || 'Password reset failed');
  }

  async function forceLogout(user: UserRow) {
    const res = await fetch('/api/admin/users', { method: 'PATCH', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId: user.id, action: 'force_logout' }) });
    const payload = await res.json().catch(() => null);
    notify(res.ok && payload?.success ? `${user.name} sessions revoked` : payload?.error?.message || 'Logout failed');
  }

  async function inviteUser() {
    const email = window.prompt('Invite email address');
    if (!email?.trim()) return;
    const res = await fetch('/api/admin/users', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
    const payload = await res.json().catch(() => null);
    notify(res.ok && payload?.success ? `Invitation sent to ${email}` : payload?.error?.message || 'Invitation failed');
  }

  function exportUsers() {
    const header = 'Name,Email,Role,Status,Verification,Company,Last Login';
    const lines = users.map((user) => [user.name, user.email, user.role, user.status, user.kyc, user.company, user.lastLogin].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','));
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'users.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const actionGroups: UserActionGroup[] = [
    {
      label: 'Information',
      actions: [
        { label: 'View Profile', icon: Eye, run: (u: UserRow) => router.push(`/ops/admin/users/${u.id}`) },
        { label: 'View Activity', icon: Shield, run: (u: UserRow) => router.push(`/ops/admin/users/${u.id}/activity`) },
      ],
    },
    {
      label: 'Management',
      actions: [
        { label: 'Change Role', icon: UserCog, run: (u: UserRow) => setRoleModalUser(u) },
        { label: 'Send Notification', icon: Bell, run: (u: UserRow) => void sendUserNotification(u) },
      ],
    },
    {
      label: 'Access Control',
      actions: [
        { label: 'Suspend', icon: Shield, run: (u: UserRow) => askForConfirmation({ title: 'Suspend User', description: `This will prevent ${u.name} from using normal marketplace functionality until restored.`, confirmLabel: 'Suspend User', severity: 'danger', run: () => updateUser(u.id, { status: 'Suspended' }, `${u.name} suspended`) }) },
        { label: 'Unsuspend', icon: CheckCircle2, run: (u: UserRow) => askForConfirmation({ title: 'Unsuspend User', description: `Restore normal marketplace access for ${u.name}.`, confirmLabel: 'Unsuspend User', severity: 'warning', run: () => updateUser(u.id, { status: 'Active' }, `${u.name} restored`) }) },
        { label: 'Force Logout', icon: LogOut, run: (u: UserRow) => askForConfirmation({ title: 'Force Logout', description: `All active sessions for ${u.name} will be revoked. They will need to sign in again.`, confirmLabel: 'Force Logout', severity: 'warning', run: () => void forceLogout(u) }) },
        { label: 'Reset Password', icon: KeyRound, run: (u: UserRow) => askForConfirmation({ title: 'Reset Password', description: `${u.name} will receive a secure password reset link. No password is shown to administrators.`, confirmLabel: 'Send Reset Link', severity: 'danger', run: () => void resetPassword(u) }) },
        { label: 'Verify Account', icon: ShieldCheck, run: (u: UserRow) => askForConfirmation({ title: 'Verify Account', description: `Change the verification state for ${u.name}. This decision will be recorded in the audit trail.`, confirmLabel: 'Verify Account', severity: 'warning', run: () => updateUser(u.id, { kyc: 'Verified' }, `${u.name} verified`, 'user.verification_changed') }) },
        { label: 'Reject Verification', icon: UserX, run: (u: UserRow) => askForConfirmation({ title: 'Reject Verification', description: `Reject the current verification request for ${u.name}. This decision will be recorded in the audit trail.`, confirmLabel: 'Reject Verification', severity: 'danger', run: () => updateUser(u.id, { kyc: 'Rejected' }, `${u.name} verification rejected`, 'user.verification_changed') }) },
      ],
    },
    {
      label: 'Enforcement',
      danger: true,
      actions: [
        { label: 'Ban', icon: Ban, run: (u: UserRow) => askForConfirmation({ title: 'Ban User', description: `This is a stronger enforcement action that blocks ${u.name} from the platform.`, confirmLabel: 'Ban User', severity: 'critical', run: () => updateUser(u.id, { status: 'Banned' }, `${u.name} banned`) }) },
        { label: 'Unban', icon: ShieldCheck, run: (u: UserRow) => askForConfirmation({ title: 'Unban User', description: `Remove the ban from ${u.name}. Independent suspension state is preserved by the server.`, confirmLabel: 'Unban User', severity: 'warning', run: () => updateUser(u.id, { status: 'Active' }, `${u.name} unbanned`) }) },
        { label: 'Delete User', icon: Trash2, danger: true, run: (u: UserRow) => askForConfirmation({ title: 'Delete User', description: `This soft-deletes ${u.name} and removes the account from the governance queue. This cannot be undone from this screen.`, confirmLabel: 'Delete User', severity: 'critical', requiresTypedConfirmation: true, run: () => void removeUser(u.id) }) },
      ],
    },
  ];

  return (
    <div className="ops-users-page">
      {toast ? <div className="ops-toast">{toast}</div> : null}

      {confirmation ? (
        <div className="ops-modal-backdrop" role="dialog" aria-modal="true">
          <div className={`ops-role-modal ops-confirmation-modal ${confirmation.severity ? `severity-${confirmation.severity}` : ''}`}>
            <div className="ops-modal-header"><div><h2>{confirmation.title}</h2><p>{confirmation.description}</p></div><button className="ops-icon-btn" onClick={() => setConfirmation(null)}>×</button></div>
            <div className="ops-confirmation-caution"><strong>Administrative caution</strong><span>Confirm only after reviewing the selected user&apos;s current state. This action will be audit logged.</span></div>
            {confirmation.requiresTypedConfirmation ? <label className="ops-confirmation-field"><span>Type DELETE to continue</span><input value={confirmationText} onChange={(event) => setConfirmationText(event.target.value)} placeholder="DELETE" aria-label="Type DELETE to confirm" autoFocus /></label> : null}
            <div className="ops-confirmation-footer"><button className="ops-text-action" onClick={() => setConfirmation(null)}>Cancel</button><button className={`ops-confirm-button ${confirmation.severity || 'warning'}`} disabled={confirmation.requiresTypedConfirmation && confirmationText !== 'DELETE'} onClick={confirmPendingAction}>{confirmation.confirmLabel}</button></div>
          </div>
        </div>
      ) : null}

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
          <button className="ops-icon-btn ops-action-square" title="Export users" onClick={exportUsers}><Download className="w-4 h-4" /></button>
          <button className="ops-primary-action" onClick={() => void inviteUser()}><UserPlus className="w-4 h-4" /> Invite User</button>
        </div>
      </div>
      <div className="ops-panel ops-readonly-banner" style={{ marginBottom: 16 }}>
        <div className="ops-panel-body">
          <p className="text-sm text-slate-500">User governance actions require the appropriate administrative permission.</p>
        </div>
      </div>

      <div className="ops-panel ops-users-table-panel">
        {error ? (
          <div className="ops-panel-body" style={{ padding: 16, color: '#f04545', background: 'rgba(248,113,113,0.1)', borderRadius: 12, marginBottom: 16 }}>
            <strong>Unable to load users:</strong> {error}
          </div>
        ) : null}

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
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'var(--ops-text-muted)' }}>
                    Loading users…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'var(--ops-text-muted)' }}>
                    {error ? 'Unable to load users.' : 'No users found in the governance directory.'}
                  </td>
                </tr>
              ) : filtered.map((user) => (
                <tr key={user.id}>
                  <td className="ops-user-cell">
                    <div className="ops-user-avatar">{user.name.charAt(0).toUpperCase()}</div>
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
                      <button className="ops-icon-btn ops-action-square" title="View profile" onClick={() => router.push(`/ops/admin/users/${user.id}`)}><Eye className="w-4 h-4" /></button>
                      <button className="ops-icon-btn ops-action-square" title="Send notification" onClick={() => void sendUserNotification(user)}><Mail className="w-4 h-4" /></button>
                      <div className="ops-action-menu-wrap">
                        <button className="ops-icon-btn ops-action-square" title="More actions" onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}>
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openMenu === user.id ? (
                          <div className="ops-action-menu">
                            {actionGroups.map((group) => (
                              <div key={group.label} className={`ops-action-menu-section ${group.danger ? 'danger-zone' : ''}`}>
                                <div className="ops-action-menu-label">{group.label}</div>
                                {group.actions.filter((action) => actionIsAvailable(action.label, user)).map((action) => {
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
          <span>Page {page} of {totalPages} — showing {filtered.length} of {users.length} users</span>
          <div>
            <button
              className="ops-icon-btn"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {pageButtons.map((pageButton, index) =>
              pageButton === 'ellipsis' ? (
                <span key={`ellipsis-${index}`} className="ops-pagination-ellipsis">…</span>
              ) : (
                <button
                  key={pageButton}
                  className={`ops-icon-btn ${page === pageButton ? 'active-page' : ''}`}
                  onClick={() => setPage(pageButton)}
                  disabled={page === pageButton}
                >
                  {pageButton}
                </button>
              ),
            )}
            <button
              className="ops-icon-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
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
