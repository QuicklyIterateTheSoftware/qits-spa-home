# qits-spa-home

The platform's landing page — and the consumer that closes the npm loop. An Angular 21 application
that installs `@qits/ui-components` and `@qits/angular` from qits' own registry as ordinary semver
dependencies. It ships no image of its own: **qits-gateway serves it via Quinoa**, carrying this
repository as a git submodule at its ui-dir and packaging the bundle into the gateway build.

Nothing here is a demo harness. The two packages arrive as tarballs from `qits-artifacts`, and
every other dependency arrives through that service's pull-through cache of npmjs.

## The .npmrc

One committed file, routing and nothing else:

```ini
registry=http://localhost:8081/artifacts/npm/npmjs/     # everything, through the cache
@qits:registry=http://localhost:8081/artifacts/npm/npm/ # ours, from the hosted repository
```

**No credential, and none is needed.** qits-artifacts requires and reads none in either direction;
the `_authToken` line the library repos' pipelines carry exists only because the npm *CLI* refuses
to `publish` with no credential configured — a pre-flight that never reaches the wire. Nothing here
publishes, and an install has no such pre-flight, so there is nothing to carry.

`localhost:8081` is the local platform's host-published qits-artifacts port, and it serves the one
consumer the file exists for: **a developer on the deployment host**, dialling it directly inside
the trusted surface. CI overrides the file with environment, and the gateway's build consumes a
bundle that was built where the registry is reachable — nothing else ever reads it.

Access from anywhere else goes through the gateway's usual session auth and is out of scope.

**In CI the file is outranked, not edited.** npm ranks a project `.npmrc` above `~/.npmrc`, so the
`cat > ~/.npmrc` preamble the library repos use would be written and silently ignored here. The
pipeline sets `npm_config_registry` / `npm_config_@qits:registry` from `$QITS_NPM_PROXY_URL` /
`$QITS_NPM_REGISTRY_URL` instead — environment outranks both files, and no deployment address is
spelled in the recipe.

**The lockfile is the exception, because npm gives no other option.** npm pins a full resolved URL
per package, so `package-lock.json` names `localhost:8081` roughly seven hundred times, and `npm
ci` fetches tarballs by that URL without ever asking the configured registry for them — the
environment override above does not reach them. Inside a step container that address does not
exist. The paths are identical on both addresses, so the pipeline's first act is to replace the
*origin* of every `resolved` in its own clone, derived from `$QITS_NPM_PROXY_URL`, and then run
`npm ci`. The integrity hashes are what make the swap safe: bytes from the other address must
still hash the same.

npm's own knob for exactly this, `--replace-registry-host=always`, cannot do it against a registry
mounted under a path — which qits-artifacts is. `@npmcli/arborist` glues rather than resolves
(`reify.js`: `registry.slice(0, -1) + resolvedURL.pathname`), so
`…/artifacts/npm/npmjs/` + `/artifacts/npm/npmjs/zone.js/-/…tgz` comes out as
`…/artifacts/npm/npmjs/artifacts/npm/npmjs/zone.js/-/…tgz` and every tarball 404s. Measured on npm
10.9.4; the day npm resolves that URL instead of concatenating it, the swap goes away.

**One pnpm-ism needed no npm replacement.** `pnpm-lock.yaml`'s time here came with a
`packageExtensions` patch making `zone.js` an optional peer of
`@opentelemetry/instrumentation-user-interaction`. npm installs missing peer dependencies rather
than failing on them, so a plain `npm install` resolves it with no `overrides` and no warning:
`zone.js` lands in `node_modules` as a peer of that package and of `@angular/core`, and stays
inert — this app is zoneless and `angular.json` declares no polyfill that would load it.

## Development

```bash
npm ci               # via the .npmrc above — the platform must be up
npm start            # ng serve, http://localhost:4200
npm run lint
npm test             # vitest on jsdom
npm run build        # dist/qits-spa-home/browser
```

## The page

`src/app/app.ts` is the shell and holds a single `<router-outlet>`. Under it, `''` activates
`<qits-main-layout>` from `@qits/ui-components` — the platform chrome, a sidebar from 768px up and
a burger below — as a **route** component, so the bar and the navigation are built once and survive
navigation. The landing page itself is `src/app/home/home.ts`, a standalone component behind that
layout's own `''` child, building its content out of `<qits-card>`, `<qits-badge>` and
`<qits-button>`. It renders no `<main>` and no app title of its own: the layout supplies both.

## Routing, and the one thing this SPA does differently

Every other qits client is mounted under a segment it owns outright (`/projects/`, `/ci/`, …), so
its wildcard route means one unambiguous thing: a bad URL inside its own app. **This one is
mounted at the gateway root**, which makes the same wildcard ambiguous — `/projects` is not a typo,
it is another micro frontend — so the catch-all has to be able to *let go* of a URL.

`src/app/mfe-exit/` is that catch-all, and it sits **outside the layout**, a sibling of the `''`
route rather than a child of it: its job is to leave this application, and painting the chrome
around a page the browser is already leaving would flash a navigation on the way out.

It holds **no list of segments**: which segment belongs to which service is the gateway's
knowledge, and a copy of it here would be a second source of truth that rots in silence. The
layout does ship a list — `QITS_NAV_LINKS`, the eight front doors it renders as plain anchors — but
that is a menu, not a routing table: it holds `/ci/` and never `/ci/runs/42`, and a service the
library has not been taught about still owns its URLs. The catch-all decides on how the URL
arrived instead:

| How `**` was reached                                                    | What it means                                                                                                     | What it does                                                                                             |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Initial** navigation (`router.navigated === false` during activation) | the server served the document for this very URL, so the gateway already found no owner and fell back to this SPA | render a branded 404                                                                                     |
| **Subsequent** navigation (`router.navigated === true`)                 | a link or `router.navigate` inside this app aimed outside its own routes                                          | `window.location.assign(url)` — a full document navigation the gateway then routes to the owning service |

**It cannot loop.** Only one branch navigates. A full navigation ends this document; if the gateway
finds no owner for that URL either, the SPA it serves back is a *fresh* app whose first navigation
is by definition the initial one — the branch that never navigates. One hop, then a rendered page.

`router.navigated` is the chosen signal because it states that fact directly: Angular sets it on
the first `NavigationEnd`, and component activation happens before that event fires. The URL handed
over comes from `router.getCurrentNavigation()`, **not** from `window.location`: Angular's default
`urlUpdateStrategy` is `deferred`, so during activation the address bar still holds the URL being
left — reading it there would send the browser to the page it is already on, which is the one way
this design could have looped.

**Cross-app links are plain `href` anchors, never `routerLink`.** A `routerLink` to `/projects`
asks this app's router to handle it, and the escape hatch above exists to catch the ones that slip
through — not to make them the normal path. `routerLink` is for routes in `app.routes.ts` and
nothing else.

One test-only seam is worth knowing about: the hand-off goes through the `LEAVE_APP` injection
token, whose default factory is exactly `window.location.assign`. That indirection is not a design
preference — under jsdom every property of a `Location` is own, non-writable and non-configurable
(`[LegacyUnforgeable]`), so `vi.spyOn(window.location, 'assign')` throws and there is no other way
to assert the branch that leaves.

## The integration

`@qits/angular` is wired the way its README documents, and the ordering in `main.ts` is
load-bearing: `initQitsIntegration()` must complete *before* `bootstrapApplication`, because
Angular's `FetchBackend` captures `window.fetch` on first use and the fetch instrumentation has to
patch it first. `app.config.ts` then provides `provideBrowserGlobalErrorListeners()`,
`provideRouter(routes)` — without which the integration's Navigation spans and `app.route.*`
stamping have nothing to report — `provideHttpClient(withFetch())` (the default XHR backend is
invisible to that instrumentation) and `provideQitsIntegration(withFeatureCapture())`, in that
order.

All of it is **gated by `api/config.json`**, which the library fetches base-relative at startup.
This deployment ships `public/api/config.json` reporting both relays as `null`:

```json
{ "telemetry": null, "capture": null }
```

That is the honest state of a static SPA with no backend of its own — telemetry stays dark, the
capture button never mounts, and the page's own Capture action says why rather than failing
mysteriously. It is also the single file a deployment replaces when there is something to point at,
and its shape is `@qits/angular`'s, not this repo's invention.

## Serving

This repository produces a bundle, not a container. `qits-gateway` includes this repo as a git
submodule at its Quinoa ui-dir, builds the bundle into its own image, and serves it at the front
door — SPA fallback included, so client-side routes survive a refresh. The gateway's own
`GET /api/config.json` answers instead of the `public/api/config.json` stub, which exists so a
standalone `ng serve` still has the shape the `@qits/angular` gate expects.

Local image-less serving is just `npm start`. Updating what the gateway ships is a push here
(keeps main green) followed by the gateway's own pipeline run, which picks up this repo's `main`.

## Pipeline

`.config/qits/ci-post-receive.yml` runs on every push. Its first step is the ordinary sandboxed one
on `node-base`: the lockfile origin swap, `npm ci` (registries from the environment), lint, test,
build. No docker socket, no publish, no image — the gateway's pipeline is where the bundle becomes
deployable.

Its second step is bound to `branches: [{prefix: maintenance/}]` and does nothing else: it asks
qits-workspaces to **release** this repository, which merges the branch into `main`, stamps a
version and publishes a `SoftwareRelease`. On every other push it is recorded `SKIPPED` with
`[step not bound to branch <branch>]`. "Release only if the tests passed" needs no machinery — a
failed step stops the run, so the second step is simply never reached.

## The release train

This repository is the first consumer on it. `.config/qits/ci-event-upstream-ui-components.yml`
triggers on `SoftwareRelease` from `qits-spa-ui-components`: it waits for the released version to
reach the registry, writes `^<version>` into `package.json`, regenerates the lockfile, commits
`bump(@qits/ui-components@<version>): …` as `qits release train`, and force-pushes
`maintenance/qits-spa-ui-components`. That push runs the pipeline above, whose second step releases
this repository — one hop, and the next `SoftwareRelease` is this repo's own.

Two facts in that file are easy to get backwards, and both are commented in place. The trigger
matches `repository` and **never** `branch`, because `SoftwareRelease.branch` is the *source* branch
that was released and is never `main`. And the origin swap runs **both ways**: in, so npm can
resolve, and back out to `localhost:8081`, so the committed lockfile keeps the developer-host
convention. The train stops after this repository: `qits-gateway` consumes it as a gitlink, not as a
manifest range, and no trigger file declares that edge.
