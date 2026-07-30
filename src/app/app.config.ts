import { provideBrowserGlobalErrorListeners, type ApplicationConfig } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideQitsIntegration, withFeatureCapture } from '@qits/angular';
import { routes } from './app.routes';

/**
 * Four providers, in @qits/angular's documented order, and each one is required by another:
 *
 * - `provideBrowserGlobalErrorListeners` funnels genuinely-global errors and unhandled rejections
 *   into the `ErrorHandler` that `provideQitsIntegration` replaces. Without it the integration's
 *   handler only ever sees what Angular itself catches.
 * - `provideRouter` comes before the integration because the integration's Navigation spans and
 *   `app.route.*` stamping have nothing to report without it — with it, every span and log record
 *   carries the matched route pattern rather than a raw URL.
 * - `withFetch` is not a preference: the default XHR backend is invisible to the OTLP fetch
 *   instrumentation, so HTTP calls would produce neither client spans nor trace propagation.
 * - `provideQitsIntegration` installs the telemetry ErrorHandler, Navigation spans and
 *   `app.route.*` stamping; `withFeatureCapture` adds the floaty capture button.
 *
 * Everything here is inert until `initQitsIntegration` (main.ts) finds a relay in
 * `api/config.json` — see public/api/config.json for what this deployment currently reports.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    provideQitsIntegration(withFeatureCapture()),
  ],
};
