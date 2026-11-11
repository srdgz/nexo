import { TestBed } from '@angular/core/testing';
import { provideTestI18n } from '../../../../../../testing/i18n';
import { NxAuthShowcase, SCENE_DURATION_MS } from './auth-showcase';

describe('NxAuthShowcase', () => {
  let root: HTMLElement;

  beforeEach(async () => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ imports: [provideTestI18n()] });
    const fixture = TestBed.createComponent(NxAuthShowcase);
    root = fixture.nativeElement;
    TestBed.tick();
  });

  afterEach(() => vi.useRealTimers());

  const caption = () => root.querySelector('.caption-title')?.textContent?.trim();
  const advance = (ms: number) => {
    vi.advanceTimersByTime(ms);
    TestBed.tick();
  };

  it('starts with the balance scene and rotates on its own', () => {
    expect(caption()).toBe('Tu mes, de un vistazo');

    advance(SCENE_DURATION_MS);
    expect(caption()).toBe('Presupuestos que avisan');

    advance(SCENE_DURATION_MS);
    advance(SCENE_DURATION_MS);
    expect(caption()).toBe('Tu agenda, junto a tus cuentas');

    advance(SCENE_DURATION_MS);
    expect(caption()).toBe('Tu mes, de un vistazo');
  });

  it('keeps the visual scene away from screen readers', () => {
    expect(root.querySelector('.stage')?.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelector('.caption')?.getAttribute('aria-live')).toBe('off');
  });

  it('jumps to a scene from its dot', () => {
    const dots = root.querySelectorAll<HTMLButtonElement>('.dot');

    dots[2]!.click();
    TestBed.tick();

    expect(caption()).toBe('Tareas que mueven dinero');
    expect(dots[2]!.getAttribute('aria-current')).toBe('true');
    expect(dots[2]!.getAttribute('aria-label')).toBe('Tareas que mueven dinero');
  });

  it('stops while hovered and when paused', () => {
    root.dispatchEvent(new Event('mouseenter'));
    advance(SCENE_DURATION_MS * 2);
    expect(caption()).toBe('Tu mes, de un vistazo');

    root.dispatchEvent(new Event('mouseleave'));
    root.querySelector<HTMLButtonElement>('.toggle')!.click();
    TestBed.tick();
    advance(SCENE_DURATION_MS * 2);

    expect(caption()).toBe('Tu mes, de un vistazo');
    expect(root.querySelector('.toggle')?.getAttribute('aria-label')).toBe(
      'Reanudar la presentación',
    );
    expect(root.querySelector('.caption')?.getAttribute('aria-live')).toBe('polite');
  });
});
