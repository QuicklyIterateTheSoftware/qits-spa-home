import { bootstrapApplication } from '@angular/platform-browser';
import { initQitsIntegration } from '@qits/angular';
import { App } from './app/app';
import { appConfig } from './app/app.config';

// The ordering is load-bearing and it is @qits/angular's documented contract: Angular's
// FetchBackend captures window.fetch the first time it is used, so the fetch instrumentation has
// to patch it BEFORE bootstrapApplication or the app's own API calls get no client spans and no
// traceparent. The catch is equally deliberate — telemetry is best-effort and must never be the
// reason the page fails to start.
initQitsIntegration()
  .catch(() => undefined)
  .then(() => bootstrapApplication(App, appConfig))
  .catch((err) => console.error(err));
