import { TestBed } from '@angular/core/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi, type Mock } from 'vitest';
import { routes } from '../app.routes';
import { LEAVE_APP } from './mfe-exit';

/**
 * The two branches of the catch-all, which is the one behaviour this app has that no other qits
 * SPA does. Both are asserted because both are silent when wrong: a missing hand-off turns every
 * cross-app link into a dead client-side 404, and a hand-off on the *initial* navigation would be
 * exactly the redirect loop the design exists to rule out.
 */
describe('MfeExit', () => {
  let leave: Mock<(url: string) => void>;

  beforeEach(() => {
    leave = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideLocationMocks(),
        { provide: LEAVE_APP, useValue: leave },
      ],
    });
  });

  it('renders a 404 when the server served this URL — the initial navigation', async () => {
    const harness = await RouterTestingHarness.create('/nowhere/at/all');

    // The gateway already decided that no service owns this URL and fell back to the SPA.
    // Navigating would ask it the same question again, so this branch must not navigate at all.
    expect(leave).not.toHaveBeenCalled();

    const page = harness.routeNativeElement as HTMLElement;
    expect(page.querySelector('h1')?.textContent).toContain('Not found');
    expect(page.querySelector('qits-badge')?.textContent).toContain('404');
    expect(page.textContent).toContain('/nowhere/at/all');
  });

  it('leaves the app when an in-app navigation aims outside it', async () => {
    const harness = await RouterTestingHarness.create('/');
    expect(TestBed.inject(Router).navigated).toBe(true);

    await harness.navigateByUrl('/projects/42');

    // A full document navigation, not a client-side render: the gateway proxies /projects to the
    // service that owns it, and this app is done.
    expect(leave).toHaveBeenCalledWith('/projects/42');
    expect((harness.routeNativeElement as HTMLElement).textContent).toContain('Taking you there');
  });

  it('lets go of a segment the chrome links to but this app does not own', async () => {
    const harness = await RouterTestingHarness.create('/');

    // `/events/` is one of the platform's front doors, and this app knows nothing about it beyond
    // that — the hand-off is what makes a nav entry for a service reachable from here.
    await harness.navigateByUrl('/events/42');

    expect(leave).toHaveBeenCalledWith('/events/42');
  });

  it('lets go of the newest front door too, so a fresh nav entry is never a client-side 404', async () => {
    const harness = await RouterTestingHarness.create('/');

    // A segment nothing here routes, standing in for whatever door the gateway adds next. The
    // chrome links to every door from every page of this app, and this branch is what keeps a new
    // one from rendering the 404 branch instead — the list is the gateway's now, so this app
    // cannot know in advance which segments it will be asked to let go of.
    await harness.navigateByUrl('/cd/42');

    expect(leave).toHaveBeenCalledWith('/cd/42');
  });

  it('hands over the URL that was asked for, not the one still in the address bar', async () => {
    const harness = await RouterTestingHarness.create('/');

    await harness.navigateByUrl('/observability/traces?span=abc');

    // urlUpdateStrategy is 'deferred', so the browser URL still reads '/' during activation —
    // reading it there would have sent the browser to the page it is already on.
    expect(leave).toHaveBeenCalledWith('/observability/traces?span=abc');
  });
});
