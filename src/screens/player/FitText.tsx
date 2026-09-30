import { useLayoutEffect, useRef } from 'react';

/**
 * Tekst van maximaal `lines` regels die nooit wordt afgekapt: past hij niet, dan worden
 * de letters stap voor stap kleiner (tot `min` px).
 */
export function FitText({ text, className, max = 17, min = 12, lines = 2 }: { text: string; className?: string; max?: number; min?: number; lines?: number }) {
  const ref = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      let size = max;
      el.style.fontSize = `${size}px`;
      const tooTall = () => {
        const lh = parseFloat(getComputedStyle(el).lineHeight) || size * 1.3;
        return el.scrollHeight > lh * lines + 1;
      };
      while (size > min && tooTall()) {
        size -= 0.5;
        el.style.fontSize = `${size}px`;
      }
      el.dataset.fit = tooTall() ? 'overflow' : 'ok';
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el.parentElement ?? el);
    void document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [text, max, min, lines]);

  return (
    <p ref={ref} className={className}>
      {text}
    </p>
  );
}
