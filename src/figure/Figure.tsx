import { useEffect, useRef } from 'react';
import { computeSkeleton, cycleLength, fitViewBox, GROUND_Y, LEN, sampleAnim, type FigureAnim, type Part, type Skeleton, type V } from './rig';
import { getAnimation } from './animations';
import { prefersReducedMotion, subscribeFrame } from './ticker';

type Props = {
  exerciseId?: string;
  anim?: FigureAnim;
  /** Bewegen (standaard aan). Uit = stilstaand plaatje van de kenmerkende houding. */
  playing?: boolean;
  /** Vast tijdstip in seconden (voor tests/screenshots); overschrijft `playing`. */
  at?: number;
  /** Vaste sleutelhouding tonen (index); overschrijft `playing`. */
  frame?: number;
  className?: string;
  title?: string;
};

type Seg =
  | 'armFU' | 'armFF' | 'legFT' | 'legFS' | 'legFFoot' | 'torso' | 'legNT' | 'legNS' | 'legNFoot' | 'armNU' | 'armNF'
  | 'haloFU' | 'haloFF' | 'haloNU' | 'haloNF';

function setLine(el: SVGLineElement | null | undefined, a: V, b: V) {
  if (!el) return;
  el.setAttribute('x1', a[0].toFixed(1));
  el.setAttribute('y1', a[1].toFixed(1));
  el.setAttribute('x2', b[0].toFixed(1));
  el.setAttribute('y2', b[1].toFixed(1));
}

function draw(sk: Skeleton, refs: Map<Seg | 'head' | 'torsoPath', SVGElement>) {
  const L = (k: Seg) => refs.get(k) as SVGLineElement | undefined;
  setLine(L('armFU'), sk.shF, sk.elbowF);
  setLine(L('armFF'), sk.elbowF, sk.handF);
  setLine(L('legFT'), sk.hipF, sk.kneeF);
  setLine(L('legFS'), sk.kneeF, sk.ankleF);
  setLine(L('legFFoot'), sk.ankleF, sk.toeF);
  setLine(L('legNT'), sk.hipN, sk.kneeN);
  setLine(L('legNS'), sk.kneeN, sk.ankleN);
  setLine(L('legNFoot'), sk.ankleN, sk.toeN);
  setLine(L('armNU'), sk.shN, sk.elbowN);
  setLine(L('armNF'), sk.elbowN, sk.handN);
  // Rand in achtergrondkleur, zodat armen vóór de romp zichtbaar blijven (vooraanzicht).
  setLine(L('haloFU'), sk.shF, sk.elbowF);
  setLine(L('haloFF'), sk.elbowF, sk.handF);
  setLine(L('haloNU'), sk.shN, sk.elbowN);
  setLine(L('haloNF'), sk.elbowN, sk.handN);
  if (sk.view === 'side') {
    setLine(L('torso'), sk.hip, sk.shoulder);
  } else {
    const p = refs.get('torsoPath');
    const f = (v: V) => `${v[0].toFixed(1)} ${v[1].toFixed(1)}`;
    p?.setAttribute('d', `M${f(sk.shN)}L${f(sk.shF)}L${f(sk.hipF)}L${f(sk.hipN)}Z`);
  }
  const head = refs.get('head');
  head?.setAttribute('cx', sk.head[0].toFixed(1));
  head?.setAttribute('cy', sk.head[1].toFixed(1));
}

/** Geanimeerd figuurtje van een oefening. Kleuren komen uit het thema (CSS-variabelen). */
export function Figure({ exerciseId, anim: animProp, playing = true, at, frame, className = '', title }: Props) {
  const anim = animProp ?? getAnimation(exerciseId);
  const svgRef = useRef<SVGSVGElement>(null);
  const refs = useRef(new Map<Seg | 'head' | 'torsoPath', SVGElement>());

  const staticPose = () => {
    if (!anim) return null;
    if (frame !== undefined) return anim.frames[frame % anim.frames.length]!;
    if (at !== undefined) return sampleAnim(anim, at);
    return anim.frames[anim.still ?? 0]!;
  };

  useEffect(() => {
    if (!anim) return;
    const pose = staticPose();
    if (pose) draw(computeSkeleton(pose, anim.view), refs.current);
    const animate = playing && at === undefined && frame === undefined && !prefersReducedMotion();
    if (!animate) return;

    // Alleen bewegen als het figuurtje in beeld is.
    let unsub: (() => void) | null = null;
    // Start halverwege de eerste beweging-naar-de-kenmerkende-houding, zodat het meteen "leeft".
    const offset = cycleLength(anim) * 0.001;
    const start = () => {
      if (unsub) return;
      unsub = subscribeFrame((sec) => draw(computeSkeleton(sampleAnim(anim, sec + offset), anim.view), refs.current));
    };
    const stop = () => {
      unsub?.();
      unsub = null;
    };
    const el = svgRef.current;
    if (el && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => (entries[0]?.isIntersecting ? start() : stop()), { rootMargin: '40px' });
      io.observe(el);
      return () => {
        io.disconnect();
        stop();
      };
    }
    start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anim, playing, at, frame]);

  if (!anim) return null;

  const focus = new Set<Part>(anim.focus ?? []);
  const cls = (part: Part, far: boolean) =>
    `${focus.has(part) ? 'fig-accent' : 'fig-body'}${far && anim.view === 'side' ? ' fig-far' : ''}`;
  const reg = (k: Seg | 'head' | 'torsoPath') => (el: SVGElement | null) => {
    if (el) refs.current.set(k, el);
  };
  const line = (k: Seg, part: Part, far: boolean, kind: string) => (
    <line ref={reg(k)} className={`fig-seg fig-${kind} ${cls(part, far)}`} />
  );

  const halo = (k: Seg, kind: string) =>
    anim.view === 'front' ? <line ref={reg(k)} className={`fig-seg fig-halo fig-halo-${kind}`} /> : null;
  const farArm = (
    <>
      {halo('haloFU', 'upper')}
      {halo('haloFF', 'fore')}
      {line('armFU', 'arms', true, 'upper')}
      {line('armFF', 'arms', true, 'fore')}
    </>
  );
  const farLeg = (
    <>
      {line('legFT', 'legs', true, 'thigh')}
      {line('legFS', 'legs', true, 'shin')}
      {line('legFFoot', 'legs', true, 'foot')}
    </>
  );
  const nearLeg = (
    <>
      {line('legNT', 'legs', false, 'thigh')}
      {line('legNS', 'legs', false, 'shin')}
      {line('legNFoot', 'legs', false, 'foot')}
    </>
  );
  const nearArm = (
    <>
      {halo('haloNU', 'upper')}
      {halo('haloNF', 'fore')}
      {line('armNU', 'arms', false, 'upper')}
      {line('armNF', 'arms', false, 'fore')}
    </>
  );
  const torso =
    anim.view === 'side' ? (
      line('torso', 'torso', false, 'torso')
    ) : (
      <path ref={reg('torsoPath')} className={`fig-torso-front ${focus.has('torso') ? 'fig-accent' : 'fig-body'}`} />
    );
  const head = <circle ref={reg('head')} r={LEN.headR} className="fig-head" />;

  const [vx, vy, vs] = fitViewBox(anim);
  return (
    <svg
      ref={svgRef}
      viewBox={`${vx.toFixed(1)} ${vy.toFixed(1)} ${vs.toFixed(1)} ${vs.toFixed(1)}`}
      className={`figure ${className}`}
      role="img"
      aria-label={title}
      focusable="false"
    >
      {title && <title>{title}</title>}
      <g transform={anim.mirror ? 'matrix(-1 0 0 1 200 0)' : undefined}>
        <line
          x1={(anim.mirror ? 200 - vx - vs : vx) + 10}
          y1={GROUND_Y}
          x2={(anim.mirror ? 200 - vx : vx + vs) - 10}
          y2={GROUND_Y}
          className="fig-ground"
        />
        {anim.props?.includes('wall') && <rect x="40" y="26" width="18" height={GROUND_Y - 26} rx="3" className="fig-prop" />}
        {anim.props?.includes('bench') && (
          <g className="fig-prop">
            <rect x="14" y="129" width="62" height="8" rx="3" />
            <rect x="20" y="135" width="6" height={GROUND_Y - 135} rx="2" />
            <rect x="64" y="135" width="6" height={GROUND_Y - 135} rx="2" />
          </g>
        )}
        {anim.view === 'side' ? (
          <>
            {farArm}
            {farLeg}
            {torso}
            {head}
            {nearLeg}
            {nearArm}
          </>
        ) : anim.order === 'rear' ? (
          <>
            {head}
            {farArm}
            {nearArm}
            {torso}
            {farLeg}
            {nearLeg}
          </>
        ) : anim.order === 'legsFront' ? (
          <>
            {torso}
            {head}
            {farLeg}
            {nearLeg}
            {farArm}
            {nearArm}
          </>
        ) : (
          <>
            {farLeg}
            {nearLeg}
            {torso}
            {head}
            {farArm}
            {nearArm}
          </>
        )}
      </g>
    </svg>
  );
}
