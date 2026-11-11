import {
  ArrowLeftRight,
  Banknote,
  Calendar,
  CalendarPlus,
  ChartPie,
  House,
  ListChecks,
  ListPlus,
  Receipt,
  Settings,
  SlidersHorizontal,
  Tag,
  User,
  Wallet,
  type IconNode,
} from 'lucide';

export interface NavItem {
  readonly labelKey: string;
  readonly path: string;
  readonly icon: IconNode;
}

export interface NavSection extends NavItem {
  readonly items: readonly NavItem[];
}

export interface QuickAddItem extends NavItem {
  readonly descriptionKey: string;
  readonly queryParams?: Readonly<Record<string, string>>;
}

export const DASHBOARD: NavItem = {
  labelKey: 'nav.dashboard',
  path: '/app/dashboard',
  icon: House,
};

export const FINANCES: NavSection = {
  labelKey: 'nav.finances',
  path: '/app/finances',
  icon: Wallet,
  items: [
    { labelKey: 'nav.overview', path: '/app/finances/overview', icon: ChartPie },
    {
      labelKey: 'nav.transactions',
      path: '/app/finances/transactions',
      icon: ArrowLeftRight,
    },
    { labelKey: 'nav.budgets', path: '/app/finances/budgets', icon: Wallet },
    { labelKey: 'nav.categories', path: '/app/finances/categories', icon: Tag },
  ],
};

export const ORGANIZATION: NavSection = {
  labelKey: 'nav.organization',
  path: '/app/organization',
  icon: ListChecks,
  items: [
    { labelKey: 'nav.tasks', path: '/app/organization/tasks', icon: ListChecks },
    { labelKey: 'nav.calendar', path: '/app/organization/calendar', icon: Calendar },
  ],
};

export const SETTINGS: NavSection = {
  labelKey: 'nav.settings',
  path: '/app/settings',
  icon: Settings,
  items: [
    { labelKey: 'nav.profile', path: '/app/settings/profile', icon: User },
    {
      labelKey: 'nav.preferences',
      path: '/app/settings/preferences',
      icon: SlidersHorizontal,
    },
  ],
};

export const SIDEBAR_SECTIONS: readonly NavSection[] = [FINANCES, ORGANIZATION];

export const SECTIONS: readonly NavSection[] = [FINANCES, ORGANIZATION, SETTINGS];

export function sectionFor(url: string): NavSection | null {
  return SECTIONS.find((section) => url.startsWith(section.path)) ?? null;
}

export const QUICK_ADD: readonly QuickAddItem[] = [
  {
    labelKey: 'quickAdd.expense',
    descriptionKey: 'quickAdd.expenseHint',
    path: '/app/finances/transactions/new',
    queryParams: { type: 'expense' },
    icon: Receipt,
  },
  {
    labelKey: 'quickAdd.income',
    descriptionKey: 'quickAdd.incomeHint',
    path: '/app/finances/transactions/new',
    queryParams: { type: 'income' },
    icon: Banknote,
  },
  {
    labelKey: 'quickAdd.task',
    descriptionKey: 'quickAdd.taskHint',
    path: '/app/organization/tasks/new',
    icon: ListPlus,
  },
  {
    labelKey: 'quickAdd.event',
    descriptionKey: 'quickAdd.eventHint',
    path: '/app/organization/calendar/events/new',
    icon: CalendarPlus,
  },
];
