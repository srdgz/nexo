import type { Routes } from '@angular/router';
import { PendingPage } from '@shared/ui/pending-page/pending-page';

export const AUTH_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', title: 'pages.login', component: PendingPage },
  { path: 'register', title: 'pages.register', component: PendingPage },
  { path: 'verify-email', title: 'pages.verifyEmail', component: PendingPage },
  { path: 'forgot-password', title: 'pages.forgotPassword', component: PendingPage },
  { path: 'reset-password', title: 'pages.resetPassword', component: PendingPage },
  { path: 'callback', title: 'pages.authCallback', component: PendingPage },
];
