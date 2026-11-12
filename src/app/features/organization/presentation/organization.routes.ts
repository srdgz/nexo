import type { Routes } from '@angular/router';

export const ORGANIZATION_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'tasks' },
  {
    path: 'tasks',
    title: 'pages.tasks',
    loadComponent: () => import('./pages/tasks/tasks-page').then((m) => m.TasksPage),
  },
  {
    path: 'tasks/new',
    title: 'pages.newTask',
    loadComponent: () => import('./pages/task-form/task-form-page').then((m) => m.TaskFormPage),
  },
  {
    path: 'tasks/:id/edit',
    title: 'pages.editTask',
    loadComponent: () => import('./pages/task-form/task-form-page').then((m) => m.TaskFormPage),
  },
  {
    path: 'calendar',
    title: 'pages.calendar',
    loadComponent: () => import('./pages/calendar/calendar-page').then((m) => m.CalendarPage),
  },
  {
    path: 'calendar/events/new',
    title: 'pages.newEvent',
    loadComponent: () => import('./pages/event-form/event-form-page').then((m) => m.EventFormPage),
  },
  {
    path: 'calendar/events/:id/edit',
    title: 'pages.editEvent',
    loadComponent: () => import('./pages/event-form/event-form-page').then((m) => m.EventFormPage),
  },
];
