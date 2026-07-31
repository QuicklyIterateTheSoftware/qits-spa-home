import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Home } from './home';

describe('Home', () => {
  async function render(): Promise<ComponentFixture<Home>> {
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    return fixture;
  }

  function el(fixture: ComponentFixture<Home>): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('renders the page shell out of the shared components', async () => {
    const fixture = await render();
    // The library components are real elements in the DOM, not stubs — if the package failed to
    // resolve, this is what notices.
    expect(el(fixture).querySelectorAll('qits-card')).toHaveLength(2);
    expect(el(fixture).querySelectorAll('qits-badge').length).toBeGreaterThan(0);
    expect(el(fixture).querySelector('h1')?.textContent).toContain('qits');
  });

  it('renders no landmark of its own — QitsMainLayout owns the <main>', async () => {
    const fixture = await render();
    expect(el(fixture).querySelector('main')).toBeNull();
  });

  it('lists every origin with its badge', async () => {
    const fixture = await render();
    const rows = el(fixture).querySelectorAll('.origins li');
    expect(rows).toHaveLength(3);
    expect(rows[0].querySelector('code')?.textContent).toContain('@qits/ui-components');
    expect(rows[0].querySelector('qits-badge')?.textContent).toContain('qits registry');
  });

  it('toggles the detail panel from the card action button', async () => {
    const fixture = await render();
    expect(el(fixture).querySelector('.detail')).toBeNull();

    const toggle = el(fixture).querySelector('qits-card button') as HTMLButtonElement;
    expect(toggle.textContent).toContain('Show the route');

    toggle.click();
    await fixture.whenStable();
    expect(el(fixture).querySelector('.detail')).not.toBeNull();
    expect(toggle.textContent).toContain('Hide the route');
  });

  it('reports capture as unavailable when no relay is configured', async () => {
    const fixture = await render();
    const capture = el(fixture).querySelectorAll('qits-card')[1].querySelector('button');
    capture?.click();
    await fixture.whenStable();

    // The real captureNow() from @qits/angular, refusing for the real reason: config.json (absent
    // in a spec, and null in this deployment's copy) reports no capture relay.
    const badge = el(fixture).querySelector('.capture-row qits-badge');
    expect(badge?.textContent).toContain('unavailable');
    expect(el(fixture).querySelector('.capture-message')?.textContent).toContain('not active');
  });
});
