import type { Routes } from '@angular/router';
import { QitsMainLayout } from '@qits/ui-components';
import { Home } from './home/home';
import { MfeExit } from './mfe-exit/mfe-exit';

/**
 * Two top-level routes, and what is unusual about them is that the second is a *sibling* of the
 * layout rather than a child of it.
 *
 * `QitsMainLayout` is the platform chrome — the bar, the navigation, and the outlet the page
 * renders into. It is mounted as a route component with `Home` beneath it so it is built once and
 * survives every navigation inside this app, rather than being torn down and rebuilt with each
 * page the way a chrome-in-`App` shell would be.
 *
 * `MfeExit` is deliberately left outside it. The other clients are mounted under a segment they
 * own outright (`/projects/`, `/ci/`, …), so their wildcard means one thing: a bad URL inside
 * their own app. This one is mounted at the gateway ROOT, which makes its wildcard ambiguous —
 * `/projects` is not a typo, it is another micro frontend, and this app must let go of it rather
 * than answer with a client-side 404. Since that branch is on its way *out* of this application,
 * wrapping it in the chrome would paint a navigation the browser is already leaving.
 *
 * Which segment belongs to which service is still the GATEWAY's knowledge, and there is
 * deliberately no copy of it here to fall out of date. The layout does render a list — the one the
 * gateway answers `/main-navigation` with — but that is a menu of front doors, not a routing table:
 * it holds `/ci/` and never `/ci/runs/42`, and a service whose door has not been added still owns
 * its URLs. Consulting it from the catch-all would answer a routing question with a navigation
 * menu. `MfeExit` decides by *how* the URL was reached instead; the argument for why that
 * terminates is in its own comment.
 */
export const routes: Routes = [
  { path: '', component: QitsMainLayout, children: [{ path: '', component: Home }] },
  { path: '**', component: MfeExit },
];
