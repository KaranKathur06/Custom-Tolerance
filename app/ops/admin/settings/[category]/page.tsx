import { SettingsClient } from '../settings-client';

export default function SettingsCategoryPage({ params }: { params: { category: string } }) {
  return <SettingsClient category={params.category} />;
}