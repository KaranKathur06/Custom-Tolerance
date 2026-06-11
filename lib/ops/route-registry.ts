import { adminNavItems, crmNavItems } from './nav-config';

export type OpsRouteScope = 'Admin' | 'CRM';

export interface OpsRouteRecord {
  label: string;
  description: string;
  href: string;
  scope: OpsRouteScope;
  entity: string;
  permission: string;
  dataSource: 'api' | 'client-workspace';
  api?: string;
}

export const opsRouteRegistry: OpsRouteRecord[] = [
  ...adminNavItems.map((item) => ({
    label: item.label,
    description: `${item.label} workspace`,
    href: item.href,
    scope: 'Admin' as const,
    entity: item.label,
    permission: `admin.${item.label.toLowerCase().replace(/\s+/g, '_')}`,
    dataSource: item.label === 'Command Center' ? 'api' as const : 'client-workspace' as const,
    api: item.label === 'Command Center' ? '/api/ops/admin/dashboard' : undefined,
  })),
  ...crmNavItems.map((item) => ({
    label: item.label,
    description: `${item.label} workspace`,
    href: item.href,
    scope: 'CRM' as const,
    entity: item.label,
    permission: `crm.${item.label.toLowerCase().replace(/\s+/g, '_')}`,
    dataSource: item.label === 'Command Center' ? 'api' as const : 'client-workspace' as const,
    api: item.label === 'Command Center' ? '/api/ops/crm/dashboard' : undefined,
  })),
  {
    label: 'Pending GST Verification',
    description: 'Open supplier verification queue filtered to GST reviews',
    href: '/ops/admin/verification?status=pending&type=gst',
    scope: 'Admin',
    entity: 'Verification Records',
    permission: 'admin.verification',
    dataSource: 'api',
    api: '/api/ops/verification-queue',
  },
  {
    label: 'RFQs Without Quotes',
    description: 'Open CRM pipeline filtered to active RFQs needing supplier response',
    href: '/ops/crm/pipeline?stage=active&quotes=0',
    scope: 'CRM',
    entity: 'RFQs',
    permission: 'admin.rfqs',
    dataSource: 'api',
    api: '/api/admin/rfqs',
  },
  {
    label: 'Failed Payments',
    description: 'Open finance workspace filtered to failed transactions',
    href: '/ops/admin/finance?status=failed',
    scope: 'Admin',
    entity: 'Payments',
    permission: 'admin.revenue',
    dataSource: 'client-workspace',
  },
  {
    label: 'High Risk Suppliers',
    description: 'Open user governance filtered to supplier risk reviews',
    href: '/ops/admin/users?role=seller&risk=high',
    scope: 'Admin',
    entity: 'Suppliers',
    permission: 'admin.suppliers',
    dataSource: 'api',
    api: '/api/admin/users',
  },
  {
    label: 'Customer Pipeline',
    description: 'Open CRM customers and company intelligence',
    href: '/ops/crm/customers?segment=active',
    scope: 'CRM',
    entity: 'Companies',
    permission: 'crm.customers',
    dataSource: 'api',
    api: '/api/crm/leads',
  },
  {
    label: 'Audit Events',
    description: 'Open audit logs and change history',
    href: '/ops/admin/audit?severity=all',
    scope: 'Admin',
    entity: 'Audit Logs',
    permission: 'admin.audit',
    dataSource: 'api',
    api: '/api/admin/logs',
  },
];

export function searchOpsRoutes(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return opsRouteRegistry.slice(0, 8);
  }

  return opsRouteRegistry
    .filter((route) => {
      const haystack = `${route.label} ${route.description} ${route.scope} ${route.entity}`.toLowerCase();
      return haystack.includes(normalized);
    })
    .slice(0, 10);
}
