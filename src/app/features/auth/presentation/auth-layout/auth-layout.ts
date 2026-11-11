import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { NxLogo } from '@shared/ui/logo/logo';
import { NxAuthShowcase } from '../components/auth-showcase/auth-showcase';

@Component({
  selector: 'nx-auth-layout',
  imports: [NxAuthShowcase, NxLogo, RouterLink, RouterOutlet, TranslocoPipe],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayout {}
