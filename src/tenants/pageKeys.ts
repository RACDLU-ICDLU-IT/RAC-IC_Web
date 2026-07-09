// Central list of permission-gated admin pages. Keep in sync with DashboardLayout nav + routes.
export const PAGE_KEYS = [
  { key: 'admin_overview', label: 'Overview' },
  { key: 'admin_members', label: 'Members' },
  { key: 'admin_applications', label: 'Applications' },
  { key: 'admin_attendance', label: 'Attendance' },
  { key: 'admin_dues', label: 'Dues & Fees' },
  { key: 'admin_donations', label: 'Donations' },
  { key: 'admin_levels', label: 'Level Config' },
  { key: 'admin_events', label: 'Events' },
  { key: 'admin_projects', label: 'Projects' },
  { key: 'admin_communications', label: 'Communications' },
  { key: 'admin_reminders', label: 'Reminders' },
  { key: 'admin_resources', label: 'Resources' },
  { key: 'admin_forms', label: 'Forms' },
  { key: 'admin_pages', label: 'Page Content' },
  { key: 'admin_news', label: 'News' },
  { key: 'admin_gallery', label: 'Gallery' },
  { key: 'admin_board', label: 'Our Team' },
  { key: 'admin_contact', label: 'Contact Inbox' },
  { key: 'admin_bot', label: 'Bot Manager' },
  { key: 'admin_posts', label: 'Post Manager' },
  { key: 'admin_sponsors', label: 'Sponsors' },
  { key: 'admin_theme', label: 'Theme' },
  { key: 'admin_settings', label: 'Settings' },
  { key: 'admin_roles', label: 'Roles & Permissions' },
] as const;

export type PageKey = typeof PAGE_KEYS[number]['key'];
export type PermAction = 'view' | 'edit' | 'delete';
