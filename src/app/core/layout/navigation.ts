export interface NavItem {
  readonly labelKey: string;
  readonly path: string;
}

export interface NavGroup {
  readonly labelKey: string | null;
  readonly items: readonly NavItem[];
}

export const MAIN_NAVIGATION: readonly NavGroup[] = [
  { labelKey: null, items: [{ labelKey: 'nav.dashboard', path: '/app/dashboard' }] },
  {
    labelKey: 'nav.finances',
    items: [
      { labelKey: 'nav.overview', path: '/app/finances/overview' },
      { labelKey: 'nav.transactions', path: '/app/finances/transactions' },
      { labelKey: 'nav.budgets', path: '/app/finances/budgets' },
      { labelKey: 'nav.categories', path: '/app/finances/categories' },
    ],
  },
  {
    labelKey: 'nav.organization',
    items: [
      { labelKey: 'nav.tasks', path: '/app/organization/tasks' },
      { labelKey: 'nav.calendar', path: '/app/organization/calendar' },
    ],
  },
  {
    labelKey: 'nav.settings',
    items: [
      { labelKey: 'nav.profile', path: '/app/settings/profile' },
      { labelKey: 'nav.preferences', path: '/app/settings/preferences' },
    ],
  },
];
