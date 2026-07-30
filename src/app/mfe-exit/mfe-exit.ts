import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  InjectionToken,
  inject,
  signal,
} from '@angular/core';
import { Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { QitsBadge, QitsCard } from '@qits/ui-components';

/**
 * The one line that leaves the application, behind a token purely so a test can watch it.
 *
 * `window.location.assign` cannot be spied under jsdom: every property of a `Location` is own,
 * non-writable and non-configurable — the spec marks them `[LegacyUnforgeable]` and jsdom honours
 * it, so `vi.spyOn(window.location, 'assign')` throws `Cannot redefine property`. The default
 * factory below is the real call and nothing more; the seam adds no behaviour, only a handle.
 */
export const LEAVE_APP = new InjectionToken<(url: string) => void>('qits.leave-app', {
  providedIn: 'root',
  factory: () => {
    const view = inject(DOCUMENT).defaultView;
    return (url: string) => view?.location.assign(url);
  },
});

/**
 * What the `**` route does, and it is two different things depending on how it was reached.
 *
 * This app is mounted at the gateway ROOT, so a URL it does not recognise is not automatically a
 * mistake: `/projects`, `/ci`, `/observability`, `/artifacts`, `/workspaces` and whatever ships
 * next are other micro frontends, each owned by its own service behind the same front door. The
 * catch-all must therefore be able to *let go* of a URL, and it must do so without holding a list
 * of segments — which segment belongs to which service is the gateway's knowledge, and a copy of
 * it here would be a second source of truth that silently rots.
 *
 * The signal used instead is how the URL arrived:
 *
 * - **Initial navigation** (`router.navigated === false` while this component is being created).
 *   The document was served by the server for this very URL, which means the gateway already
 *   looked at it, found no service that owns it, and fell back to this SPA. There is nothing left
 *   to hand it to, so this renders a branded 404.
 * - **Subsequent navigation** (`router.navigated === true`). A `routerLink` or `router.navigate`
 *   inside this app aimed at something outside its own routes — which, at the root, means another
 *   micro frontend. A full document navigation hands the URL back to the gateway, which serves
 *   whoever owns the segment.
 *
 * **Why this cannot loop.** The two branches are exclusive and only one of them navigates. A full
 * navigation ends this document: the browser leaves, the router is destroyed, and if the gateway
 * has no owner for the URL either, the SPA it serves back starts a *fresh* app whose first
 * navigation is by definition the initial one — the 404 branch, which never navigates. So the
 * cycle is at most one hop and it terminates in a rendered page, never in a redirect.
 *
 * `router.navigated` is the chosen spelling because it says exactly this: Angular sets it on the
 * first `NavigationEnd`, and component activation happens *before* that event, so it is false
 * throughout the first navigation and true from the second onwards. `getCurrentNavigation()!.id
 * === 1` is the same fact counted rather than flagged; the flag is used because it does not care
 * how many navigations were cancelled on the way.
 */
@Component({
  selector: 'app-mfe-exit',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [QitsBadge, QitsCard, RouterLink],
  templateUrl: './mfe-exit.html',
  styleUrl: './mfe-exit.css',
})
export class MfeExit {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly leaveApp = inject(LEAVE_APP);

  /** The URL that was asked for, as the browser would spell it (base href included). */
  protected readonly target = signal('');

  /** True on the branch that is handing the URL to the gateway; the 404 view is the other one. */
  protected readonly leaving = signal(false);

  constructor() {
    const target = this.attemptedUrl();
    this.target.set(target);

    if (this.router.navigated) {
      this.leaving.set(true);
      this.leaveApp(target);
    }
  }

  /**
   * The router's URL, not the browser's. Angular's default `urlUpdateStrategy` is `deferred`, so
   * during activation `window.location` still holds the URL being navigated *away* from — reading
   * it here would send the browser to the page it is already on, which is the one way this could
   * have looped.
   */
  private attemptedUrl(): string {
    const navigation = this.router.getCurrentNavigation();
    const tree = navigation?.finalUrl ?? navigation?.extractedUrl;
    const path = tree ? this.router.serializeUrl(tree) : this.router.url;
    return this.location.prepareExternalUrl(path);
  }
}
