import type { Routes } from '@angular/router';
import { Home } from './home/home';
import { MfeExit } from './mfe-exit/mfe-exit';

/**
 * Two routes, and the second one is the reason this app's routing differs from every other qits
 * SPA's.
 *
 * The other clients are mounted under a segment they own outright (`/projects/`, `/ci/`, …), so
 * their wildcard means one thing: a bad URL inside their own app. This one is mounted at the
 * gateway ROOT, which makes its wildcard ambiguous — `/projects` is not a typo, it is another
 * micro frontend, and this app must let go of it rather than answer with a client-side 404.
 *
 * The segments themselves are the GATEWAY's knowledge, not this app's, so there is deliberately
 * no list here to fall out of date. `MfeExit` decides by *how* the URL was reached instead; the
 * argument for why that terminates is in its own comment.
 */
export const routes: Routes = [
  { path: '', component: Home },
  { path: '**', component: MfeExit },
];
