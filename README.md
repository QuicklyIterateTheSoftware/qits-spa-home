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

**The lockfile is NOT host-portable, and CI compensates.** npm lockfiles pin full resolved URLs,
and this one is generated on the deployment host, so every entry names `localhost:8081`. Inside a
step container the same service is `qits-artifacts:8080`; the paths are identical on both
addresses, so the pipeline's first act is a pure host swap in its own fresh clone
(`sed 's|http://localhost:8081/|http://qits-artifacts:8080/|g' package-lock.json`) and then a plain
`npm ci`. npm's own `--replace-registry-host=always` cannot do this: it substitutes the configured
registry's URL *including its path* while keeping the resolved path too, which against
path-mounted registries produces `/artifacts/npm/npmjs/artifacts/npm/npm/…` and a 404. The
integrity hashes are what make the swap safe — bytes from the other address must still hash the
same.

## Development

```bash
npm ci               # via the .npmrc above — the platform must be up
npm start            # ng serve, http://localhost:4200
npm run lint
npm test             # vitest on jsdom
npm run build        # dist/qits-spa-home/browser
```

## The page

`src/app/app.ts` is the whole application: a standalone root component that builds its shell out of
`<qits-card>`, `<qits-badge>` and `<qits-button>` from `@qits/ui-components`. There is no router
yet — one page, no routes to wire — and `provideRouter` goes into `app.config.ts` the day that
changes.

`@qits/angular` is wired the way its README documents, and the ordering in `main.ts` is
load-bearing: `initQitsIntegration()` must complete *before* `bootstrapApplication`, because
Angular's `FetchBackend` captures `window.fetch` on first use and the fetch instrumentation has to
patch it first. `app.config.ts` then provides `provideHttpClient(withFetch())` (the default XHR
backend is invisible to that instrumentation), `provideBrowserGlobalErrorListeners()` and
`provideQitsIntegration(withFeatureCapture())`.

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

`.config/qits/ci-post-receive.yml`, one ordinary sandboxed step on `node-base`: the lockfile host
swap, `npm ci`, lint, test, build. No docker socket, no publish, no image — the gateway's pipeline
is where the bundle becomes deployable.
