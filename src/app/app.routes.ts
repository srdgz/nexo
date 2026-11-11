import { isDevMode } from '@angular/core';
import type { Route, Routes } from '@angular/router';
import { demoEntryGuard } from '@core/app-mode/demo-entry.guard';
import { authGuard } from '@features/auth/presentation/auth.guards';

const DEV_ROUTES: Route[] = isDevMode()
  ? [
      {
        path: 'ui',
        title: 'pages.uiGallery',
        loadComponent: () => import('./dev/ui-gallery/ui-gallery').then((m) => m.UiGallery),
      },
    ]
  : [];

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'app/dashboard' },
  { path: 'demo', canActivate: [demoEntryGuard], children: [] },
  {
    path: 'auth',
    loadChildren: () =>
      import('@features/auth/presentation/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('@core/layout/app-shell/app-shell').then((m) => m.AppShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('@features/dashboard/presentation/dashboard.routes').then(
            (m) => m.DASHBOARD_ROUTES,
          ),
      },
      {
        path: 'finances',
        loadChildren: () =>
          import('@features/finances/presentation/finances.routes').then((m) => m.FINANCES_ROUTES),
      },
      {
        path: 'organization',
        loadChildren: () =>
          import('@features/organization/presentation/organization.routes').then(
            (m) => m.ORGANIZATION_ROUTES,
          ),
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('@features/settings/presentation/settings.routes').then((m) => m.SETTINGS_ROUTES),
      },
      ...DEV_ROUTES,
    ],
  },
  {
    path: '**',
    title: 'pages.notFound',
    loadComponent: () => import('@core/layout/not-found/not-found').then((m) => m.NotFound),
  },
];
