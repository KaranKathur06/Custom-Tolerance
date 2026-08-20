import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getCategoryDefinitions,
  getSettingDefinition,
  redactSettingValue,
  type SettingCategory,
  type SettingDefinition,
} from './registry';

export class SettingsError extends Error {
  constructor(public readonly code: string, message: string, public readonly details?: unknown) {
    super(message);
    this.name = 'SettingsError';
  }
}

type SettingRow = {
  key: string;
  value: unknown;
  description?: string | null;
  category?: string | null;
  value_type?: string | null;
  default_value?: unknown;
  is_sensitive?: boolean | null;
  is_editable?: boolean | null;
  version?: number | null;
  updated_at?: string | null;
  updated_by?: string | null;
};

export type ResolvedSetting = {
  key: string;
  category: SettingCategory;
  label: string;
  description: string;
  type: string;
  value: unknown;
  defaultValue: unknown;
  version: number;
  updatedAt: string | null;
  updatedBy: string | null;
  editable: boolean;
  dangerous: boolean;
  classification: string;
  consumer: string;
};

function normalizeRow(definition: SettingDefinition, row?: SettingRow | null): ResolvedSetting {
  const parsed = definition.schema.safeParse(row?.value);
  const value = parsed.success ? parsed.data : definition.defaultValue;
  return {
    key: definition.key,
    category: definition.category,
    label: definition.label,
    description: definition.description,
    type: definition.type,
    value,
    defaultValue: definition.defaultValue,
    version: row?.version ?? 1,
    updatedAt: row?.updated_at ?? null,
    updatedBy: row?.updated_by ?? null,
    editable: definition.editable && row?.is_editable !== false,
    dangerous: Boolean(definition.dangerous),
    classification: definition.classification,
    consumer: definition.consumer,
  };
}

export class SettingsService {
  constructor(private readonly supabase: SupabaseClient) {}

  async getAll(): Promise<ResolvedSetting[]> {
    const { data, error } = await this.supabase.from('platform_settings').select('*').order('key');
    if (error) throw new SettingsError('SETTINGS_READ_FAILED', 'Unable to load platform settings.');
    const rows = new Map(((data ?? []) as SettingRow[]).map((row) => [row.key, row]));
    return getCategoryDefinitions().map((definition) => normalizeRow(definition, rows.get(definition.key)));
  }

  async getCategory(category: string): Promise<ResolvedSetting[]> {
    if (!getCategoryDefinitions(category).length) {
      throw new SettingsError('SETTINGS_NOT_FOUND', 'Settings category not found.');
    }
    const { data, error } = await this.supabase.from('platform_settings').select('*').eq('category', category).order('key');
    if (error) throw new SettingsError('SETTINGS_READ_FAILED', 'Unable to load settings category.');
    const rows = new Map(((data ?? []) as SettingRow[]).map((row) => [row.key, row]));
    return getCategoryDefinitions(category).map((definition) => normalizeRow(definition, rows.get(definition.key)));
  }

  async get<T>(key: string): Promise<T> {
    const definition = getSettingDefinition(key);
    if (!definition) throw new SettingsError('SETTINGS_NOT_FOUND', 'Setting not found.');
    const { data, error } = await this.supabase.from('platform_settings').select('value').eq('key', key).maybeSingle();
    if (error) throw new SettingsError('SETTINGS_READ_FAILED', 'Unable to read setting.');
    const parsed = definition.schema.safeParse(data?.value);
    return (parsed.success ? parsed.data : definition.defaultValue) as T;
  }

  async update(input: { key: string; value: unknown; expectedVersion?: number; reason?: string; userId: string; request?: Request }) {
    const definition = getSettingDefinition(input.key);
    if (!definition || !definition.editable) throw new SettingsError('SETTINGS_NOT_FOUND', 'Setting is not editable.');
    const parsed = definition.schema.safeParse(input.value);
    if (!parsed.success) throw new SettingsError('SETTINGS_VALIDATION_FAILED', 'Setting value is invalid.', parsed.error.flatten());

    const { data: current, error: readError } = await this.supabase.from('platform_settings').select('*').eq('key', input.key).maybeSingle();
    if (readError) throw new SettingsError('SETTINGS_READ_FAILED', 'Unable to read current setting.');
    const currentRow = current as SettingRow | null;
    const currentVersion = currentRow?.version ?? 1;
    if (input.expectedVersion !== undefined && input.expectedVersion !== currentVersion) {
      throw new SettingsError('SETTINGS_CONFLICT', 'This setting was changed by another administrator.', { version: currentVersion });
    }

    const nextVersion = currentRow ? currentVersion + 1 : 1;
    const { error } = await this.supabase.from('platform_settings').upsert({
      key: input.key,
      category: definition.category,
      value: parsed.data,
      description: definition.description,
      default_value: definition.defaultValue,
      value_type: definition.type,
      is_sensitive: definition.classification === 'sensitive_operational',
      is_editable: definition.editable,
      version: nextVersion,
      updated_by: input.userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });
    if (error) throw new SettingsError('SETTINGS_UPDATE_FAILED', 'Unable to save setting.');

    const oldValue = redactSettingValue(definition, currentRow?.value ?? definition.defaultValue);
    const newValue = redactSettingValue(definition, parsed.data);
    await this.supabase.from('admin_audit_logs').insert({
      user_id: input.userId,
      action: 'platform_setting_updated',
      resource: 'platform_settings',
      resource_id: input.key,
      details: { key: input.key, category: definition.category, oldValue, newValue, reason: input.reason ?? null },
      severity: definition.dangerous ? 'warning' : 'info',
      ip_address: input.request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      user_agent: input.request?.headers.get('user-agent') ?? null,
    });
    return normalizeRow(definition, {
      key: definition.key,
      category: definition.category,
      value: parsed.data,
      version: nextVersion,
      updated_by: input.userId,
      updated_at: new Date().toISOString(),
    });
  }
}