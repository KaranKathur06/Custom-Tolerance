'use client';

import { useState } from 'react';
import { Circle, CheckCircle2, Clock, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const priorityColors: Record<string, string> = {
  HIGH: 'var(--ops-danger)', 
  MEDIUM: 'var(--ops-warning)', 
  LOW: 'var(--ops-info)',
  URGENT: 'var(--ops-danger)'
};

export function TasksClient({ initialTasks, totalCount }: { initialTasks: any[], totalCount: number }) {
  const [tasks, setTasks] = useState(initialTasks);
  
  const toggle = (id: string) => {
    // Optimistic UI update
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, status: t.status === 'DONE' ? 'TODO' : 'DONE' };
      }
      return t;
    }));
    // In a real app we'd dispatch an API call to update task status here.
  };

  const pending = tasks.filter(t => t.status !== 'DONE');
  const completed = tasks.filter(t => t.status === 'DONE');

  return (
    <div>
      <div className="ops-section-header">
        <div>
          <h1 className="ops-section-title">Tasks & Activities</h1>
          <p className="ops-section-subtitle">{pending.length} pending · {completed.length} completed</p>
          <div className="text-xs text-ops-text-muted mt-1">Live Projection View</div>
        </div>
        <button style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
          borderRadius: 8, border: 'none', background: 'var(--ops-accent-crm)',
          color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}><Plus className="w-4 h-4" /> Add Task</button>
      </div>

      <div className="ops-panel" style={{ marginBottom: 16 }}>
        <div className="ops-panel-header"><div className="ops-panel-title">Pending ({pending.length})</div></div>
        <div className="ops-panel-body" style={{ padding: 0 }}>
          {pending.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--ops-text-muted)' }}>No pending tasks.</div>
          ) : pending.map(task => (
            <div key={task.id} style={{
              padding: '12px 20px', borderBottom: '1px solid var(--ops-border)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <button onClick={() => toggle(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <Circle className="w-5 h-5" style={{ color: 'var(--ops-border-light)' }} />
              </button>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ops-text)', margin: 0 }}>{task.title}</p>
                <p style={{ fontSize: 11, color: 'var(--ops-text-muted)', margin: '2px 0 0' }}>
                  {task.assigned?.full_name || 'Unassigned'} 
                  {task.due_date && (
                    <>
                      {' · '}<Clock className="w-3 h-3" style={{ display: 'inline', verticalAlign: '-2px' }} /> 
                      {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
                    </>
                  )}
                </p>
              </div>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: priorityColors[task.priority] || 'var(--ops-info)',
              }} title={task.priority} />
            </div>
          ))}
        </div>
      </div>

      {completed.length > 0 && (
        <div className="ops-panel">
          <div className="ops-panel-header"><div className="ops-panel-title" style={{ color: 'var(--ops-text-muted)' }}>Completed ({completed.length})</div></div>
          <div className="ops-panel-body" style={{ padding: 0 }}>
            {completed.map(task => (
              <div key={task.id} style={{
                padding: '12px 20px', borderBottom: '1px solid var(--ops-border)',
                display: 'flex', alignItems: 'center', gap: 12, opacity: 0.5,
              }}>
                <button onClick={() => toggle(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--ops-success)' }} />
                </button>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: 'var(--ops-text-muted)', margin: 0, textDecoration: 'line-through' }}>{task.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
