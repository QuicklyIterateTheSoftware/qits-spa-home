# qits-spa-home

The platform's landing page — and the consumer that closes the npm loop. An Angular 21 application
that installs `@qits/ui-components` and `@qits/angular` from qits' own registry as ordinary semver
dependencies, and ships as an nginx image its own pipeline builds and qits-cd deploys.

Nothing here is a demo harness. The two packages arrive as tarballs from `qits-artifacts`, every
other dependency arrives through that service's pull-through cache of npmjs, and the image wraps
the `dist/` that the pipeline's own tested build produced — the Dockerfile fetches nothing.

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
the trusted surface. The image build reads no registry at all — the Dockerfile is hermetic (see its
header for why a build that fetches cannot work on every daemon this platform targets), and CI
overrides the file with environment.

Access from anywhere else goes through the gateway's usual session auth and is out of scope.

**In CI the file is outranked, not edited.** npm and pnpm rank a project `.npmrc` above `~/.npmrc`,
so the `cat > ~/.npmrc` preamble the library repos use would be silently ignored here. The pipeline
sets `npm_config_registry` / `npm_config_@qits:registry` from `$QITS_NPM_PROXY_URL` /
`$QITS_NPM_REGISTRY_URL` instead — environment outranks both files, and the working tree stays as
it was pushed, which is what lets the image step (a fresh clone of its own) use the committed file.

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

## The image

```bash
pnpm build
docker build -t qits-spa-home:dev -f docker/Dockerfile .
docker run --rm -p 8080:8080 qits-spa-home:dev
```

The Dockerfile is hermetic — it COPYs the `dist/` that `pnpm build` just produced; nginx serves
`dist/qits-spa-home/browser` on **8080** — the port every qits component listens on inside its
container — with an SPA fallback (`try_files $uri $uri/ /index.html`) so a client-side route
survives a refresh. Only hashed bundles are cached long; `index.html` and `api/config.json` never
are.

## Pipeline

`.config/qits/ci-post-receive.yml`, one step on `node-docker-base` with `docker: true`: install
(registries from the environment), lint, test, build — then `docker build` and push
`qits-spa-home:$QITS_CI_SHA` to `$QITS_REGISTRY/$QITS_IMAGE_REPOSITORY`, the tag qits-cd resolves
an application by.

One step rather than two is load-bearing, not convenience: steps share no state, and a build
container spawned by the host's daemon cannot reach the registry on every daemon this platform
targets (the pipeline file records the specifics). So the install and build happen in the step
container — which is on qits-net — and the image build only COPYs the result out of the step's own
checkout. The image is still built from a tree that went green: the same step just proved it, three
commands earlier.
