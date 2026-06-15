export const SETTINGS_SECTIONS = [
  { id: 'settings-appearance', label: 'Appearance', adminOnly: false },
  { id: 'settings-password', label: 'Password', adminOnly: false },
  { id: 'settings-status', label: 'System Status', adminOnly: true },
  { id: 'settings-gateway', label: 'Gateways', adminOnly: true },
  { id: 'settings-params', label: 'Parameters', adminOnly: true },
  { id: 'settings-users', label: 'Users', adminOnly: true },
];

export function getSettingsSections(isAdmin) {
  return SETTINGS_SECTIONS.filter((item) => !item.adminOnly || isAdmin);
}

export function scrollToSettingsSection(sectionId) {
  if (!sectionId) return;
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
