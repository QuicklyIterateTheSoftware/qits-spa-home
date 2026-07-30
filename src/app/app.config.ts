import { provideBrowserGlobalErrorListeners, type ApplicationConfig } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideQitsIntegration, withFeatureCapture } from '@qits/angular';

/**
 * Three providers, and each one is required by the one below it:
 *
 * - `provideBrowserGlobalErrorListeners` funnels genuinely-global errors and unhandled rejections
 *   into the `ErrorHandler` that `provideQitsIntegration` replaces. Without it the integration's
 *   handler only ever sees what Angular itself catches.
 * - `withFetch` is not a preference: the default XHR backend is invisible to the OTLP fetch
 *   instrumentation, so HTTP calls would produce neither client spans nor trace propagation.
 * - `provideQitsIntegration` installs the telemetry ErrorHandler, Navigation spans and
 *   `app.route.*` stamping; `withFeatureCapture` adds the floaty capture button.
 *
 * Everything here is inert until `initQitsIntegration` (main.ts) finds a relay in
 * `api/config.json` — see public/api/config.json for what this deployment currently reports.
 *
 * No `provideRouter`: this is one page with no routes yet. The day it gains them, the call goes
 * here and the Navigation spans start carrying a matched route pattern; until then there is
 * nothing to navigate and nothing to report.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch()),
    provideQitsIntegration(withFeatureCapture()),
  ],
};
