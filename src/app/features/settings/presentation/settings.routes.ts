import type { Routes } from '@angular/router';
import { PendingPage } from '@shared/ui/pending-page/pending-page';

export const SETTINGS_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'profile' },
  { path: 'profile', title: 'pages.profile', component: PendingPage },
  { path: 'preferences', title: 'pages.preferences', component: PendingPage },
];
