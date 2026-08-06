import { TestBed } from '@angular/core/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from './app';
import { routes } from './app.routes';

/**
 * The shell owns one thing — the outlet — so that is what is asserted here, plus the route table
 * actually reaching it. Everything the landing page renders is home.spec.ts's business.
 */
describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideLocationMocks()],
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

    // The navigation is the library's, and this asserts that the library's current one is what
    // shipped: eight front doors, `/cd/` among them since @qits/ui-components 0.0.4. A stale
    // package resolves, builds and renders — the count is what notices.
    const links = Array.from(layout.querySelectorAll<HTMLAnchorElement>('.qits-layout-link'));
    expect(links).toHaveLength(8);
    expect(links.map((link) => link.getAttribute('href'))).toContain('/events/');
    expect(links.map((link) => link.getAttribute('href'))).toContain('/platform-deployments/');

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
