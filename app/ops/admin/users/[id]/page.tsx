'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function AdminUserProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [payload, setPayload] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/users/${params.id}`, { credentials: 'include' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error?.message || 'Could not load user');
        setPayload(result.data);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not load user'));
  }, [params.id]);

  if (error) return <div className="ops-panel ops-panel-body">{error}</div>;
  if (!payload) return <div className="ops-panel ops-panel-body">Loading user...</div>;

  const user = payload.user;
  return (
    <div className="ops-users-page">
      <button className="ops-icon-btn" onClick={() => router.back()}>Back</button>
      <div className="ops-section-header">
        <div><h1 className="ops-section-title">{user.fullName || user.email || 'User'}</h1><p className="ops-section-subtitle">{user.email}</p></div>
      </div>
      <div className="ops-panel ops-panel-body">
        <p><strong>Role:</strong> {payload.role}</p>
        <p><strong>Account:</strong> {payload.accountStatus}</p>
        <p><strong>Enforcement:</strong> {payload.enforcementStatus}</p>
        <p><strong>Verification:</strong> {payload.verificationStatus}</p>
        <p><strong>Profile:</strong> {payload.profileStatus}</p>
        <p><strong>Joined:</strong> {new Date(user.createdAt).toLocaleString()}</p>
      </div>
      {payload.sellerProfile ? <div className="ops-panel ops-panel-body"><h2>Seller Profile</h2><p>{String(payload.sellerProfile.company_name || 'Company not provided')}</p></div> : null}
      {payload.buyerProfile ? <div className="ops-panel ops-panel-body"><h2>Buyer Profile</h2><p>Buyer profile is linked to this account.</p></div> : null}
      <button className="ops-primary-action" onClick={() => router.push(`/ops/admin/users/${params.id}/activity`)}>View Activity</button>
    </div>
  );
}