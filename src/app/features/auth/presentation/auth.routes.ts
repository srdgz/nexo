import type { Routes } from '@angular/router';
import { guestGuard } from './auth.guards';
import { AuthLayout } from './auth-layout/auth-layout';
import { AuthCallbackPage } from './pages/auth-callback-page';
import { ForgotPasswordPage } from './pages/forgot-password-page';
import { LoginPage } from './pages/login-page';
import { RegisterPage } from './pages/register-page';
import { ResetPasswordPage } from './pages/reset-password-page';
import { VerifyEmailPage } from './pages/verify-email-page';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    component: AuthLayout,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      { path: 'login', title: 'pages.login', canActivate: [guestGuard], component: LoginPage },
      {
        path: 'register',
        title: 'pages.register',
        canActivate: [guestGuard],
        component: RegisterPage,
      },
      {
        path: 'verify-email',
        title: 'pages.verifyEmail',
        canActivate: [guestGuard],
        component: VerifyEmailPage,
      },
      {
        path: 'forgot-password',
        title: 'pages.forgotPassword',
        canActivate: [guestGuard],
        component: ForgotPasswordPage,
      },
      { path: 'reset-password', title: 'pages.resetPassword', component: ResetPasswordPage },
      { path: 'callback', title: 'pages.authCallback', component: AuthCallbackPage },
    ],
  },
];
