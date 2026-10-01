import { describe, expect, it } from 'vitest';
import { detectEnvironment } from '../src/engine/platform';
import { getGuide } from '../src/screens/gate/guide';
import { chromeIntentUrl } from '../src/engine/chrome';

/** User agents van Android-browsers (Samsung vanaf One UI 2 / 2020 tot nu, en de andere gangbare browsers). */
const UA = {
  samsungOneUI2:
    'Mozilla/5.0 (Linux; Android 10; SAMSUNG SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/11.2 Chrome/75.0.3770.143 Mobile Safari/537.36',
  samsungNew:
    'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-A556B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36',
  chrome: 'Mozilla/5.0 (Linux; Android 14; SM-A556B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  firefox: 'Mozilla/5.0 (Android 14; Mobile; rv:143.0) Gecko/143.0 Firefox/143.0',
  edge: 'Mozilla/5.0 (Linux; Android 14; SM-A556B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36 EdgA/140.0.0.0',
  opera: 'Mozilla/5.0 (Linux; Android 14; SM-A556B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36 OPR/91.0.0.0',
  whatsapp:
    'Mozilla/5.0 (Linux; Android 14; SM-A556B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36 WhatsApp/2.25.20',
  instagram:
    'Mozilla/5.0 (Linux; Android 14; SM-A556B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36 Instagram 390.0.0.0 Android (34/14; 450dpi; 1080x2340; samsung; SM-A556B; a55x; s5e8845; nl_NL)',
  facebook:
    'Mozilla/5.0 (Linux; Android 14; SM-A556B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.0;]',
};
const guideFor = (ua: string) => getGuide(detectEnvironment({ ua }));

describe('Android: installeren', () => {
  it('Chrome: gewoon installeren, met uitleg bij een eventuele Play Protect-melding', () => {
    const g = guideFor(UA.chrome);
    expect(g.viaChrome).toBeUndefined();
    expect(g.warning).toBeTruthy();
  });

  it('Samsung Internet (oud en nieuw): eerst via Chrome, met uitleg over de melding "onveilig"', () => {
    for (const ua of [UA.samsungOneUI2, UA.samsungNew]) {
      const g = guideFor(ua);
      expect(detectEnvironment({ ua }).browser).toBe('samsung');
      expect(g.viaChrome?.browserName).toBe('Samsung Internet');
      expect(g.viaChrome?.warning).toBeTruthy();
      expect(g.viaChrome?.steps.length).toBeGreaterThan(0);
    }
  });

  it('Firefox, Edge en Opera: via Chrome, met eigen stappen als alternatief', () => {
    const names = { firefox: 'Firefox', edge: 'Edge', opera: 'Opera' } as const;
    for (const [k, name] of Object.entries(names)) {
      const g = guideFor(UA[k as keyof typeof names]);
      expect(g.viaChrome?.browserName, k).toBe(name);
      expect(g.viaChrome?.steps.length, k).toBe(3);
    }
  });

  it('ingebouwde browsers (WhatsApp, Instagram, Facebook): openen in Chrome', () => {
    for (const [ua, app] of [
      [UA.whatsapp, 'WhatsApp'],
      [UA.instagram, 'Instagram'],
      [UA.facebook, 'Facebook'],
    ] as const) {
      const e = detectEnvironment({ ua });
      expect(e.browser).toBe('inapp');
      expect(e.inAppName).toBe(app);
      expect(guideFor(ua).viaChrome?.browserName).toBe(app);
    }
  });
});

describe('Openen in Chrome (intent-link)', () => {
  const loc = { host: 'woutvb073.github.io', pathname: '/intervalfit/', href: 'https://woutvb073.github.io/intervalfit/#/' };

  it('opent dezelfde pagina in Chrome, met terugval als Chrome er niet is', () => {
    const url = chromeIntentUrl(loc);
    expect(url.startsWith('intent://woutvb073.github.io/intervalfit/#Intent;')).toBe(true);
    expect(url).toContain('scheme=https');
    expect(url).toContain('package=com.android.chrome');
    expect(decodeURIComponent(url.split('S.browser_fallback_url=')[1]!.replace(/;end$/, ''))).toBe(
      'https://woutvb073.github.io/intervalfit/?geenchrome=1#/',
    );
    expect(url.endsWith(';end')).toBe(true);
  });

  it('neemt een gedeelde workout mee als ?deel=… (een tweede # mag niet in een intent-link)', () => {
    const url = chromeIntentUrl(loc, 'N4Ig~ab_c');
    expect(url.startsWith('intent://woutvb073.github.io/intervalfit/?deel=N4Ig~ab_c#Intent;')).toBe(true);
    expect(url.split('#Intent')[0]).not.toContain('#');
  });
});
