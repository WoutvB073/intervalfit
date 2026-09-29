import { useEffect, useState } from 'react';

/** QR-code als SVG, volledig offline gemaakt (bibliotheek wordt pas geladen als hij nodig is). */
export function QrCode({ text, size = 220 }: { text: string; size?: number }) {
  const [path, setPath] = useState<{ d: string; n: number } | null>(null);

  useEffect(() => {
    let active = true;
    void import('uqr').then(({ encode }) => {
      const { data, size: n } = encode(text, { ecc: 'M', border: 2 });
      let d = '';
      data.forEach((row, y) =>
        row.forEach((on, x) => {
          if (on) d += `M${x} ${y}h1v1h-1z`;
        }),
      );
      if (active) setPath({ d, n });
    });
    return () => {
      active = false;
    };
  }, [text]);

  return (
    <div className="qr" style={{ width: size, height: size }}>
      {path && (
        <svg viewBox={`0 0 ${path.n} ${path.n}`} width={size} height={size} shapeRendering="crispEdges" role="img" aria-label={`QR-code voor ${text}`}>
          <rect width={path.n} height={path.n} fill="#fff" />
          <path d={path.d} fill="#0f2a24" />
        </svg>
      )}
    </div>
  );
}
