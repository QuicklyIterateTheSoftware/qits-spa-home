import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { captureNow } from '@qits/angular';
import { QitsBadge, QitsButton, QitsCard, type QitsBadgeTone } from '@qits/ui-components';

/** One line of the dependency table: a package and where an install of it comes from. */
interface Origin {
  readonly name: string;
  readonly source: string;
  readonly tone: QitsBadgeTone;
}

/** What the capture button last did. `idle` renders no badge at all. */
type CaptureState = 'idle' | 'working' | 'captured' | 'unavailable';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [QitsBadge, QitsButton, QitsCard],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  /**
   * Static on purpose: this is what the build resolved, not a health check. A page that rendered
   * green dots it had not measured would be worse than one that renders nothing.
   */
  protected readonly origins: readonly Origin[] = [
    { name: '@qits/ui-components', source: 'qits registry', tone: 'success' },
    { name: '@qits/angular', source: 'qits registry', tone: 'success' },
    { name: '@angular/*', source: 'npmjs, cached', tone: 'info' },
  ];

  protected readonly detailsOpen = signal(false);
  protected readonly capture = signal<CaptureState>('idle');
  protected readonly captureMessage = signal('');

  protected toggleDetails(_event: MouseEvent): void {
    this.detailsOpen.update((open) => !open);
  }

  /**
   * The real @qits/angular capture entry point, not a demo of one. It throws when config.json
   * reported no capture relay — which is the honest state of a standalone deployment — so the
   * failure is rendered as a state, with the library's own message, rather than swallowed.
   */
  protected async captureThisPage(_event: MouseEvent): Promise<void> {
    this.capture.set('working');
    this.captureMessage.set('');
    try {
      const result = await captureNow();
      this.capture.set('captured');
      this.captureMessage.set(result.url);
    } catch (error) {
      this.capture.set('unavailable');
      this.captureMessage.set(error instanceof Error ? error.message : String(error));
    }
  }

  protected captureTone(state: CaptureState): QitsBadgeTone {
    switch (state) {
      case 'captured':
        return 'success';
      case 'unavailable':
        return 'warning';
      default:
        return 'neutral';
    }
  }
}
