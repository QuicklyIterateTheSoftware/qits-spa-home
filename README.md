# qits-spa-home

The platform's landing page — and the consumer that closes the npm loop. An Angular 21 application
that installs `@qits/ui-components` and `@qits/angular` from qits' own registry as ordinary semver
dependencies, and ships as an nginx image its own pipeline builds and qits-cd deploys.

Nothing here is a demo harness. The two packages arrive as tarballs from `qits-artifacts`, every
other dependency arrives through that service's pull-through cache of npmjs, and the image build
repeats the same install rather than copying a `dist/` someone produced by hand.

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

`localhost:8081` is the local platform's host-published qits-artifacts port, and it is the right
address in both places that matter:

- **a developer on the deployment host** dials it directly, inside the trusted surface;
- **the image build** dials it too, because a `docker: true` step drives the *host's* daemon, so
  the build runs on the host — with `--network=host`, without which the build container's own
  loopback has nothing on it.

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
docker build --network=host -t qits-spa-home:dev -f docker/Dockerfile .
docker run --rm -p 8080:8080 qits-spa-home:dev
```

A node stage installs with the committed `.npmrc` and runs `pnpm build`; an nginx stage serves
`dist/qits-spa-home/browser` on **8080** — the port every qits component listens on inside its
container — with an SPA fallback (`try_files $uri $uri/ /index.html`) so a client-side route
survives a refresh. Only hashed bundles are cached long; `index.html` and `api/config.json` never
are.

`--network=host` is required, for the reason in the `.npmrc` section above.

## Pipeline

`.config/qits/ci-post-receive.yml`, two steps:

1. `node-base` — install (registries from the environment), lint, test, build. No docker socket:
   this step keeps the full sandbox.
2. `ci-base` with `docker: true` — `docker build --network=host` and push
   `qits-spa-home:$QITS_CI_SHA` to `$QITS_REGISTRY/$QITS_IMAGE_REPOSITORY`, the tag qits-cd
   resolves an application by.

Each step is a fresh container with its own clone, so the second installs the dependency tree again
inside the image build. That is not waste: the image must be built from the manifest and the
lockfile, not from an artifact the previous step happened to leave behind.
