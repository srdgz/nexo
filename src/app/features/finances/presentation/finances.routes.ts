import type { Routes } from '@angular/router';
import { PendingPage } from '@shared/ui/pending-page/pending-page';

export const FINANCES_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'overview' },
  {
    path: 'overview',
    title: 'pages.overview',
    data: { monthPicker: true },
    component: PendingPage,
  },
  {
    path: 'transactions',
    title: 'pages.transactions',
    data: { monthPicker: true },
    component: PendingPage,
  },
  { path: 'transactions/new', title: 'pages.newTransaction', component: PendingPage },
  {
    path: 'transactions/:id/edit',
    title: 'pages.editTransaction',
    component: PendingPage,
  },
  {
    path: 'budgets',
    title: 'pages.budgets',
    data: { monthPicker: true },
    component: PendingPage,
  },
  {
    path: 'categories',
    title: 'pages.categories',
    loadComponent: () => import('./pages/categories/categories-page').then((m) => m.CategoriesPage),
  },
];
