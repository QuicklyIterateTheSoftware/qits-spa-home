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

**In CI the file is outranked, not edited.** npm and pnpm rank a project `.npmrc` above `~/.npmrc`,
so the `cat > ~/.npmrc` preamble the library repos use would be silently ignored here. The pipeline
sets `npm_config_registry` / `npm_config_@qits:registry` from `$QITS_NPM_PROXY_URL` /
`$QITS_NPM_REGISTRY_URL` instead — environment outranks both files, and the working tree stays as
it was pushed.

**The lockfile is portable.** pnpm records `name@version` plus an integrity hash and no URL, so
`pnpm-lock.yaml` names no host and no port: the same lockfile resolves against `localhost:8081`, a
qits-net alias, or npmjs.org, and the integrity hash is what makes that safe rather than merely
convenient.

## Development

```bash
pnpm install         # via the .npmrc above — the platform must be up
pnpm start           # ng serve, http://localhost:4200
pnpm lint
pnpm test            # vitest on jsdom
pnpm build           # dist/qits-spa-home/browser
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

Local image-less serving is just `pnpm start`. Updating what the gateway ships is a push here
(keeps main green) followed by the gateway's own pipeline run, which picks up this repo's `main`.

## Pipeline

`.config/qits/ci-post-receive.yml`, one ordinary sandboxed step on `node-base`: install
(registries from the environment), lint, test, build. No docker socket, no publish, no image —
the gateway's pipeline is where the bundle becomes deployable.
