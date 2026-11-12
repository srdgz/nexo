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
    loadComponent: () =>
      import('./pages/transactions/transactions-page').then((m) => m.TransactionsPage),
  },
  {
    path: 'transactions/new',
    title: 'pages.newTransaction',
    loadComponent: () =>
      import('./pages/transaction-form/transaction-form-page').then((m) => m.TransactionFormPage),
  },
  {
    path: 'transactions/:id/edit',
    title: 'pages.editTransaction',
    loadComponent: () =>
      import('./pages/transaction-form/transaction-form-page').then((m) => m.TransactionFormPage),
  },
  {
    path: 'budgets',
    title: 'pages.budgets',
    data: { monthPicker: true },
    loadComponent: () => import('./pages/budgets/budgets-page').then((m) => m.BudgetsPage),
  },
  {
    path: 'categories',
    title: 'pages.categories',
    loadComponent: () => import('./pages/categories/categories-page').then((m) => m.CategoriesPage),
  },
];
