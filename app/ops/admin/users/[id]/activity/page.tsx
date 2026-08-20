'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function AdminUserActivityPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [payload, setPayload] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/users/${params.id}/activity`, { credentials: 'include' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error?.message || 'Could not load activity');
        setPayload(result.data);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not load activity'));
  }, [params.id]);

  if (error) return <div className="ops-panel ops-panel-body">{error}</div>;
  if (!payload) return <div className="ops-panel ops-panel-body">Loading activity...</div>;

  return (
    <div className="ops-users-page">
      <button className="ops-icon-btn" onClick={() => router.push(`/ops/admin/users/${params.id}`)}>Profile</button>
      <div className="ops-section-header"><h1 className="ops-section-title">Activity</h1></div>
      <div className="ops-panel ops-panel-body">
        {payload.events.length === 0 ? <p>No recorded administrative activity.</p> : payload.events.map((event: any) => (
          <div key={event.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--ops-border)' }}>
            <strong>{event.action}</strong><div>{new Date(event.created_at).toLocaleString()}</div>
            {event.details ? <pre>{JSON.stringify(event.details, null, 2)}</pre> : null}
          </div>
        ))}
      </div>
    </div>
  );
}