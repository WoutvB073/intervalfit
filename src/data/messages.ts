import type { HistoryEntry, Message, MessageKind } from '../model/types';
import { APP_NAME } from '../config';
import { getExercise } from './exercises';
import { currentStreak, dayKey, daysBetween, entriesThisWeek, longestStreak, startOfWeek } from '../model/stats';

/**
 * De boodschappenmotor voor het overzicht na afloop.
 *
 * Alle mogelijke boodschappen worden verzameld met een prioriteit (hoe bijzonder); daarna
 * worden er maximaal twee gekozen, de meest bijzondere eerst, uit verschillende groepen.
 * Elke boodschap heeft meerdere varianten. Varianten die bij de laatste workouts al getoond
 * zijn, worden overgeslagen, en gewone boodschappen (reeks, tijdstip…) die de vorige keer al
 * aan bod kwamen, zakken wat in prioriteit. Zo blijft het afwisselend, ook na weken.
 * De keuze is vast per workout (willekeur op basis van het id), en wordt in de geschiedenis bewaard.
 */

export type MessageInput = {
  /** De net afgeronde workout (datum = nu). */
  entry: HistoryEntry;
  /** Alle eerdere workouts (oud → nieuw). */
  previous: HistoryEntry[];
  /** Voornaam uit Instellingen (optioneel). */
  name?: string;
};

export type SummaryText = { headline: string; messages: Message[] };

type Candidate = {
  id: string;
  kind: MessageKind;
  prio: number;
  variants: string[];
  vars?: Record<string, string | number>;
  badge?: number;
};

// ── Mijlpalen ────────────────────────────────────────────────────
const COUNT_MILESTONES = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 175, 200, 250, 300, 365, 400, 500, 600, 750, 1000];
const STREAK_MILESTONES = [3, 5, 7, 10, 14, 21, 30, 40, 50, 60, 75, 100, 150, 200, 250, 300, 365];
const HOUR_MILESTONES = [1, 2, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 300, 500];
const EXERCISE_MIN_MILESTONES = [30, 60, 120, 300, 600, 1200];
const REPEAT_MILESTONES = [5, 10, 20, 25, 30, 40, 50, 75, 100, 150, 200];

/** Hoeveel eerdere workouts meetellen voor "niet herhalen". */
const RECENT_WINDOW = 14;
/** Gewone boodschappen (prioriteit < 70) die de laatste 2 keer al kwamen, zakken zoveel. */
const COOLDOWN_PENALTY = 15;

// ── Teksten ──────────────────────────────────────────────────────
const HEADLINES = {
  done: [
    'Goed gedaan!',
    'Klaar!',
    'Top gedaan!',
    'Knap gedaan!',
    'Sterk gedaan!',
    'Workout voltooid!',
    'Mooi gedaan!',
    'Zo, die zit erop!',
    'Lekker gewerkt!',
    'Goed gedaan, {naam}!',
    'Top gedaan, {naam}!',
    'Knap werk, {naam}!',
  ],
  first: ['Je eerste workout!'],
  stopped: ['Goed bezig!', 'Mooi gewerkt!', 'Lekker bewogen!', 'Elke minuut telt!', 'Goed bezig, {naam}!'],
};

const T = {
  first: [
    'Je allereerste workout zit erop. Het begin is gemaakt!',
    'Workout nummer 1! Dit is het begin van iets goeds.',
    'Je eerste workout met {app}. Wat een mooie start, {naam}!',
  ],
  count5: ['Al je 5e workout! Het begint een gewoonte te worden.', 'Vijf workouts gedaan. Je bent goed op weg!'],
  count10: ['Tien workouts! Dat is echt een prestatie.', 'Dubbele cijfers: dit was je 10e workout!', 'Je 10e workout, {naam}. Daar mag je trots op zijn!'],
  count: [
    'Workout nummer {n}! Wat een mijlpaal.',
    'Al {n} workouts gedaan. Daar mag je trots op zijn.',
    'Dit was je {ne} workout. Hoe mooi is dat, {naam}!',
    'Mijlpaal: {n} workouts! Je laat zien dat je het volhoudt.',
  ],
  streak3: [
    'Drie dagen op rij! Je zit in een mooi ritme.',
    '3 dagen achter elkaar getraind. Zo bouw je een gewoonte.',
    'Drie dagen op rij, {naam}. Je bent lekker op dreef!',
  ],
  streak7: ['Een hele week elke dag getraind. Petje af!', '7 dagen op rij, {naam}! Een volle week.'],
  streak: [
    '{n} dagen op rij getraind! Knap volgehouden.',
    'Al {n} dagen achter elkaar. Die reeks is goud waard.',
    'Een reeks van {n} dagen, {naam}! Ga zo door.',
    '{n} dagen op rij: je laat je door niets tegenhouden.',
  ],
  streakOngoing: [
    'Dag {n} op rij. Lekker bezig!',
    'Je reeks staat nu op {n} dagen.',
    '{n} dagen achter elkaar, en het gaat steeds makkelijker.',
    'Je reeks groeit: {n} dagen op rij.',
    'Weer een dag erbij: {n} op rij.',
  ],
  hours: [
    'In totaal heb je nu al {uren} getraind met {app}!',
    'Je teller staat op {uren} training. Indrukwekkend!',
    'Al {uren} bewogen sinds je begon. Wat een doorzetter!',
    'Mijlpaal: {uren} training in totaal, {naam}!',
  ],
  longest: [
    'Je langste workout ooit: {tijd}!',
    'Nieuw record: nog nooit trainde je zo lang achter elkaar.',
    '{tijd} volgehouden. Dat is je langste workout tot nu toe!',
  ],
  kcal: ['Nog nooit zoveel verbrand: ongeveer {kcal} kcal!', 'Record: zo’n {kcal} kcal in één workout!'],
  comeback: [
    'Fijn dat je er weer bent! Na {dagen} dagen weer lekker bezig.',
    'Welkom terug, {naam}! Mooi dat je de draad weer oppakt.',
    'Weer begonnen, en dat is vaak het moeilijkste stuk. Goed zo!',
  ],
  exerciseTotal: [
    'In totaal heb je nu al {tijd} {oefening} gedaan!',
    'Mijlpaal: al {tijd} {oefening} in totaal. {tip}',
    '{Oefening}: inmiddels {tijd} in totaal. Dat merk je!',
  ],
  repeat: [
    'Al voor de {ne} keer {workout}. Die ken je inmiddels uit je hoofd!',
    '{workout} voor de {ne} keer gedaan. Trouw aan je favoriet!',
  ],
  week: [
    'Al je {ne} workout deze week!',
    '{n} workouts deze week. Wat een week!',
    'Deze week al {n} keer getraind. Dat is flink!',
    'Je {ne} workout van deze week. Wat ben je goed bezig!',
    '{n} keer getraind deze week, {naam}. Knap hoor!',
  ],
  moreThanLastWeek: [
    'Deze week heb je nu al meer getraind dan de hele vorige week!',
    'Met deze workout ga je voorbij je totaal van vorige week.',
  ],
  twiceToday: ['Tweede workout vandaag. Dubbel goed bezig!', 'Vandaag al {n} keer getraind. Indrukwekkend!', 'Nog een rondje erbij vandaag. Knap, {naam}!'],
  topExercise: [
    '{tijd} {oefening} vandaag. {tip}',
    'Vandaag de meeste tijd aan {oefening}: {tijd}. {tip}',
    'Je deed vandaag {tijd} {oefening}. {tip}',
    'Hoofdrol vandaag: {oefening}, {tijd} lang. {tip}',
    'Maar liefst {tijd} {oefening}! {tip}',
  ],
  early: [
    'Vroege vogel! Om {uur} al getraind.',
    'Al getraind voordat de dag goed en wel begonnen is.',
    'Wat een sportieve start van de dag, {naam}!',
  ],
  late: ['Nog even getraind in de late avond. Knap!', 'Wat een sportieve afsluiting van de dag.', 'Ook ’s avonds laat nog in beweging. Goed zo!'],
  weekend: ['Ook in het weekend actief. Mooi!', 'Een sportieve {dag}. Zo wordt het weekend nog beter.'],
  monday: ['Goed begin van de week!', 'Maandag en meteen actief. Zo zet je de toon.'],
  friday: ['Sportief de week uit. Fijn weekend straks!', 'Vrijdag en nog lekker bezig. Top!'],
  newMonth: ['Je eerste workout van {maand}. Mooie start van de maand!', '{Maand} is sportief begonnen!'],
  stopped: [
    'Je hebt {tijd} getraind. Elke minuut telt mee!',
    'Soms is korter precies goed. {Tijd} beweging is gewoon winst.',
    'Luisteren naar je lijf is ook sterk. Je hebt {tijd} bewogen.',
    'Niet alles, maar wel {tijd} beweging. Die telt gewoon mee.',
    'Beter {tijd} dan niets. Goed dat je bent begonnen, {naam}!',
    'Ook een korte workout houdt je sterk. {Tijd}: afgevinkt.',
  ],
  compliment: [
    'Weer een workout in de pocket.',
    'Je lijf bedankt je straks.',
    'Zo word je sterker: gewoon doen, en dat deed je.',
    'Goed voor je spieren, goed voor je humeur.',
    'Die {tijd} waren helemaal voor jezelf. Mooi.',
    'Je hebt het gewoon weer gedaan. Dat is de kunst.',
    'Sterk volgehouden tot het eind.',
    'Gezonde gewoonte: afgevinkt.',
    'Hier mag je best trots op zijn.',
    'Lekker bezig, {naam}.',
    '{naam}, je bent goed op dreef.',
    'Weer een stapje fitter.',
    'Je hebt {werk} echt gewerkt. Dat telt.',
    'Nu even rustig aan met een kop koffie of thee. Verdiend!',
    'Je trainde niet alleen je spieren, maar ook je doorzettingsvermogen.',
    '{workout}: afgevinkt!',
    'Kleine moeite, groot effect.',
    'Voel je het? Dat is nieuwe energie.',
    'Workout nummer {n}. Je bouwt iets moois op.',
    'Je hart, spieren en humeur varen er wel bij.',
    'Volhouden is het geheim, en jij doet het.',
    'Een goede investering in jezelf.',
    'Knap dat je er tijd voor maakte.',
    'Tot het laatste fluitje doorgezet. Goed zo!',
  ],
};

const CATEGORY_TIP: Record<string, string[]> = {
  benen: ['Sterke benen maak je zo.', 'Je benen worden er sterker van.'],
  boven: ['Goed voor je armen en schouders.', 'Zo worden je armen sterker.'],
  core: ['Goed voor een sterke buik en rug.', 'Je buik en rug worden er sterker van.'],
  cardio: ['Goed voor je hart en conditie.', 'Je conditie gaat er flink op vooruit.'],
  eigen: ['Lekker gewerkt.', 'Mooi volgehouden.'],
};

const WEEKDAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

// ── Hulpjes ──────────────────────────────────────────────────────

/** Voorspelbare willekeur op basis van een tekst (mulberry32). */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** "45 seconden", "1 minuut", "12 minuten", "1 uur en 5 minuten". */
export function durationText(sec: number): string {
  const s = Math.round(sec);
  if (s < 60) return `${s} seconden`;
  const min = s < 120 ? Math.floor(s / 60) : Math.round(s / 60);
  if (min < 60) return min === 1 ? '1 minuut' : `${min} minuten`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} uur` : `${h} uur en ${m} ${m === 1 ? 'minuut' : 'minuten'}`;
}

/** Tijd per oefening: onder 2 minuten in seconden ("90 seconden"), anders in minuten. */
function exerciseTime(sec: number): string {
  return sec < 120 ? `${Math.round(sec)} seconden` : durationText(sec);
}

/** Oefeningnaam midden in een zin: bibliotheeknamen met kleine letter. */
function inSentence(x: { key: string; name: string }): string {
  return getExercise(x.key) ? x.name.charAt(0).toLowerCase() + x.name.slice(1) : x.name;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => {
    const v = vars[k] ?? vars[k.toLowerCase()];
    if (v === undefined) return m;
    const s = String(v);
    return k.charAt(0) === k.charAt(0).toUpperCase() && k.charAt(0) !== k.charAt(0).toLowerCase() ? cap(s) : s;
  });
}

const sameDay = (a: Date, b: Date) => dayKey(a) === dayKey(b);

// ── De motor ─────────────────────────────────────────────────────

export function composeSummary({ entry, previous, name }: MessageInput): SummaryText {
  const rand = seededRandom(entry.id);
  const now = new Date(entry.date);
  const all = [...previous, entry];
  const n = all.length;
  const naam = name?.trim() ?? '';
  const baseVars: Record<string, string | number> = {
    app: APP_NAME,
    naam,
    n,
    ne: `${n}e`,
    tijd: durationText(entry.totalSec),
    werk: durationText(entry.workSec),
    workout: entry.workoutName,
  };

  const cands: Candidate[] = [];
  const add = (c: Candidate) => cands.push(c);

  const last = previous[previous.length - 1];
  const firstToday = !previous.some((e) => sameDay(new Date(e.date), now));
  const streak = currentStreak(all, now);

  // Allereerste workout
  if (n === 1) add({ id: 'eerste', kind: 'first', prio: 100, variants: T.first });

  // Aantal workouts
  if (COUNT_MILESTONES.includes(n)) {
    add({ id: `aantal`, kind: 'count', prio: 95, badge: n, variants: n === 5 ? T.count5 : n === 10 ? T.count10 : T.count });
  }

  // Gestopt (vanaf 1 minuut): altijd een aangepaste, positieve boodschap
  if (!entry.completed) add({ id: 'gestopt', kind: 'stopped', prio: 92, variants: T.stopped });

  // Reeks
  if (firstToday && streak >= 2) {
    // Mijlpaal als het een nieuwe persoonlijke beste reeks is (of vanaf een week); anders gewoon "dag X op rij".
    const special = STREAK_MILESTONES.includes(streak) && (streak > longestStreak(previous) || streak >= 7);
    if (special) {
      add({ id: 'reeks', kind: 'streak', prio: 90, badge: streak, variants: streak === 3 ? T.streak3 : streak === 7 ? T.streak7 : T.streak, vars: { n: streak } });
    } else {
      add({ id: 'reeks-loopt', kind: 'streak', prio: 55, badge: streak, variants: T.streakOngoing, vars: { n: streak } });
    }
  }

  // Totale trainingstijd
  const prevSec = previous.reduce((s, e) => s + e.totalSec, 0);
  const crossedHours = HOUR_MILESTONES.filter((h) => prevSec < h * 3600 && prevSec + entry.totalSec >= h * 3600).pop();
  if (crossedHours) {
    add({ id: 'uren', kind: 'hours', prio: 74, badge: crossedHours, variants: T.hours, vars: { uren: crossedHours === 1 ? '1 uur' : `${crossedHours} uur` } });
  }

  // Records (pas vanaf een paar eerdere workouts)
  if (previous.length >= 3) {
    const maxSec = Math.max(...previous.map((e) => e.totalSec));
    const maxKcal = Math.max(...previous.map((e) => e.kcal));
    if (entry.totalSec > maxSec + 15) add({ id: 'langste', kind: 'record', prio: 80, variants: T.longest });
    else if (entry.kcal > maxKcal) add({ id: 'kcal', kind: 'record', prio: 78, variants: T.kcal, vars: { kcal: entry.kcal } });
  }

  // Welkom terug na een pauze
  if (last) {
    const gap = daysBetween(new Date(last.date), now);
    if (gap >= 7) add({ id: 'terug', kind: 'comeback', prio: 75, variants: T.comeback, vars: { dagen: gap } });
  }

  // Totaal per oefening (bv. "al een uur squats")
  let bestEx: { x: HistoryEntry['perExercise'][number]; min: number } | undefined;
  for (const x of entry.perExercise) {
    const before = previous.reduce((s, e) => s + (e.perExercise.find((p) => p.key === x.key)?.workSec ?? 0), 0);
    const crossed = EXERCISE_MIN_MILESTONES.filter((m) => before < m * 60 && before + x.workSec >= m * 60).pop();
    if (crossed && (!bestEx || crossed > bestEx.min)) bestEx = { x, min: crossed };
  }
  if (bestEx) {
    const cat = getExercise(bestEx.x.key)?.category ?? 'eigen';
    add({
      id: 'oefening-totaal',
      kind: 'exercise',
      prio: 62,
      variants: T.exerciseTotal,
      vars: { tijd: bestEx.min === 60 ? 'een uur' : durationText(bestEx.min * 60), oefening: inSentence(bestEx.x), tip: pick(CATEGORY_TIP[cat]!, rand) },
    });
  }

  // Dezelfde workout vaker gedaan
  const sameWorkout = all.filter((e) => e.workoutId === entry.workoutId).length;
  if (REPEAT_MILESTONES.includes(sameWorkout)) {
    add({ id: 'favoriet', kind: 'count', prio: 70, variants: T.repeat, vars: { ne: `${sameWorkout}e` } });
  }

  // Deze week
  const thisWeek = entriesThisWeek(all, now);
  if ([3, 5, 7].includes(thisWeek.length)) add({ id: 'week', kind: 'week', prio: 65, variants: T.week, vars: { n: thisWeek.length, ne: `${thisWeek.length}e` } });
  const weekSec = thisWeek.reduce((s, e) => s + e.totalSec, 0);
  const lastWeekStart = new Date(startOfWeek(now).getTime() - 3 * 86_400_000); // een dag in vorige week
  const lastWeekSec = entriesThisWeek(previous, lastWeekStart).reduce((s, e) => s + e.totalSec, 0);
  if (lastWeekSec > 0 && weekSec > lastWeekSec && weekSec - entry.totalSec <= lastWeekSec) {
    add({ id: 'meer-dan-vorige-week', kind: 'week', prio: 58, variants: T.moreThanLastWeek });
  }

  // Vaker vandaag
  if (!firstToday) {
    const today = all.filter((e) => sameDay(new Date(e.date), now)).length;
    add({ id: 'vandaag', kind: 'week', prio: 60, variants: T.twiceToday, vars: { n: today } });
  }

  // Oefening waar vandaag de meeste tijd in zat
  const top = [...entry.perExercise].sort((a, b) => b.workSec - a.workSec)[0];
  if (top && top.workSec >= 60) {
    const cat = getExercise(top.key)?.category ?? 'eigen';
    add({
      id: 'topoefening',
      kind: 'exercise',
      prio: 45,
      variants: T.topExercise,
      vars: { tijd: exerciseTime(top.workSec), oefening: inSentence(top), tip: pick(CATEGORY_TIP[cat]!, rand) },
    });
  }

  // Tijdstip en dag
  const hour = now.getHours();
  const dow = now.getDay();
  if (hour < 8) add({ id: 'vroeg', kind: 'time', prio: 42, variants: T.early, vars: { uur: `${hour}:${String(now.getMinutes()).padStart(2, '0')}` } });
  else if (hour >= 21) add({ id: 'laat', kind: 'time', prio: 42, variants: T.late });
  if (dow === 0 || dow === 6) add({ id: 'weekend', kind: 'time', prio: 36, variants: T.weekend, vars: { dag: WEEKDAYS[dow]! } });
  else if (dow === 1 && thisWeek.length === 1) add({ id: 'maandag', kind: 'time', prio: 36, variants: T.monday });
  else if (dow === 5) add({ id: 'vrijdag', kind: 'time', prio: 34, variants: T.friday });
  if (last && !previous.some((e) => new Date(e.date).getMonth() === now.getMonth() && new Date(e.date).getFullYear() === now.getFullYear())) {
    add({ id: 'maand', kind: 'time', prio: 38, variants: T.newMonth, vars: { maand: MONTHS[now.getMonth()]! } });
  }

  // Altijd beschikbaar: een compliment (niet bij een gestopte workout; die heeft een eigen boodschap)
  if (entry.completed) add({ id: 'compliment', kind: 'compliment', prio: 20, variants: T.compliment });

  // ── Kiezen ──
  const recent = previous.slice(-RECENT_WINDOW);
  const recentKeys = new Set(recent.flatMap((e) => (e.messages ?? []).map((m) => m.key)));
  const recentIds = new Set(previous.slice(-2).flatMap((e) => (e.messages ?? []).map((m) => m.key.split('.')[0])));

  const scored = cands
    .map((c) => ({ c, score: c.prio - (c.prio < 70 && recentIds.has(c.id) ? COOLDOWN_PENALTY : 0), tie: rand() }))
    .sort((a, b) => b.score - a.score || a.tie - b.tie);

  const chosen: Candidate[] = [];
  for (const { c } of scored) {
    if (chosen.length === 0) chosen.push(c);
    else if (c.kind !== 'compliment' && c.prio >= 34 && !chosen.some((x) => x.kind === c.kind && c.kind !== 'record')) {
      chosen.push(c);
      break;
    }
  }

  // Kop: niet dezelfde als de laatste paar keer
  const pool = n === 1 ? HEADLINES.first : entry.completed ? HEADLINES.done : HEADLINES.stopped;
  const recentHeads = new Set(previous.slice(-3).map((e) => e.headline));
  const usable = pool.filter((h) => naam || !h.includes('{naam}'));
  const fresh = usable.filter((h) => !recentHeads.has(fill(h, baseVars)));
  const headTemplate = pick(fresh.length ? fresh : usable, rand);
  const headline = fill(headTemplate, baseVars);

  // De naam hooguit één keer op het scherm.
  let nameLeft = headTemplate.includes('{naam}') ? '' : naam;
  const messages = chosen.map((c) => {
    const vars = { ...baseVars, ...(c.vars ?? {}) };
    const i = pickVariant(c, nameLeft, recentKeys, rand);
    if (c.variants[i]!.includes('{naam}')) nameLeft = '';
    return { key: `${c.id}.${i}`, kind: c.kind, text: fill(c.variants[i]!, vars), ...(c.badge ? { badge: c.badge } : {}) } satisfies Message;
  });

  return { headline, messages };
}

function pick<T>(list: T[], rand: () => number): T {
  return list[Math.floor(rand() * list.length)]!;
}

/** Variant kiezen: geen naam-varianten zonder naam, en liefst niet recent getoond. */
function pickVariant(c: Candidate, naam: string, recentKeys: Set<string>, rand: () => number): number {
  const idx = c.variants.map((_, i) => i).filter((i) => naam || !c.variants[i]!.includes('{naam}'));
  const fresh = idx.filter((i) => !recentKeys.has(`${c.id}.${i}`));
  return pick(fresh.length ? fresh : idx, rand);
}
