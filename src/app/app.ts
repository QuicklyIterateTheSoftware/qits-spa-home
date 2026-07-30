import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * The shell, and deliberately nothing else. Every pixel of the landing page lives in `Home`
 * behind the `''` route, so the one thing this component owns is the outlet — which is what lets
 * the `**` route (see app.routes.ts) render at all.
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {}
