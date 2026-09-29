import type { ThemeId } from '../model/types';

export const THEMES: { id: ThemeId; label: string }[] = [
  { id: 'sportief', label: 'Donker & sportief' },
  { id: 'fris', label: 'Licht & fris' },
  { id: 'vrolijk', label: 'Kleurrijk & vrolijk' },
  { id: 'pastel', label: 'Zacht pastel' },
];

/** Zet het thema op <html> en past de kleur van de statusbalk (Android) aan. */
export function applyTheme(theme: ThemeId): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
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
