import noSleepMedia from 'nosleep.js/src/media.js';
import { isIOS } from './platform';

/**
 * Scherm aan houden tijdens een workout.
 * 1. Screen Wake Lock API (Android, iOS 16.4+), opnieuw aangevraagd na terugkomen in de app.
 * 2. Op iPhone daarnaast een piepklein, stil, herhalend videootje (NoSleep-techniek), omdat
 *    Wake Lock in beginscherm-apps op oudere iOS-versies niet betrouwbaar werkte.
 *    Het videootje heeft geen geluid en onderbreekt je muziek dus niet.
 */

type WakeLockSentinelLike = { release(): Promise<void>; addEventListener?(t: string, f: () => void): void };
type NavWithWakeLock = Navigator & { wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> } };

class KeepAwake {
  private active = false;
  private lock: WakeLockSentinelLike | null = null;
  private video: HTMLVideoElement | null = null;

  constructor() {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', () => {
      if (this.active && document.visibilityState === 'visible') {
        void this.requestLock();
        void this.video?.play().catch(() => undefined);
      }
    });
  }

  /** In de tik-afhandeling aanroepen (video mag op iOS alleen na een tik starten). */
  start(): void {
    this.active = true;
    void this.requestLock();
    const nav = navigator as NavWithWakeLock;
    if (isIOS || !nav.wakeLock) this.startVideo();
  }

  stop(): void {
    this.active = false;
    void this.lock?.release().catch(() => undefined);
    this.lock = null;
    if (this.video) {
      this.video.pause();
      this.video.remove();
      this.video = null;
    }
  }

  get isActive(): boolean {
    return this.active;
  }

  private async requestLock() {
    const nav = navigator as NavWithWakeLock;
    if (!nav.wakeLock || document.visibilityState !== 'visible') return;
    try {
      this.lock = await nav.wakeLock.request('screen');
      this.lock.addEventListener?.('release', () => {
        this.lock = null;
      });
    } catch {
      /* geweigerd of niet ondersteund: de video vangt het op (iOS) */
    }
  }

  private startVideo() {
    if (!this.video) {
      const v = document.createElement('video');
      v.setAttribute('playsinline', '');
      v.setAttribute('webkit-playsinline', '');
      v.setAttribute('aria-hidden', 'true');
      v.muted = true;
      v.loop = true;
      v.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;pointer-events:none;';
      const mp4 = document.createElement('source');
      mp4.src = noSleepMedia.mp4;
      mp4.type = 'video/mp4';
      const webm = document.createElement('source');
      webm.src = noSleepMedia.webm;
      webm.type = 'video/webm';
      v.append(webm, mp4);
      document.body.appendChild(v);
      this.video = v;
    }
    void this.video.play().catch(() => undefined);
  }
}

export const keepAwake = new KeepAwake();
