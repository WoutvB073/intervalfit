import { describe, expect, it } from 'vitest';
import css from '../src/styles/themes.css?raw';

/** Leesbaarheid (WCAG AA) van de belangrijkste kleurparen in alle vier de thema's (kleuren uit themes.css). */

const block = (theme: string) => {
  const i = css.indexOf(`[data-theme='${theme}'] {`);
  return css.slice(i, css.indexOf('\n}', i));
};
const color = (b: string, name: string) => b.split('\n').find((l) => l.trim().startsWith(`--${name}:`))?.match(/#[0-9a-fA-F]{6}/)?.[0];
const lum = (h: string) => {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

describe('kleurcontrast per thema', () => {
  for (const theme of ['fris', 'sportief', 'vrolijk', 'pastel']) {
    it(theme, () => {
      const b = block(theme);
      const pairs: [string, string, number][] = [
        ['primary-ink', 'primary', 4.5],
        ['text', 'bg', 4.5],
        ['text-2', 'surface', 4.5],
        ['text-3', 'surface', 3],
        ['danger', 'surface', 4.5],
      ];
      for (const [fg, bg, min] of pairs) {
        const f = color(b, fg);
        const g = color(b, bg);
        expect(f && g, `${theme}: ${fg}/${bg}`).toBeTruthy();
        expect(ratio(f!, g!), `${theme}: ${fg} op ${bg}`).toBeGreaterThanOrEqual(min);
      }
    });
  }
});
