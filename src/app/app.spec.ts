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

  it('routes the root URL to the landing page', async () => {
    const harness = await RouterTestingHarness.create('/');

    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('qits');
    expect(harness.routeNativeElement?.querySelectorAll('qits-card')).toHaveLength(2);
  });
});
