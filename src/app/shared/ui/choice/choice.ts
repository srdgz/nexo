import { Directive, booleanAttribute, input } from '@angular/core';

@Directive({
  selector: 'input[type=checkbox][nxCheckbox]',
  host: {
    class: 'nx-checkbox',
    '[class.round]': 'shape() === "round"',
    '[indeterminate]': 'indeterminate()',
  },
})
export class NxCheckbox {
  readonly shape = input<'square' | 'round'>('square');
  readonly indeterminate = input(false, { transform: booleanAttribute });
}

@Directive({
  selector: 'input[type=checkbox][nxSwitch]',
  host: {
    class: 'nx-switch',
    role: 'switch',
  },
})
export class NxSwitch {}
