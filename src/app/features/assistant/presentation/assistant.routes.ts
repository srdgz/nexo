import type { Routes } from '@angular/router';

export const ASSISTANT_ROUTES: Routes = [
  {
    path: '',
    title: 'pages.assistant',
    loadComponent: () => import('./assistant-page').then((m) => m.AssistantPage),
  },
];
