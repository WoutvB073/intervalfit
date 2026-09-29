const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

/** iPhone/iPad (iPadOS doet zich voor als Mac, maar heeft wel een touchscreen). */
export const isIOS =
  /iPad|iPhone|iPod/.test(ua) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const isAndroid = /Android/i.test(ua);

/** Ingebouwde browsers van apps, waarin installeren niet kan. */
export const inAppBrowser: string | null = /FBAN|FBAV|FB_IAB/.test(ua)
  ? 'Facebook'
  : /Instagram/.test(ua)
    ? 'Instagram'
    : /WhatsApp/i.test(ua)
      ? 'WhatsApp'
      : /\bLine\//.test(ua)
        ? 'LINE'
        : /; wv\)/.test(ua)
          ? 'een app'
          : null;

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
