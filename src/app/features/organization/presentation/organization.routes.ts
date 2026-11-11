import type { Routes } from '@angular/router';
import { PendingPage } from '@shared/ui/pending-page/pending-page';

export const ORGANIZATION_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'tasks' },
  { path: 'tasks', title: 'pages.tasks', component: PendingPage },
  { path: 'tasks/new', title: 'pages.newTask', component: PendingPage },
  { path: 'tasks/:id/edit', title: 'pages.editTask', component: PendingPage },
  { path: 'calendar', title: 'pages.calendar', component: PendingPage },
  { path: 'calendar/events/new', title: 'pages.newEvent', component: PendingPage },
  { path: 'calendar/events/:id/edit', title: 'pages.editEvent', component: PendingPage },
];
