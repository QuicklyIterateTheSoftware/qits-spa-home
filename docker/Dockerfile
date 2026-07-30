# qits-spa-home as an image: nginx serving a bundle that was built BEFORE this file runs.
#
# This Dockerfile is deliberately hermetic — it fetches nothing. The `pnpm install` and
# `pnpm build` happen in the CI step container (which is on qits-net, where the registry is
# reachable), and this build only wraps the resulting `dist/` in a runtime image:
#
#     pnpm build
#     docker build -t qits-spa-home:dev -f docker/Dockerfile .
#
# The earlier draft ran the install inside the build with `--network=host`, and it is worth
# recording why that is gone: a buildkit RUN step cannot reach qits-net (custom networks are
# rejected), and on Docker Desktop it cannot reach the host-published 8081 through host
# networking or a host-gateway alias either — the build failed with what read as a registry
# outage. A build that fetches packages is unbuildable on some daemons this platform targets
# by construction; a build that only COPYs is unbuildable nowhere.

FROM nginx:alpine

# Listens on 8080, not nginx's default 80 — see the config's header for why that matters here.
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# `browser/` and not the whole output dir: @angular/build writes dist/<project>/browser alongside
# 3rdpartylicenses.txt and prerendered-routes.json, which are build metadata and not documents to
# serve. A missing dist/ fails this COPY loudly — run `pnpm build` first.
COPY dist/qits-spa-home/browser /usr/share/nginx/html

EXPOSE 8080
