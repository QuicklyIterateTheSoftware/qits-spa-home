import { TestBed } from '@angular/core/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideQitsNavigationLinks } from '@qits/ui-components';
import { App } from './app';
import { routes } from './app.routes';

/**
 * A fixture navigation, not the platform's. `provideQitsNavigationLinks` answers the layout's
 * `QITS_NAVIGATION` from a literal, so nothing is fetched — there is no `/main-navigation` request
 * to flush before `whenStable()` resolves, and this file stays about the shell.
 */
const NAV = [
  { label: 'Home', href: '/' },
  { label: 'Events', href: '/events/' },
  { label: 'Deployments', href: '/platform-deployments/' },
] as const;

/**
 * The shell owns one thing — the outlet — so that is what is asserted here, plus the route table
 * actually reaching it. Everything the landing page renders is home.spec.ts's business.
 */
describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideLocationMocks(), provideQitsNavigationLinks(NAV)],
    });
  });

  it('is an outlet and nothing else', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const shell = fixture.nativeElement as HTMLElement;
    expect(shell.querySelector('router-outlet')).not.toBeNull();
    expect(shell.querySelector('h1')).toBeNull();
  });

  it('routes the root URL to the landing page, inside the shared layout', async () => {
    const harness = await RouterTestingHarness.create('/');

    // The root route activates QitsMainLayout, and Home renders in the outlet it owns.
    const layout = harness.routeNativeElement as HTMLElement;
    expect(layout.tagName.toLowerCase()).toBe('qits-main-layout');

    // This used to assert a literal count, on the reasoning that a stale @qits/ui-components
    // resolves, builds and renders, and the count is what notices. That check is gone because the
    // thing it watched is gone: the doors are no longer compiled into the package, they are what
    // qits-gateway answers `/main-navigation` with. How many there are is a deployment fact, and
    // asserting it belongs to the gateway's own spec.
    //
    // What is left here is still worth having: this app mounts the chrome, and the chrome renders
    // exactly what it was told — the fixture above, not a list of its own.
    const links = Array.from(layout.querySelectorAll<HTMLAnchorElement>('.qits-layout-link'));
    expect(links).toHaveLength(NAV.length);
    expect(links.map((link) => link.getAttribute('href'))).toEqual(NAV.map((link) => link.href));

    expect(layout.querySelector('h1')?.textContent).toContain('qits');
    expect(layout.querySelectorAll('qits-card')).toHaveLength(2);
  });

  it('keeps the catch-all outside the layout, so leaving does not paint chrome', async () => {
    const harness = await RouterTestingHarness.create('/projects/42');

    const page = harness.routeNativeElement as HTMLElement;
    expect(page.tagName.toLowerCase()).toBe('app-mfe-exit');
    expect(
      (harness.fixture.nativeElement as HTMLElement).querySelector('qits-main-layout'),
    ).toBeNull();
  });
});
