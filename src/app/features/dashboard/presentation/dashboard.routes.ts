import type { Routes } from '@angular/router';
import { PendingPage } from '@shared/ui/pending-page/pending-page';

export const DASHBOARD_ROUTES: Routes = [
  { path: '', title: 'pages.dashboard', component: PendingPage },
];
