import type { ThemeId } from '../model/types';

export const THEMES: { id: ThemeId; label: string; dark?: boolean }[] = [
  { id: 'sportief', label: 'Donker & sportief', dark: true },
  { id: 'fris', label: 'Licht & fris' },
  { id: 'vrolijk', label: 'Kleurrijk & vrolijk' },
  { id: 'pastel', label: 'Zacht pastel' },
];

/**
 * Zet het thema op <html>, vertelt de browser dat het een vast licht of donker thema is
 * (`color-scheme: only …`: nooit automatisch donker maken) en past de kleur van de statusbalk (Android) aan.
 * Dezelfde logica staat ook als klein script in index.html (vóór het eerste beeld).
 */
export function applyTheme(theme: ThemeId): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  let scheme = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (!scheme) {
    scheme = document.createElement('meta');
    scheme.name = 'color-scheme';
    document.head.appendChild(scheme);
  }
  scheme.content = THEMES.find((t) => t.id === theme)?.dark ? 'only dark' : 'only light';
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
  if (!bg) return;
  let metas = document.querySelectorAll('meta[name="theme-color"]');
  if (metas.length === 0) {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
    metas = document.querySelectorAll('meta[name="theme-color"]');
  }
  metas.forEach((m) => m.setAttribute('content', bg));
}
