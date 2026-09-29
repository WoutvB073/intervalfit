import { describe, expect, it } from 'vitest';
import { detectEnvironment } from '../src/engine/platform';

const UA = {
  iphoneSafari18:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  iphoneSafari26:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.7339.101 Mobile/15E148 Safari/604.1',
  iphoneFirefox:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/142.0 Mobile/15E148 Safari/605.1.15',
  iphoneInstagram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 390.0.0.0 (iPhone14,7; iOS 18_5; nl_NL; nl)',
  iphoneFacebook:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/500.0.0.0;FBBV/1;FBDV/iPhone14,7;FBMD/iPhone;FBSN/iOS;FBSV/18.5;FBSS/3;FBLC/nl_NL]',
  iphoneWhatsApp:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WhatsApp/25.20.0',
  iphoneUnknownApp:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  ipad:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  samsung:
    'Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36',
  androidWebView:
    'Mozilla/5.0 (Linux; Android 13; SM-A515F Build/TP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36',
  androidFacebook:
    'Mozilla/5.0 (Linux; Android 13; SM-A515F Build/TP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.0;]',
  androidFirefox: 'Mozilla/5.0 (Android 13; Mobile; rv:142.0) Gecko/142.0 Firefox/142.0',
  androidTablet:
    'Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  desktopChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  desktopSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  desktopEdge:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',
};

describe('toestel- en browserherkenning', () => {
  it('iPhone Safari (met versie voor de juiste stappen)', () => {
    expect(detectEnvironment({ ua: UA.iphoneSafari18 })).toMatchObject({ os: 'ios', browser: 'safari', safariVersion: 18, isMobile: true, isTablet: false });
    expect(detectEnvironment({ ua: UA.iphoneSafari26 })).toMatchObject({ os: 'ios', browser: 'safari', safariVersion: 26 });
  });

  it('iPhone met een andere browser', () => {
    expect(detectEnvironment({ ua: UA.iphoneChrome }).browser).toBe('chrome');
    expect(detectEnvironment({ ua: UA.iphoneFirefox }).browser).toBe('firefox');
  });

  it('ingebouwde browsers van apps', () => {
    expect(detectEnvironment({ ua: UA.iphoneInstagram })).toMatchObject({ os: 'ios', browser: 'inapp', inAppName: 'Instagram' });
    expect(detectEnvironment({ ua: UA.iphoneFacebook })).toMatchObject({ browser: 'inapp', inAppName: 'Facebook' });
    expect(detectEnvironment({ ua: UA.iphoneWhatsApp })).toMatchObject({ browser: 'inapp', inAppName: 'WhatsApp' });
    expect(detectEnvironment({ ua: UA.iphoneUnknownApp })).toMatchObject({ browser: 'inapp' });
    expect(detectEnvironment({ ua: UA.androidFacebook })).toMatchObject({ os: 'android', browser: 'inapp', inAppName: 'Facebook' });
    expect(detectEnvironment({ ua: UA.androidWebView })).toMatchObject({ os: 'android', browser: 'inapp' });
  });

  it('iPad (doet zich voor als Mac) telt als iOS-tablet', () => {
    expect(detectEnvironment({ ua: UA.ipad, platform: 'MacIntel', maxTouchPoints: 5 })).toMatchObject({
      os: 'ios', browser: 'safari', isTablet: true, isMobile: true,
    });
  });

  it('Android: Chrome, Samsung Internet, Firefox en tablet', () => {
    expect(detectEnvironment({ ua: UA.androidChrome })).toMatchObject({ os: 'android', browser: 'chrome', isMobile: true, isTablet: false });
    expect(detectEnvironment({ ua: UA.samsung })).toMatchObject({ os: 'android', browser: 'samsung' });
    expect(detectEnvironment({ ua: UA.androidFirefox })).toMatchObject({ os: 'android', browser: 'firefox' });
    expect(detectEnvironment({ ua: UA.androidTablet })).toMatchObject({ os: 'android', isTablet: true, isMobile: true });
  });

  it('computers zijn geen mobiel toestel', () => {
    expect(detectEnvironment({ ua: UA.desktopChrome, platform: 'Win32' })).toMatchObject({ os: 'other', browser: 'chrome', isMobile: false });
    expect(detectEnvironment({ ua: UA.desktopSafari, platform: 'MacIntel', maxTouchPoints: 0 })).toMatchObject({ os: 'other', isMobile: false });
    expect(detectEnvironment({ ua: UA.desktopEdge, platform: 'Win32' })).toMatchObject({ browser: 'edge', isMobile: false });
  });

  it('Windows-laptop met touchscreen maar muis blijft een computer', () => {
    expect(detectEnvironment({ ua: UA.desktopChrome, platform: 'Win32', maxTouchPoints: 10, coarsePointer: false }).isMobile).toBe(false);
  });
});
