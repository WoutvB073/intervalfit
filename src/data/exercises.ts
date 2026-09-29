import type { Category, LibraryExercise } from '../model/types';

/**
 * De oefeningenbibliotheek.
 *
 * Een oefening toevoegen = één blok hieronder toevoegen:
 * - `id`: uniek, kleine letters met streepjes (wordt ook in gedeelde links gebruikt, dus niet meer wijzigen)
 * - `name`: de naam in de app
 * - `aliases`: zoekwoorden, zowel Nederlands als Engels
 * - `spoken`: (optioneel) hoe de Nederlandse stem de naam moet uitspreken
 * - `instruction`: één korte zin
 * - `met`: geschatte inspanning (MET) voor de calorieberekening
 * - `defaultWorkSec`: standaard werktijd bij toevoegen
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
    instruction: 'Voeten op heupbreedte, zak met je billen naar achteren alsof je gaat zitten en kom weer omhoog.',
  },
  {
    id: 'jump-squats', name: 'Jump squats', category: 'benen', met: 8.0, defaultWorkSec: 30,
    aliases: ['jump squat', 'springsquats', 'sprongsquat', 'kniebuiging met sprong'],
    spoken: 'djump skwots',
    instruction: 'Zak door in een squat en spring explosief omhoog; land zacht door je knieën te buigen.',
  },
  {
    id: 'sumo-squats', name: 'Sumo squats', category: 'benen', met: 5.0, defaultWorkSec: 40,
    aliases: ['sumo squat', 'brede squat', 'sumo kniebuiging'],
    spoken: 'soemo skwots',
    instruction: 'Zet je voeten breed met de tenen naar buiten en zak recht naar beneden met een rechte rug.',
  },
  {
    id: 'lunges', name: 'Uitvalspassen', category: 'benen', met: 4.0, defaultWorkSec: 40,
    aliases: ['lunges', 'lunge', 'uitvalspas', 'uitval'],
    instruction: 'Stap ver naar voren en zak tot beide knieën ongeveer een hoek van 90 graden maken; wissel af.',
  },
  {
    id: 'reverse-lunges', name: 'Uitvalspassen achterwaarts', category: 'benen', met: 4.0, defaultWorkSec: 40,
    aliases: ['reverse lunges', 'reverse lunge', 'achterwaartse uitvalspas', 'uitval achteruit'],
    instruction: 'Stap ver naar achteren en zak door tot je achterste knie bijna de grond raakt; wissel af.',
  },
  {
    id: 'side-lunges', name: 'Zijwaartse uitvalspassen', category: 'benen', met: 4.0, defaultWorkSec: 40,
    aliases: ['side lunges', 'side lunge', 'zijwaartse uitvalspas', 'uitval opzij'],
    instruction: 'Stap breed opzij, buig die knie en houd het andere been gestrekt; wissel af.',
  },
  {
    id: 'glute-bridge', name: 'Glute bridge', category: 'benen', met: 3.5, defaultWorkSec: 40,
    aliases: ['bruggetje', 'heupheffen', 'bilbrug', 'bridge', 'glute bridges'],
    spoken: 'gloet bridzj',
    instruction: 'Lig op je rug met gebogen knieën en duw je heupen omhoog tot je lichaam een rechte lijn is.',
  },
  {
    id: 'wall-sit', name: 'Muurzit', category: 'benen', met: 3.5, defaultWorkSec: 30,
    aliases: ['wall sit', 'muur zitten', 'stoeltje tegen de muur'],
    instruction: 'Zit met je rug tegen de muur alsof er een stoel onder je staat, knieën in een hoek van 90 graden.',
  },
  {
    id: 'calf-raises', name: 'Kuitheffen', category: 'benen', met: 3.0, defaultWorkSec: 40,
    aliases: ['calf raises', 'calf raise', 'op de tenen staan', 'kuiten'],
    instruction: 'Kom rustig zo hoog mogelijk op je tenen en zak gecontroleerd weer terug.',
  },
  {
    id: 'side-leg-raises-left', name: 'Side leg raises links', category: 'benen', met: 3.0, defaultWorkSec: 30,
    aliases: ['side leg raises', 'side leg raise', 'zijwaarts been heffen', 'been heffen zij', 'zijligging', 'abductie', 'links', 'linkerbeen'],
    spoken: 'saaid leg reezes, links',
    instruction: 'Lig op je rechterzij in een rechte lijn en hef je gestrekte linkerbeen rustig tot ongeveer 45 graden en weer omlaag.',
  },
  {
    id: 'side-leg-raises-right', name: 'Side leg raises rechts', category: 'benen', met: 3.0, defaultWorkSec: 30,
    aliases: ['side leg raises', 'side leg raise', 'zijwaarts been heffen', 'been heffen zij', 'zijligging', 'abductie', 'rechts', 'rechterbeen'],
    spoken: 'saaid leg reezes, rechts',
    instruction: 'Lig op je linkerzij in een rechte lijn en hef je gestrekte rechterbeen rustig tot ongeveer 45 graden en weer omlaag.',
  },
  {
    id: 'donkey-kicks', name: 'Donkey kicks', category: 'benen', met: 3.5, defaultWorkSec: 30,
    aliases: ['donkey kick', 'ezelschop', 'been naar achteren', 'billen'],
    spoken: 'donkie kiks',
    instruction: 'Op handen en knieën: duw één gebogen been met de voetzool richting het plafond; wissel af.',
  },
  {
    id: 'fire-hydrants', name: 'Fire hydrants', category: 'benen', met: 3.5, defaultWorkSec: 30,
    aliases: ['fire hydrant', 'brandkraan', 'been opzij', 'billen'],
    spoken: 'faajer haaidrants',
    instruction: 'Op handen en knieën: til één gebogen been opzij tot heuphoogte en zet het weer neer; wissel af.',
  },

  // ── Bovenlichaam ───────────────────────────────────────────────
  {
    id: 'push-ups', name: 'Opdrukken', category: 'boven', met: 3.8, defaultWorkSec: 30,
    aliases: ['push-ups', 'push ups', 'pushups', 'push-up', 'opdrukker'],
    instruction: 'Handen iets breder dan je schouders, lichaam in een rechte lijn, zak met je borst naar de grond en duw terug.',
  },
  {
    id: 'knee-push-ups', name: 'Opdrukken op je knieën', category: 'boven', met: 3.3, defaultWorkSec: 30,
    aliases: ['knie push-ups', 'knee push-ups', 'knee push ups', 'knie opdrukken', 'makkelijk opdrukken'],
    instruction: 'Zoals opdrukken, maar met je knieën op de grond; houd je rug recht van knieën tot hoofd.',
  },
  {
    id: 'tricep-dips', name: 'Tricep dips', category: 'boven', met: 3.8, defaultWorkSec: 30,
    aliases: ['dips', 'dippen', 'triceps', 'stoel dips', 'tricep dip'],
    spoken: 'traiseps dips',
    instruction: 'Handen achter je op de rand van een stoel, buig je ellebogen naar achteren en duw jezelf weer omhoog.',
  },
  {
    id: 'plank-shoulder-taps', name: 'Plank met schoudertikken', category: 'boven', met: 4.0, defaultWorkSec: 30,
    aliases: ['plank shoulder taps', 'shoulder taps', 'schoudertikken', 'schouder tikken'],
    instruction: 'In de opdrukhouding tik je om en om met een hand je andere schouder aan, zonder te wiebelen.',
  },
  {
    id: 'arm-circles', name: 'Armcirkels', category: 'boven', met: 2.8, defaultWorkSec: 30,
    aliases: ['arm circles', 'armen draaien', 'armzwaaien', 'rondjes armen'],
    instruction: 'Strek je armen opzij en maak kleine, snelle rondjes; halverwege de andere kant op.',
  },
  {
    id: 'superman', name: 'Superman', category: 'boven', met: 3.0, defaultWorkSec: 30,
    aliases: ['supermans', 'rugoefening', 'vliegen', 'rug'],
    spoken: 'soeperman',
    instruction: 'Lig op je buik en til tegelijk je armen, borst en benen een stukje van de grond.',
  },

  // ── Core ───────────────────────────────────────────────────────
  {
    id: 'plank', name: 'Plank', category: 'core', met: 3.5, defaultWorkSec: 30,
    aliases: ['planken', 'plankhouding', 'onderarmsteun'],
    spoken: 'plenk',
    instruction: 'Steun op je onderarmen en tenen en houd je lichaam als een rechte plank; buik aangespannen.',
  },
  {
    id: 'side-plank-left', name: 'Zijplank links', category: 'core', met: 3.5, defaultWorkSec: 25,
    aliases: ['side plank', 'side plank links', 'zijplank', 'zijwaartse plank'],
    spoken: 'zijplank, links',
    instruction: 'Steun op je linker onderarm en de zijkant van je voet en houd je heupen hoog in een rechte lijn.',
  },
  {
    id: 'side-plank-right', name: 'Zijplank rechts', category: 'core', met: 3.5, defaultWorkSec: 25,
    aliases: ['side plank', 'side plank rechts', 'zijplank', 'zijwaartse plank'],
    spoken: 'zijplank, rechts',
    instruction: 'Steun op je rechter onderarm en de zijkant van je voet en houd je heupen hoog in een rechte lijn.',
  },
  {
    id: 'crunches', name: 'Crunches', category: 'core', met: 3.8, defaultWorkSec: 30,
    aliases: ['crunch', 'buikspieren', 'buikspieroefening'],
    spoken: 'krunsjes',
    instruction: 'Lig op je rug met gebogen knieën en rol je schouders omhoog richting je knieën.',
  },
  {
    id: 'sit-ups', name: 'Sit-ups', category: 'core', met: 3.8, defaultWorkSec: 30,
    aliases: ['sit ups', 'situps', 'sit-up', 'buikspieren', 'opzitten'],
    spoken: 'sit-ups',
    instruction: 'Lig op je rug met gebogen knieën en kom helemaal omhoog tot zit; rol rustig terug.',
  },
  {
    id: 'bicycle-crunches', name: 'Bicycle crunches', category: 'core', met: 4.0, defaultWorkSec: 30,
    aliases: ['bicycle crunch', 'fietsen', 'fiets crunches', 'fietscrunches', 'schuine buikspieren'],
    spoken: 'baaisiekel krunsjes',
    instruction: 'Op je rug fiets je met je benen en breng steeds je elleboog naar de tegenovergestelde knie.',
  },
  {
    id: 'russian-twists', name: 'Russian twists', category: 'core', met: 4.0, defaultWorkSec: 30,
    aliases: ['russian twist', 'russische draai', 'draaien', 'schuine buikspieren'],
    spoken: 'rusjen twists',
    instruction: 'Zit met je bovenlijf iets achterover en draai je handen om en om naast je heupen.',
  },
  {
    id: 'leg-raises', name: 'Beenheffen', category: 'core', met: 3.5, defaultWorkSec: 30,
    aliases: ['leg raises', 'leg raise', 'benen heffen', 'benen optillen', 'onderbuik'],
    instruction: 'Lig op je rug, druk je onderrug in de grond en til je gestrekte benen omhoog en weer omlaag.',
  },
  {
    id: 'flutter-kicks', name: 'Flutter kicks', category: 'core', met: 3.8, defaultWorkSec: 30,
    aliases: ['flutter kick', 'scharen', 'fladderen', 'benen op en neer', 'onderbuik'],
    spoken: 'flutter kiks',
    instruction: 'Lig op je rug met gestrekte benen net boven de grond en beweeg ze snel om en om op en neer.',
  },
  {
    id: 'dead-bug', name: 'Dead bug', category: 'core', met: 3.0, defaultWorkSec: 30,
    aliases: ['dead bugs', 'dode kever', 'kever'],
    spoken: 'dedd bug',
    instruction: 'Op je rug met armen en knieën omhoog: strek om en om een arm en het andere been uit.',
  },
  {
    id: 'bird-dog', name: 'Bird dog', category: 'core', met: 3.0, defaultWorkSec: 30,
    aliases: ['bird dogs', 'vogel hond', 'viervoetstand', 'arm en been strekken'],
    spoken: 'burd dog',
    instruction: 'Op handen en knieën strek je tegelijk een arm naar voren en het andere been naar achteren; wissel af.',
  },
  {
    id: 'hollow-hold', name: 'Hollow hold', category: 'core', met: 3.5, defaultWorkSec: 25,
    aliases: ['hollow body', 'schuitje', 'bananenhouding', 'banaan'],
    spoken: 'hollo hoold',
    instruction: 'Lig op je rug en til je gestrekte armen en benen iets op, met je onderrug tegen de grond.',
  },

  // ── Cardio ─────────────────────────────────────────────────────
  {
    id: 'jumping-jacks', name: 'Jumping jacks', category: 'cardio', met: 7.7, defaultWorkSec: 30,
    aliases: ['jumping jack', 'spreidsprong', 'spreidsprongen', 'springen'],
    spoken: 'djumping djeks',
    instruction: 'Spring je benen uit elkaar terwijl je armen boven je hoofd klappen, en spring terug.',
  },
  {
    id: 'high-knees', name: 'High knees', category: 'cardio', met: 8.0, defaultWorkSec: 30,
    aliases: ['high knee', 'knieheffen', 'knieën hoog', 'hoge knieën'],
    spoken: 'haai niez',
    instruction: 'Ren op de plaats en trek je knieën zo hoog mogelijk op, tot heuphoogte.',
  },
  {
    id: 'butt-kicks', name: 'Hakken-billen', category: 'cardio', met: 8.0, defaultWorkSec: 30,
    aliases: ['butt kicks', 'butt kick', 'hakken billen', 'hielen naar billen'],
    instruction: 'Ren op de plaats en tik met je hakken zo vaak mogelijk tegen je billen.',
  },
  {
    id: 'burpees', name: 'Burpees', category: 'cardio', met: 8.0, defaultWorkSec: 30,
    aliases: ['burpee', 'squat thrust met sprong'],
    spoken: 'burrpies',
    instruction: 'Hurk, spring met je voeten naar achteren in de opdrukhouding, spring terug en spring omhoog.',
  },
  {
    id: 'mountain-climbers', name: 'Mountain climbers', category: 'cardio', met: 8.0, defaultWorkSec: 30,
    aliases: ['mountain climber', 'bergbeklimmer', 'klimmen', 'knieën naar borst'],
    spoken: 'mauntun klaaimers',
    instruction: 'In de opdrukhouding trek je om en om snel een knie naar je borst.',
  },
  {
    id: 'skaters', name: 'Skaters', category: 'cardio', met: 7.0, defaultWorkSec: 30,
    aliases: ['skater', 'schaatssprong', 'schaatssprongen', 'schaatsen'],
    spoken: 'skeeters',
    instruction: 'Spring zijwaarts van het ene been op het andere, als een schaatser.',
  },
  {
    id: 'squat-thrusts', name: 'Squat thrusts', category: 'cardio', met: 7.5, defaultWorkSec: 30,
    aliases: ['squat thrust', 'hurksprong', 'burpee zonder sprong'],
    spoken: 'skwot thrusts',
    instruction: 'Hurk met je handen op de grond, spring met je voeten naar achteren en weer terug naar hurkzit.',
  },
  {
    id: 'jog-in-place', name: 'Joggen op de plaats', category: 'cardio', met: 7.0, defaultWorkSec: 45,
    aliases: ['jog in place', 'jogging', 'hardlopen op de plaats', 'rennen', 'joggen'],
    instruction: 'Jog ontspannen op de plaats en zwaai je armen mee.',
  },
];

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string | undefined): LibraryExercise | undefined {
  return id ? BY_ID.get(id) : undefined;
}
