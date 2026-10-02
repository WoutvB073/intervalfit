import type { Category, Equipment, LibraryExercise, WorkoutExercise } from '../model/types';

/**
 * De oefeningenbibliotheek.
 *
 * Een oefening toevoegen = één blok hieronder toevoegen:
 * - `id`: uniek, kleine letters met streepjes (wordt ook in gedeelde links gebruikt, dus niet meer wijzigen)
 * - `name`: de naam in de app
 * - `aliases`: zoekwoorden, zowel Nederlands als Engels
 * - `spoken`: (optioneel) hoe de Nederlandse stem de naam moet uitspreken
 * - `instruction`: één korte zin (max. ± 60 tekens), het belangrijkste aandachtspunt
 * - `met`: geschatte inspanning (MET) voor de calorieberekening
 * - `defaultWorkSec`: standaard werktijd bij toevoegen
 * - `equipment`: (optioneel) 'stoel', 'dumbbells' of 'stang'; weglaten = zonder materiaal
 * Elke oefening heeft ook een animatie nodig in src/figure/animations.ts (zelfde id); zie README.
 */

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'benen', label: 'Benen & billen' },
  { id: 'boven', label: 'Bovenlichaam' },
  { id: 'core', label: 'Core' },
  { id: 'cardio', label: 'Cardio' },
];

export const EXERCISES: LibraryExercise[] = [
  // ── Benen & billen ──────────────────────────────────────────────
  {
    id: 'squats', name: 'Squats', category: 'benen', met: 5.0, defaultWorkSec: 40,
    aliases: ['squat', 'kniebuiging', 'kniebuigingen', 'hurken'],
    spoken: 'skwots',
    instruction: 'Billen naar achteren, knieën achter je tenen.',
  },
  {
    id: 'jump-squats', name: 'Jump squats', category: 'benen', met: 8.0, defaultWorkSec: 30,
    aliases: ['jump squat', 'springsquats', 'sprongsquat', 'kniebuiging met sprong'],
    spoken: 'djump skwots',
    instruction: 'Diep zakken, krachtig springen, zacht landen.',
  },
  {
    id: 'sumo-squats', name: 'Sumo squats', category: 'benen', met: 5.0, defaultWorkSec: 40,
    aliases: ['sumo squat', 'brede squat', 'sumo kniebuiging'],
    spoken: 'soemo skwots',
    instruction: 'Voeten breed, tenen naar buiten, rug recht.',
  },
  {
    id: 'goblet-squats', name: 'Goblet squats', category: 'benen', met: 5.5, defaultWorkSec: 40, equipment: 'dumbbells',
    aliases: ['goblet squat', 'squat met dumbbell', 'squat met halter', 'kniebuiging met gewicht', 'goblet', 'squats', 'dumbbells', 'halters'],
    spoken: 'goblet skwots',
    instruction: 'Dumbbell tegen je borst, rug recht, billen naar achteren.',
  },

  {
    id: 'lunges', name: 'Uitvalspassen', category: 'benen', met: 4.0, defaultWorkSec: 40,
    aliases: ['lunges', 'lunge', 'uitvalspas', 'uitval'],
    instruction: 'Grote stap vooruit, beide knieën 90 graden.',
  },
  {
    id: 'reverse-lunges', name: 'Uitvalspassen achterwaarts', category: 'benen', met: 4.0, defaultWorkSec: 40,
    aliases: ['reverse lunges', 'reverse lunge', 'achterwaartse uitvalspas', 'uitval achteruit'],
    instruction: 'Stap achteruit, voorste knie boven je enkel.',
  },
  {
    id: 'side-lunges', name: 'Zijwaartse uitvalspassen', category: 'benen', met: 4.0, defaultWorkSec: 40,
    aliases: ['side lunges', 'side lunge', 'zijwaartse uitvalspas', 'uitval opzij'],
    instruction: 'Stap opzij, buig die knie, ander been gestrekt.',
  },
  {
    id: 'glute-bridge', name: 'Glute bridge', category: 'benen', met: 3.5, defaultWorkSec: 40,
    aliases: ['bruggetje', 'heupheffen', 'bilbrug', 'bridge', 'glute bridges'],
    spoken: 'gloet bridzj',
    instruction: 'Heupen omhoog tot je lichaam een rechte lijn is.',
  },
  {
    id: 'wall-sit', name: 'Muurzit', category: 'benen', met: 3.5, defaultWorkSec: 30,
    aliases: ['wall sit', 'muur zitten', 'stoeltje tegen de muur'],
    instruction: 'Rug tegen de muur, knieën in een hoek van 90°.',
  },
  {
    id: 'calf-raises', name: 'Kuitheffen', category: 'benen', met: 3.0, defaultWorkSec: 40,
    aliases: ['calf raises', 'calf raise', 'op de tenen staan', 'kuiten'],
    instruction: 'Rustig hoog op je tenen en weer omlaag.',
  },
  {
    id: 'side-leg-raises-left', name: 'Side leg raises links', category: 'benen', met: 3.0, defaultWorkSec: 30,
    aliases: ['side leg raises', 'side leg raise', 'zijwaarts been heffen', 'been heffen zij', 'zijligging', 'abductie', 'links', 'linkerbeen'],
    spoken: 'saaid leg reezes, links',
    instruction: 'Op je rechterzij, linkerbeen gestrekt omhoog.',
  },
  {
    id: 'side-leg-raises-right', name: 'Side leg raises rechts', category: 'benen', met: 3.0, defaultWorkSec: 30,
    aliases: ['side leg raises', 'side leg raise', 'zijwaarts been heffen', 'been heffen zij', 'zijligging', 'abductie', 'rechts', 'rechterbeen'],
    spoken: 'saaid leg reezes, rechts',
    instruction: 'Op je linkerzij, rechterbeen gestrekt omhoog.',
  },
  {
    id: 'step-ups', name: 'Step-ups', category: 'benen', met: 6.0, defaultWorkSec: 40, equipment: 'stoel',
    aliases: ['step up', 'step ups', 'opstappen', 'op en af stappen', 'traptrede', 'stoel', 'bankje'],
    spoken: 'step-ups',
    instruction: 'Hele voet op de trede, omhoog duwen met je voorste been.',
  },
  {
    id: 'single-leg-bridge-left', name: 'Single-leg bridge links', category: 'benen', met: 3.5, defaultWorkSec: 30,
    aliases: ['single-leg glute bridge', 'single leg glute bridge', 'glute bridge één been', 'bilbrug één been', 'bruggetje één been', 'links'],
    spoken: 'singul leg bridzj, links',
    instruction: 'Linkervoet plat, rechterbeen gestrekt, heupen omhoog.',
  },
  {
    id: 'single-leg-bridge-right', name: 'Single-leg bridge rechts', category: 'benen', met: 3.5, defaultWorkSec: 30,
    aliases: ['single-leg glute bridge', 'single leg glute bridge', 'glute bridge één been', 'bilbrug één been', 'bruggetje één been', 'rechts'],
    spoken: 'singul leg bridzj, rechts',
    instruction: 'Rechtervoet plat, linkerbeen gestrekt, heupen omhoog.',
  },

  {
    id: 'donkey-kicks', name: 'Donkey kicks', category: 'benen', met: 3.5, defaultWorkSec: 30,
    aliases: ['donkey kick', 'ezelschop', 'been naar achteren', 'billen'],
    spoken: 'donkie kiks',
    instruction: 'Knie gebogen, voetzool naar het plafond.',
  },

  // ── Bovenlichaam ───────────────────────────────────────────────
  {
    id: 'push-ups', name: 'Opdrukken', category: 'boven', met: 3.8, defaultWorkSec: 30,
    aliases: ['push-ups', 'push ups', 'pushups', 'push-up', 'opdrukker'],
    instruction: 'Lichaam als een plank, borst naar de grond.',
  },
  {
    id: 'knee-push-ups', name: 'Opdrukken op je knieën', category: 'boven', met: 3.3, defaultWorkSec: 30,
    aliases: ['knie push-ups', 'knee push-ups', 'knee push ups', 'knie opdrukken', 'makkelijk opdrukken'],
    instruction: 'Knieën op de grond, rug recht tot je hoofd.',
  },
  {
    id: 'tricep-dips', name: 'Tricep dips', category: 'boven', met: 3.8, defaultWorkSec: 30, equipment: 'stoel',
    aliases: ['dips', 'dippen', 'triceps', 'stoel dips', 'tricep dip'],
    spoken: 'traiseps dips',
    instruction: 'Handen op de stoel achter je, ellebogen naar achteren.',
  },
  {
    id: 'plank-shoulder-taps', name: 'Plank met schoudertikken', category: 'boven', met: 4.0, defaultWorkSec: 30,
    aliases: ['plank shoulder taps', 'shoulder taps', 'schoudertikken', 'schouder tikken'],
    instruction: 'Tik om en om je schouder aan, heupen stil.',
  },
  {
    id: 'arm-circles', name: 'Armcirkels', category: 'boven', met: 2.8, defaultWorkSec: 30,
    aliases: ['arm circles', 'armen draaien', 'armzwaaien', 'rondjes armen'],
    instruction: 'Armen gestrekt opzij, kleine snelle rondjes.',
  },
  {
    id: 'superman', name: 'Superman', category: 'boven', met: 3.0, defaultWorkSec: 30,
    aliases: ['supermans', 'rugoefening', 'vliegen', 'rug'],
    spoken: 'soeperman',
    instruction: 'Op je buik: armen, borst en benen omhoog.',
  },
  {
    id: 'pike-push-ups', name: 'Pike push-ups', category: 'boven', met: 4.0, defaultWorkSec: 30,
    aliases: ['pike push up', 'pike pushups', 'opdrukken', 'schouders', 'v opdrukken', 'omgekeerde v'],
    spoken: 'paik poesj-ups',
    instruction: 'Heupen hoog als een V, hoofd richting de grond.',
  },
  {
    id: 'plank-up-downs', name: 'Plank up-downs', category: 'boven', met: 4.5, defaultWorkSec: 30,
    aliases: ['plank up down', 'up downs', 'plank op en neer', 'van onderarm naar hand', 'plank'],
    spoken: 'plenk up-dauns',
    instruction: 'Om en om van onderarmen naar handen, heupen stil.',
  },
  {
    id: 'bicep-curls', name: 'Bicep curls', category: 'boven', met: 3.5, defaultWorkSec: 40, equipment: 'dumbbells',
    aliases: ['biceps curls', 'bicep curl', 'arm curls', 'biceps', 'dumbbells', 'halters', 'gewichtjes'],
    spoken: 'baaiseps kurrls',
    instruction: 'Ellebogen tegen je zij, handpalmen naar boven.',
  },
  {
    id: 'bicep-curls-left', name: 'Bicep curls links', category: 'boven', met: 3.5, defaultWorkSec: 30, equipment: 'dumbbells',
    aliases: ['biceps curls links', 'bicep curl links', 'arm curls', 'biceps', 'dumbbells', 'halters', 'gewichtjes', 'links'],
    spoken: 'baaiseps kurrls, links',
    instruction: 'Linkerarm: elleboog tegen je zij, handpalm naar boven.',
  },
  {
    id: 'bicep-curls-right', name: 'Bicep curls rechts', category: 'boven', met: 3.5, defaultWorkSec: 30, equipment: 'dumbbells',
    aliases: ['biceps curls rechts', 'bicep curl rechts', 'arm curls', 'biceps', 'dumbbells', 'halters', 'gewichtjes', 'rechts'],
    spoken: 'baaiseps kurrls, rechts',
    instruction: 'Rechterarm: elleboog tegen je zij, handpalm naar boven.',
  },

  {
    id: 'hammer-curls', name: 'Hammer curls', category: 'boven', met: 3.5, defaultWorkSec: 40, equipment: 'dumbbells',
    aliases: ['hammer curl', 'hamer curls', 'biceps', 'dumbbells', 'halters', 'gewichtjes'],
    spoken: 'hemmer kurrls',
    instruction: 'Duimen naar boven, om en om, ellebogen stil.',
  },
  {
    id: 'pull-ups', name: 'Pull-ups', category: 'boven', met: 8.0, defaultWorkSec: 20, equipment: 'stang',
    aliases: ['pull up', 'pullups', 'optrekken', 'optrekstang', 'bovenhands', 'rug'],
    spoken: 'poel-ups',
    instruction: 'Bovenhands en breed: optrekken tot je kin boven de stang.',
  },
  {
    id: 'chin-ups', name: 'Chin-ups', category: 'boven', met: 8.0, defaultWorkSec: 20, equipment: 'stang',
    aliases: ['chin up', 'chinups', 'optrekken', 'optrekstang', 'onderhands', 'biceps'],
    spoken: 'tsjin-ups',
    instruction: 'Onderhands en smal: optrekken tot je kin boven de stang.',
  },


  // ── Core ───────────────────────────────────────────────────────
  {
    id: 'plank', name: 'Plank', category: 'core', met: 3.5, defaultWorkSec: 30,
    aliases: ['planken', 'plankhouding', 'onderarmsteun'],
    spoken: 'plenk',
    instruction: 'Op je onderarmen, lichaam recht, buik aan.',
  },
  {
    id: 'side-plank-left', name: 'Zijplank links', category: 'core', met: 3.5, defaultWorkSec: 25,
    aliases: ['side plank', 'side plank links', 'zijplank', 'zijwaartse plank'],
    spoken: 'zijplank, links',
    instruction: 'Op je linker onderarm, heupen hoog en recht.',
  },
  {
    id: 'side-plank-right', name: 'Zijplank rechts', category: 'core', met: 3.5, defaultWorkSec: 25,
    aliases: ['side plank', 'side plank rechts', 'zijplank', 'zijwaartse plank'],
    spoken: 'zijplank, rechts',
    instruction: 'Op je rechter onderarm, heupen hoog en recht.',
  },
  {
    id: 'crunches', name: 'Crunches', category: 'core', met: 3.8, defaultWorkSec: 30,
    aliases: ['crunch', 'buikspieren', 'buikspieroefening'],
    spoken: 'krunsjes',
    instruction: 'Schouders omhoog richting je knieën.',
  },
  {
    id: 'sit-ups', name: 'Sit-ups', category: 'core', met: 3.8, defaultWorkSec: 30,
    aliases: ['sit ups', 'situps', 'sit-up', 'buikspieren', 'opzitten'],
    spoken: 'sit-ups',
    instruction: 'Helemaal omhoog tot zit, rustig terug.',
  },
  {
    id: 'bicycle-crunches', name: 'Bicycle crunches', category: 'core', met: 4.0, defaultWorkSec: 30,
    aliases: ['bicycle crunch', 'fietsen', 'fiets crunches', 'fietscrunches', 'schuine buikspieren'],
    spoken: 'baaisiekel krunsjes',
    instruction: 'Elleboog naar de andere knie, benen fietsen.',
  },
  {
    id: 'russian-twists', name: 'Russian twists', category: 'core', met: 4.0, defaultWorkSec: 30,
    aliases: ['russian twist', 'russische draai', 'draaien', 'schuine buikspieren'],
    spoken: 'rusjen twists',
    instruction: 'Iets achterover, handen om en om naast je heup.',
  },
  {
    id: 'leg-raises', name: 'Beenheffen', category: 'core', met: 3.5, defaultWorkSec: 30,
    aliases: ['leg raises', 'leg raise', 'benen heffen', 'benen optillen', 'onderbuik'],
    instruction: 'Onderrug op de grond, gestrekte benen omhoog.',
  },
  {
    id: 'flutter-kicks', name: 'Flutter kicks', category: 'core', met: 3.8, defaultWorkSec: 30,
    aliases: ['flutter kick', 'scharen', 'fladderen', 'benen op en neer', 'onderbuik'],
    spoken: 'flutter kiks',
    instruction: 'Benen net boven de grond, snel op en neer.',
  },
  {
    id: 'dead-bug', name: 'Dead bug', category: 'core', met: 3.0, defaultWorkSec: 30,
    aliases: ['dead bugs', 'dode kever', 'kever'],
    spoken: 'dedd bug',
    instruction: 'Arm en tegenovergesteld been om en om strekken.',
  },
  {
    id: 'bird-dog', name: 'Bird dog', category: 'core', met: 3.0, defaultWorkSec: 30,
    aliases: ['bird dogs', 'vogel hond', 'viervoetstand', 'arm en been strekken'],
    spoken: 'burd dog',
    instruction: 'Arm vooruit en ander been achteruit, rug recht.',
  },
  {
    id: 'hollow-hold', name: 'Hollow hold', category: 'core', met: 3.5, defaultWorkSec: 25,
    aliases: ['hollow body', 'schuitje', 'bananenhouding', 'banaan'],
    spoken: 'hollo hoold',
    instruction: 'Armen en benen iets omhoog, onderrug op de grond.',
  },
  {
    id: 'v-ups', name: 'V-ups', category: 'core', met: 4.0, defaultWorkSec: 30,
    aliases: ['v up', 'vups', 'v-up', 'zakmes', 'jackknife', 'buikspieren'],
    spoken: 'vee-ups',
    instruction: 'Armen en gestrekte benen tegelijk omhoog tot een V.',
  },
  {
    id: 'heel-touches', name: 'Hielen tikken', category: 'core', met: 3.0, defaultWorkSec: 30,
    aliases: ['heel touches', 'heel touch', 'heel taps', 'hiel aantikken', 'schuine buikspieren'],
    instruction: 'Schouders los van de grond, om en om je hiel aantikken.',
  },
  {
    id: 'hanging-knee-raises', name: 'Hangend knieheffen', category: 'core', met: 4.0, defaultWorkSec: 30, equipment: 'stang',
    aliases: ['hanging knee raises', 'hanging knee raise', 'knee raises', 'knieheffen', 'optrekstang', 'hangen'],
    instruction: 'Hang stil, knieën rustig omhoog tot heuphoogte.',
  },


  // ── Cardio ─────────────────────────────────────────────────────
  {
    id: 'jumping-jacks', name: 'Jumping jacks', category: 'cardio', met: 7.7, defaultWorkSec: 30,
    aliases: ['jumping jack', 'spreidsprong', 'spreidsprongen', 'springen'],
    spoken: 'djumping djeks',
    instruction: 'Benen uit elkaar, armen omhoog, en terug.',
  },
  {
    id: 'high-knees', name: 'High knees', category: 'cardio', met: 8.0, defaultWorkSec: 30,
    aliases: ['high knee', 'knieheffen', 'knieën hoog', 'hoge knieën'],
    spoken: 'haai niez',
    instruction: 'Ren op de plaats, knieën tot heuphoogte.',
  },
  {
    id: 'butt-kicks', name: 'Hakken-billen', category: 'cardio', met: 8.0, defaultWorkSec: 30,
    aliases: ['butt kicks', 'butt kick', 'hakken billen', 'hielen naar billen'],
    instruction: 'Ren op de plaats, hakken tegen je billen.',
  },
  {
    id: 'burpees', name: 'Burpees', category: 'cardio', met: 8.0, defaultWorkSec: 30,
    aliases: ['burpee', 'squat thrust met sprong'],
    spoken: 'burrpies',
    instruction: 'Hurken, naar plank springen, terug en omhoog.',
  },
  {
    id: 'mountain-climbers', name: 'Mountain climbers', category: 'cardio', met: 8.0, defaultWorkSec: 30,
    aliases: ['mountain climber', 'bergbeklimmer', 'klimmen', 'knieën naar borst'],
    spoken: 'mauntun klaaimers',
    instruction: 'In de plank om en om een knie naar je borst.',
  },
  {
    id: 'skaters', name: 'Skaters', category: 'cardio', met: 7.0, defaultWorkSec: 30,
    aliases: ['skater', 'schaatssprong', 'schaatssprongen', 'schaatsen'],
    spoken: 'skeeters',
    instruction: 'Spring opzij van het ene been op het andere.',
  },
  {
    id: 'squat-thrusts', name: 'Squat thrusts', category: 'cardio', met: 7.5, defaultWorkSec: 30,
    aliases: ['squat thrust', 'hurksprong', 'burpee zonder sprong'],
    spoken: 'skwot thrusts',
    instruction: 'Van hurkzit naar plank springen en terug.',
  },
  {
    id: 'jog-in-place', name: 'Joggen op de plaats', category: 'cardio', met: 7.0, defaultWorkSec: 45,
    aliases: ['jog in place', 'jogging', 'hardlopen op de plaats', 'rennen', 'joggen'],
    instruction: 'Ontspannen joggen op de plaats, armen mee.',
  },
];

export const EQUIPMENT: { id: Equipment; label: string; short: string }[] = [
  { id: 'geen', label: 'Zonder materiaal', short: 'Geen' },
  { id: 'stoel', label: 'Stoel of trap', short: 'Stoel' },
  { id: 'dumbbells', label: 'Dumbbells', short: 'Dumbbells' },
  { id: 'stang', label: 'Optrekstang', short: 'Stang' },
];

export function equipmentOf(e: LibraryExercise): Equipment {
  return e.equipment ?? 'geen';
}

/**
 * Oefeningen die uit de bibliotheek zijn gehaald (id → naam). Bestaande workouts, gedeelde links en back-ups
 * met zo'n oefening blijven werken: de oefening wordt een eigen oefening met dezelfde naam en tijden.
 * Een id hier nooit hergebruiken voor een nieuwe oefening.
 */
export const REMOVED_EXERCISES: Record<string, string> = {
  'fire-hydrants': 'Fire hydrants',
};

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string | undefined): LibraryExercise | undefined {
  return id ? BY_ID.get(id) : undefined;
}

/** Oefening uit een workout die niet (meer) in de bibliotheek staat → eigen oefening (naam en tijden blijven). */
export function toKnownExercise(e: WorkoutExercise): WorkoutExercise {
  if (!e.libraryId || BY_ID.has(e.libraryId)) return e;
  const { libraryId, ...rest } = e;
  return { ...rest, name: e.name || REMOVED_EXERCISES[libraryId] || 'Oefening' };
}

/** Zelfde voor een hele workout (geeft dezelfde workout terug als er niets verandert). */
export function withKnownExercises<W extends { exercises: WorkoutExercise[] }>(w: W): W {
  return w.exercises.some((e) => e.libraryId && !BY_ID.has(e.libraryId)) ? { ...w, exercises: w.exercises.map(toKnownExercise) } : w;
}
