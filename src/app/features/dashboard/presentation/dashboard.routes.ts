import type { Routes } from '@angular/router';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    title: 'pages.dashboard',
    data: { monthPicker: true },
    loadComponent: () => import('./dashboard-page').then((m) => m.DashboardPage),
  },
];
