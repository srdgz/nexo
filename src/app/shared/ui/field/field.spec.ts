import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField, email, form, required } from '@angular/forms/signals';
import { TranslocoService } from '@jsverse/transloco';
import { provideTestI18n } from '../../../../testing/i18n';
import { NxMoneyInput } from '../money-input/money-input';
import { NxPasswordInput } from '../password-input/password-input';
import { NxField, NxInput } from './field';

@Component({
  imports: [FormField, NxField, NxInput, NxMoneyInput, NxPasswordInput],
  template: `
    <nx-field label="Email" hint="We never share it." [state]="profile.email()">
      <input nxInput type="email" [formField]="profile.email" />
    </nx-field>
    <nx-field label="Password">
      <nx-password-input [formField]="profile.password" />
    </nx-field>
    <nx-field label="Amount" [state]="profile.amount()">
      <nx-money-input [formField]="profile.amount" />
    </nx-field>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {
  readonly model = signal({ email: '', password: '', amount: null as number | null });
  readonly profile = form(this.model, (path) => {
    required(path.email);
    email(path.email);
    required(path.amount);
  });
}

describe('NxField', () => {
  let root: HTMLElement;
  let host: Host;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [provideTestI18n()] });
    const fixture = TestBed.createComponent(Host);
    root = fixture.nativeElement;
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  const fields = () => Array.from(root.querySelectorAll('nx-field'));
  const inputOf = (field: Element) => field.querySelector('input')!;

  it('links every label to its control', () => {
    for (const field of fields()) {
      const label = field.querySelector('label')!;
      expect(label.htmlFor).toBeTruthy();
      expect(inputOf(field).id).toBe(label.htmlFor);
    }
  });

  it('describes the control with the hint until there is an error', () => {
    const emailField = fields()[0]!;
    const hint = emailField.querySelector('.hint')!;

    expect(inputOf(emailField).getAttribute('aria-describedby')).toBe(hint.id);
    expect(inputOf(emailField).hasAttribute('aria-invalid')).toBe(false);
  });

  it('shows the translated error only after the control is touched', async () => {
    const emailField = fields()[0]!;
    const input = inputOf(emailField);

    input.value = 'laura@';
    input.dispatchEvent(new Event('input'));
    await TestBed.inject(TranslocoService).load('es').toPromise();
    TestBed.tick();
    expect(emailField.querySelector('.error')).toBeNull();

    input.dispatchEvent(new Event('blur'));
    TestBed.tick();

    const error = emailField.querySelector('.error')!;
    expect(error.textContent?.trim()).toBe('Introduce un correo válido.');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(error.id);
  });

  it('updates the error language when the language changes', () => {
    const emailField = fields()[0]!;
    host.profile.email().markAsTouched();
    TestBed.tick();

    TestBed.inject(TranslocoService).setActiveLang('en');
    TestBed.tick();

    expect(emailField.querySelector('.error')?.textContent?.trim()).toBe('This field is required.');
  });

  it('stores the amount in cents and formats it on blur', () => {
    const input = inputOf(fields()[2]!);

    input.value = '1.234,5';
    input.dispatchEvent(new Event('input'));
    TestBed.tick();
    expect(host.model().amount).toBe(123450);

    input.dispatchEvent(new Event('blur'));
    TestBed.tick();
    expect(input.value).toBe('1.234,50');
  });

  it('clears the amount when the text is not a number', () => {
    const input = inputOf(fields()[2]!);

    input.value = 'abc';
    input.dispatchEvent(new Event('input'));
    TestBed.tick();

    expect(host.model().amount).toBeNull();
  });

  it('toggles the password visibility', () => {
    const field = fields()[1]!;
    const toggle = field.querySelector('button')!;

    expect(inputOf(field).type).toBe('password');
    toggle.click();
    TestBed.tick();

    expect(inputOf(field).type).toBe('text');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe('Ocultar contraseña');
  });
});
