import type { Routes } from '@angular/router';

export const SETTINGS_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'profile' },
  {
    path: 'profile',
    title: 'pages.profile',
    loadComponent: () => import('./pages/profile/profile-page').then((m) => m.ProfilePage),
  },
  {
    path: 'preferences',
    title: 'pages.preferences',
    loadComponent: () =>
      import('./pages/preferences/preferences-page').then((m) => m.PreferencesPage),
  },
];
