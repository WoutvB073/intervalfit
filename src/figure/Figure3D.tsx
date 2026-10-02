import { useEffect, useRef } from 'react';
import { LEN } from './rig';
import { fitViewBox3D, frame3D, type Anim3D } from './scene3d';
import { prefersReducedMotion, subscribeFrame } from './ticker';

type Props = {
  anim: Anim3D;
  playing?: boolean;
  /** Vast tijdstip (s) voor tests/screenshots. */
  at?: number;
  className?: string;
  title?: string;
};

const SEG_KEYS = ['upperR', 'foreR', 'upperL', 'foreL', 'thighR', 'shinR', 'footR', 'thighL', 'shinL', 'footL'] as const;
const f1 = (n: number) => n.toFixed(1);

/**
 * 3D-figuurtje met een langzaam draaiende camera (zie scene3d.ts). Elk beeld worden de lichaamsdelen
 * opnieuw van achter naar voor gesorteerd, zodat wat dichterbij is er bovenop ligt.
 */
export function Figure3D({ anim, playing = true, at, className = '', title }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const layer = useRef<SVGGElement>(null);
  const groups = useRef(new Map<string, SVGGElement>());
  const torsoRef = useRef<SVGPathElement>(null);
  const headRef = useRef<SVGCircleElement>(null);
  const matRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const draw = (sec: number) => {
      const f = frame3D(anim, sec);
      matRef.current?.setAttribute('d', `M${f.mat.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L')}Z`);
      const items: { el: SVGElement; depth: number }[] = [];
      for (const s of f.segs) {
        const g = groups.current.get(s.key);
        if (!g) continue;
        for (const line of Array.from(g.children) as SVGLineElement[]) {
          line.setAttribute('x1', f1(s.a[0]));
          line.setAttribute('y1', f1(s.a[1]));
          line.setAttribute('x2', f1(s.b[0]));
          line.setAttribute('y2', f1(s.b[1]));
        }
        const main = g.lastElementChild as SVGLineElement;
        main.setAttribute('class', `fig-seg fig-${s.kind} ${s.accent ? 'fig-accent' : 'fig-body'}${s.far ? ' fig-far' : ''}`);
        items.push({ el: g, depth: s.depth });
      }
      const t = f.torso.pts.map((p) => `${f1(p[0])} ${f1(p[1])}`);
      torsoRef.current?.setAttribute('d', `M${t.join('L')}Z`);
      if (torsoRef.current) items.push({ el: torsoRef.current, depth: f.torso.depth });
      headRef.current?.setAttribute('cx', f1(f.head.c[0]));
      headRef.current?.setAttribute('cy', f1(f.head.c[1]));
      if (headRef.current) items.push({ el: headRef.current, depth: f.head.depth });
      // Van achter naar voor in de DOM zetten (alleen verplaatsen als de volgorde verandert).
      items.sort((a, b) => a.depth - b.depth);
      const parent = layer.current;
      if (parent) items.forEach((it, i) => parent.children[i] !== it.el && parent.appendChild(it.el));
    };

    const still = at ?? anim.still;
    draw(still);
    if (!playing || at !== undefined || prefersReducedMotion()) return;
    let unsub: (() => void) | null = null;
    let origin: number | null = null;
    const start = () => {
      if (unsub) return;
      unsub = subscribeFrame((sec) => {
        origin ??= sec - still;
        draw(sec - origin);
      });
    };
    const stop = () => {
      unsub?.();
      unsub = null;
    };
    const el = svgRef.current;
    if (el && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((e) => (e[0]?.isIntersecting ? start() : stop()), { rootMargin: '40px' });
      io.observe(el);
      return () => {
        io.disconnect();
        stop();
      };
    }
    start();
    return stop;
  }, [anim, playing, at]);

  const [vx, vy, vs] = fitViewBox3D(anim);
  return (
    <svg
      ref={svgRef}
      viewBox={`${f1(vx)} ${f1(vy)} ${f1(vs)} ${f1(vs)}`}
      className={`figure ${className}`}
      role="img"
      aria-label={title}
      focusable="false"
    >
      {title && <title>{title}</title>}
      <path ref={matRef} className="fig-mat" />
      <g ref={layer}>
        <path ref={torsoRef} className={`fig-torso-front ${anim.focus.includes('torso') ? 'fig-accent' : 'fig-body'}`} />
        <circle ref={headRef} r={LEN.headR} className="fig-head" />
        {SEG_KEYS.map((k) => (
          <g
            key={k}
            ref={(el) => {
              if (el) groups.current.set(k, el);
            }}
          >
            {(k.startsWith('upper') || k.startsWith('fore')) && (
              <line className={`fig-seg fig-halo fig-halo-${k.startsWith('upper') ? 'upper' : 'fore'}`} />
            )}
            <line className="fig-seg fig-body" />
          </g>
        ))}
      </g>
    </svg>
  );
}
