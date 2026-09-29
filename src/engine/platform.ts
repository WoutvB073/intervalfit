/**
 * Herkent toestel en browser, zodat het installatiescherm precies de juiste stappen toont.
 * `detectEnvironment` is een pure functie (makkelijk te testen met verschillende user agents).
 */

export type OS = 'ios' | 'android' | 'other';
export type Browser = 'safari' | 'chrome' | 'samsung' | 'firefox' | 'edge' | 'opera' | 'inapp' | 'other';

export type Environment = {
  os: OS;
  browser: Browser;
  /** Naam van de app met de ingebouwde browser, bv. "WhatsApp". */
  inAppName?: string;
  /** Safari-versie (hoofdnummer) op iPhone/iPad, bv. 26. */
  safariVersion?: number;
  isTablet: boolean;
  /** Telefoon of tablet. */
  isMobile: boolean;
};

type Input = { ua: string; platform?: string; maxTouchPoints?: number; coarsePointer?: boolean };

const IN_APP: [RegExp, string][] = [
  [/WhatsApp/i, 'WhatsApp'],
  [/Instagram/, 'Instagram'],
  [/FBAN|FBAV|FB_IAB|FBIOS|\[FB/, 'Facebook'],
  [/Messenger|MESSENGER/, 'Messenger'],
  [/musical_ly|BytedanceWebview|TikTok/i, 'TikTok'],
  [/Snapchat/, 'Snapchat'],
  [/LinkedInApp/, 'LinkedIn'],
  [/\bLine\//, 'LINE'],
  [/Pinterest/, 'Pinterest'],
  [/Twitter|TwitterAndroid/, 'X'],
];

export function detectEnvironment({ ua, platform = '', maxTouchPoints = 0, coarsePointer = false }: Input): Environment {
  const isIPadOS = platform === 'MacIntel' && maxTouchPoints > 1; // iPad doet zich voor als Mac
  const isIOS = /iPhone|iPad|iPod/.test(ua) || isIPadOS;
  const isAndroid = /Android/i.test(ua);
  const os: OS = isIOS ? 'ios' : isAndroid ? 'android' : 'other';

  const isTablet = /iPad/.test(ua) || isIPadOS || (isAndroid && !/Mobile/.test(ua)) || /Tablet/i.test(ua);
  const isMobile = isIOS || isAndroid || /Mobi|Tablet/i.test(ua) || (maxTouchPoints > 1 && coarsePointer);

  const inApp = IN_APP.find(([re]) => re.test(ua));
  let browser: Browser;
  let inAppName: string | undefined;
  if (inApp) {
    browser = 'inapp';
    inAppName = inApp[1];
  } else if (isAndroid && /; wv\)/.test(ua)) {
    browser = 'inapp'; // Android WebView binnen een app
    inAppName = 'een app';
  } else if (isIOS) {
    if (/CriOS/.test(ua)) browser = 'chrome';
    else if (/FxiOS/.test(ua)) browser = 'firefox';
    else if (/EdgiOS/.test(ua)) browser = 'edge';
    else if (/OPiOS|OPT\//.test(ua)) browser = 'opera';
    else if (/GSA\/|DuckDuckGo|YaBrowser|Brave/.test(ua)) browser = 'other';
    else if (/Safari\//.test(ua) && /Version\//.test(ua)) browser = 'safari';
    else {
      // Geen "Safari/" in de user agent = ingebouwde browser van een onbekende app.
      browser = 'inapp';
      inAppName = 'een app';
    }
  } else if (/SamsungBrowser/.test(ua)) browser = 'samsung';
  else if (/Edg(A|e)?\//.test(ua)) browser = 'edge';
  else if (/OPR\/|Opera/.test(ua)) browser = 'opera';
  else if (/Firefox\//.test(ua)) browser = 'firefox';
  else if (/Chrome\//.test(ua)) browser = 'chrome';
  else if (/Safari\//.test(ua)) browser = 'safari';
  else browser = 'other';

  const v = isIOS && browser === 'safari' ? /Version\/(\d+)/.exec(ua) : null;
  return {
    os,
    browser,
    ...(inAppName ? { inAppName } : {}),
    ...(v ? { safariVersion: Number(v[1]) } : {}),
    isTablet,
    isMobile,
  };
}

export const env: Environment =
  typeof navigator === 'undefined'
    ? { os: 'other', browser: 'other', isTablet: false, isMobile: false }
    : detectEnvironment({
        ua: navigator.userAgent,
        platform: navigator.platform,
        maxTouchPoints: navigator.maxTouchPoints,
        coarsePointer: typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches,
      });

export const isIOS = env.os === 'ios';
export const isAndroid = env.os === 'android';

/** Draait de app als geïnstalleerde app (vanaf het beginscherm)? */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Trillen wordt op iPhone niet ondersteund. */
export const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator && !isIOS;
