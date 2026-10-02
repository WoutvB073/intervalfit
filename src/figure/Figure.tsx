import { useEffect, useRef } from 'react';
import { BAR_Y, computeSkeleton, cycleLength, fitViewBox, GROUND_Y, LEN, sampleAnim, STEP, type FigureAnim, type Part, type Skeleton, type V } from './rig';
import { getAnimation } from './animations';
import { getAnimation3D } from './anim3d';
import { Figure3D } from './Figure3D';
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

type Ref = Seg | 'head' | 'torsoPath' | 'hipDotF' | 'hipDotN' | 'gearN' | 'gearF';

/** Materiaal in de hand (dumbbell of handgreep om de stang) meebewegen met de hand. */
function placeGear(el: SVGElement | undefined, hand: V, elbow: V) {
  if (!el) return;
  // Hoek van de onderarm (0 = omlaag); de dumbbell staat haaks daarop.
  const a = (Math.atan2(hand[0] - elbow[0], hand[1] - elbow[1]) * 180) / Math.PI;
  const turn = el.classList.contains('fig-grip') ? '' : ` rotate(${(-a).toFixed(1)})`;
  el.setAttribute('transform', `translate(${hand[0].toFixed(1)} ${hand[1].toFixed(1)})${turn}`);
}

function setLine(el: SVGLineElement | null | undefined, a: V, b: V) {
  if (!el) return;
  el.setAttribute('x1', a[0].toFixed(1));
  el.setAttribute('y1', a[1].toFixed(1));
  el.setAttribute('x2', b[0].toFixed(1));
  el.setAttribute('y2', b[1].toFixed(1));
}

function draw(sk: Skeleton, refs: Map<Ref, SVGElement>) {
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
  for (const [k, p] of [['hipDotF', sk.hipF], ['hipDotN', sk.hipN]] as const) {
    const dot = refs.get(k);
    dot?.setAttribute('cx', p[0].toFixed(1));
    dot?.setAttribute('cy', p[1].toFixed(1));
  }
  // Goblet: de dumbbell staat evenwijdig aan de romp (de "onderarm" is dan de lijn heup → schouder).
  placeGear(refs.get('gearN'), sk.handN, refs.get('gearN')?.classList.contains('fig-gear--goblet') ? [sk.handN[0] - (sk.shoulder[0] - sk.hip[0]), sk.handN[1] - (sk.shoulder[1] - sk.hip[1])] : sk.elbowN);
  placeGear(refs.get('gearF'), sk.handF, sk.elbowF);
  const head = refs.get('head');
  head?.setAttribute('cx', sk.head[0].toFixed(1));
  head?.setAttribute('cy', sk.head[1].toFixed(1));
}

/** Geanimeerd figuurtje van een oefening. Kleuren komen uit het thema (CSS-variabelen). */
export function Figure(props: Props) {
  // Oefeningen met een 3D-animatie (draaiende camera) apart tekenen.
  const a3 = props.anim ? undefined : getAnimation3D(props.exerciseId);
  if (a3) return <Figure3D anim={a3} playing={props.playing} at={props.at} className={props.className} title={props.title} />;
  return <Figure2D {...props} />;
}

function Figure2D({ exerciseId, anim: animProp, playing = true, at, frame, className = '', title }: Props) {
  const anim = animProp ?? getAnimation(exerciseId);
  const svgRef = useRef<SVGSVGElement>(null);
  const refs = useRef(new Map<Ref, SVGElement>());

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
  const cls = (part: Part, far: boolean) => {
    const side = (part === 'legs' ? 'leg' : part === 'arms' ? 'arm' : '') + (far ? 'F' : 'N');
    const on = focus.has(part) || focus.has(side as Part);
    return `${on ? 'fig-accent' : 'fig-body'}${far && anim.view === 'side' ? ' fig-far' : ''}`;
  };
  const reg = (k: Ref) => (el: SVGElement | null) => {
    if (el) refs.current.set(k, el);
  };
  const line = (k: Seg, part: Part, far: boolean, kind: string) => (
    <line ref={reg(k)} className={`fig-seg fig-${kind} ${cls(part, far)}`} />
  );

  const halo = (k: Seg, kind: string) =>
    anim.view === 'front' ? <line ref={reg(k)} className={`fig-seg fig-halo fig-halo-${kind}`} /> : null;
  // Dumbbell of handgreep (bij pull-ups/chin-ups) aan de hand.
  const gear = (k: 'gearN' | 'gearF', far: boolean) => {
    const cls = `fig-gear${far && anim.view === 'side' ? ' fig-gear--far' : ''}`;
    if (anim.dumbbells === 'side') {
      return (
        <g ref={reg(k)} className={cls}>
          <line x1={-9} y1={0} x2={9} y2={0} className="fig-gear__handle" />
          <rect x={-14} y={-8} width={6.5} height={16} rx={2} />
          <rect x={7.5} y={-8} width={6.5} height={16} rx={2} />
        </g>
      );
    }
    if (anim.dumbbells === 'goblet') {
      // Eén dumbbell, rechtop tegen de borst, met beide handen vast (alleen bij de "dichtbij"-hand tekenen).
      if (far) return null;
      return (
        <g ref={reg(k)} className={`${cls} fig-gear--goblet`}>
          <line x1={0} y1={-9} x2={0} y2={9} className="fig-gear__handle" />
          <rect x={-8.5} y={-16} width={17} height={7.5} rx={2.5} />
          <rect x={-8.5} y={8.5} width={17} height={7.5} rx={2.5} />
        </g>
      );
    }
    if (anim.dumbbells === 'end') {
      return (
        <g ref={reg(k)} className={cls}>
          <circle r={8.5} />
          <circle r={3} className="fig-gear__hub" />
        </g>
      );
    }
    if (anim.grip) {
      // Rechtop gehouden (geen draaiing nodig): vuist om de stang, bij onderhands met de handpalm naar voren.
      return (
        <g ref={reg(k)} className={`fig-grip fig-grip--${anim.grip}`}>
          <rect x={-6.5} y={anim.grip === 'over' ? -7.5 : -3.5} width={13} height={11} rx={4.5} />
          {anim.grip === 'under' && <rect x={-4} y={2.5} width={8} height={3} rx={1.5} className="fig-grip__palm" />}
        </g>
      );
    }
    return null;
  };
  const farArm = (
    <>
      {halo('haloFU', 'upper')}
      {halo('haloFF', 'fore')}
      {line('armFU', 'arms', true, 'upper')}
      {line('armFF', 'arms', true, 'fore')}
      {gear('gearF', true)}
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
      {gear('gearN', false)}
    </>
  );
  const torso =
    anim.view === 'side' ? (
      line('torso', 'torso', false, 'torso')
    ) : (
      <path ref={reg('torsoPath')} className={`fig-torso-front ${focus.has('torso') ? 'fig-accent' : 'fig-body'}`} />
    );
  const head = (
    <>
      <circle ref={reg('head')} r={LEN.headR} className="fig-head" />
      {focus.has('hipF') && <circle ref={reg('hipDotF')} r={7.5} className="fig-hip" />}
      {focus.has('hipN') && <circle ref={reg('hipDotN')} r={7.5} className="fig-hip" />}
    </>
  );

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
        {anim.topDown ? (
          <rect x={vx + 12} y={vy + vs * 0.22} width={vs - 24} height={vs * 0.56} rx="14" className="fig-mat" />
        ) : (
        <line
          x1={(anim.mirror ? 200 - vx - vs : vx) + 10}
          y1={GROUND_Y}
          x2={(anim.mirror ? 200 - vx : vx + vs) - 10}
          y2={GROUND_Y}
          className="fig-ground"
        />
        )}
        {anim.props?.includes('wall') && <rect x="40" y="26" width="18" height={GROUND_Y - 26} rx="3" className="fig-prop" />}
        {anim.props?.includes('bench') && (
          <g className="fig-prop">
            <rect x="14" y="129" width="62" height="8" rx="3" />
            <rect x="20" y="135" width="6" height={GROUND_Y - 135} rx="2" />
            <rect x="64" y="135" width="6" height={GROUND_Y - 135} rx="2" />
          </g>
        )}
        {anim.props?.includes('step') && (
          <g className="fig-prop">
            <rect x={STEP.x1} y={STEP.top} width={STEP.x2 - STEP.x1} height={GROUND_Y - STEP.top + 1} rx="4" />
            <rect x={STEP.x1} y={STEP.top} width={STEP.x2 - STEP.x1} height="6" rx="3" className="fig-prop__edge" />
          </g>
        )}
        {anim.props?.includes('bar') && (
          <g className="fig-bar">
            {/* Deurpost met de stang ertussen */}
            <rect x="26" y={BAR_Y - 30} width="8" height={GROUND_Y - BAR_Y + 30} rx="3" className="fig-bar__post" />
            <rect x="166" y={BAR_Y - 30} width="8" height={GROUND_Y - BAR_Y + 30} rx="3" className="fig-bar__post" />
            <rect x="30" y={BAR_Y - 3} width="140" height="6" rx="3" />
          </g>
        )}
        {anim.props?.includes('barSide') && (
          <g className="fig-bar">
            <rect x="26" y={BAR_Y - 30} width="8" height={GROUND_Y - BAR_Y + 30} rx="3" className="fig-bar__post" />
            <rect x="30" y={BAR_Y - 3} width="70" height="6" rx="3" />
            <circle cx="100" cy={BAR_Y} r="5.5" />
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
        ) : anim.order === 'hang' ? (
          <>
            {farLeg}
            {nearLeg}
            {torso}
            {farArm}
            {nearArm}
            {head}
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
