export const SETTINGS_SECTIONS = [
  { path: 'appearance', label: 'Appearance', adminOnly: false },
  { path: 'password', label: 'Password', adminOnly: false },
  { path: 'status', label: 'System Status', adminOnly: true },
  { path: 'gateways', label: 'Gateways', adminOnly: true },
  { path: 'params', label: 'Parameters', adminOnly: true },
  { path: 'users', label: 'Users', adminOnly: true },
];

export const SETTINGS_DEFAULT_PATH = 'appearance';

export function getSettingsSections(isAdmin) {
  return SETTINGS_SECTIONS.filter((item) => !item.adminOnly || isAdmin);
}

export function getSettingsSubPath(pathname) {
  const match = String(pathname || '').match(/^\/settings\/?([^/?#]*)/);
  return match?.[1]?.split('/')[0] || '';
}

export function getSettingsPageTitle(pathname, isAdmin) {
  const sub = getSettingsSubPath(pathname);
  const section = getSettingsSections(isAdmin).find((item) => item.path === sub);
  return section ? section.label : 'Settings';
}

export function settingsSectionPath(path) {
  return `/settings/${path}`;
}
