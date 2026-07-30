# qits-spa-home as an image: a node stage that builds the bundle, an nginx stage that serves it.
#
# Build from the repo root, and the network flag is NOT optional:
#
#     docker build --network=host -t qits-spa-home:dev -f docker/Dockerfile .
#
# The reason is the whole point of this repo. `.npmrc` routes every install through the platform's
# own npm registry at http://localhost:8081 — the local platform's host-published qits-artifacts
# port. A build container on docker's default bridge network has its own loopback, where nothing
# is listening, so the install fails with a connection refused that looks like a registry outage.
# `--network=host` puts the build in the host's network namespace, which is where 8081 actually
# is. The pipeline in .config/qits/ci-post-receive.yml passes the same flag, and it is correct
# there for the same reason: a `docker: true` step drives the HOST's daemon, so its builds run on
# the host exactly as this command does.
#
# --- stage `build` ------------------------------------------------------------------------------
# alpine, not the full image: nothing in this dependency tree needs a compiler. The optional native
# packages (@parcel/watcher, lmdb, msgpackr-extract) ship prebuilt musl binaries or are skipped,
# and their build scripts are ignored by pnpm here exactly as they are on a developer's machine —
# they are the CLI's disk-cache accelerators, not build inputs.
FROM node:24-alpine AS build
WORKDIR /src

# The manifest, the lockfile and the routing — nothing else — so a source-only change reuses the
# install layer. This is the one place a file list is worth its maintenance: all three are things
# the install genuinely cannot start without, so an omission fails loudly and immediately.
COPY package.json pnpm-lock.yaml .npmrc ./

# corepack activates the pnpm pinned by package.json's `packageManager`, so this stage cannot
# silently build with a different one than a developer does. COREPACK_NPM_REGISTRY is read from
# the .npmrc copied above rather than written here: it keeps pnpm's own download on the same
# route as everything else, and keeps the address out of this file. (Corepack falls back to
# npmjs.org if the value is empty — the build still succeeds, it just took the road this platform
# exists to avoid.)
RUN corepack enable \
 && COREPACK_NPM_REGISTRY="$(npm config get registry)" corepack install

# --frozen-lockfile: CI installs what was committed or it fails. A resolution that drifts under a
# build is a different application than the one that was tested.
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# --- runtime -------------------------------------------------------------------------------------
# Nothing from the build stage travels but the bundle: no node, no node_modules, no sources. The
# result is a few megabytes of static files behind nginx.
FROM nginx:alpine

# Listens on 8080, not nginx's default 80 — see the config's header for why that matters here.
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# `browser/` and not the whole output dir: @angular/build writes dist/<project>/browser alongside
# 3rdpartylicenses.txt and prerendered-routes.json, which are build metadata and not documents to
# serve.
COPY --from=build /src/dist/qits-spa-home/browser /usr/share/nginx/html

EXPOSE 8080
