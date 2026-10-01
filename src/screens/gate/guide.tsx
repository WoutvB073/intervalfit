import type { ReactNode } from 'react';
import type { Environment } from '../../engine/platform';
import type { IconName } from '../../components/Icon';
import { APP_NAME } from '../../config';

export type Step = { icon: IconName; text: ReactNode };

export type Guide = {
  /** Kopje boven de stappen. */
  title: string;
  /** Korte uitleg vóór de stappen (bv. waarom het in Safari moet). */
  intro?: ReactNode;
  steps: Step[];
  /** Waar de wijzende pijl moet staan (de knop zit buiten de pagina, in de browserbalk). */
  arrow?: 'bottom-center' | 'bottom-right' | 'top-right';
  /** Knop "Kopieer link" tonen. */
  copyLink?: boolean;
  /** Extra tip onder de stappen. */
  hint?: ReactNode;
  /** Uitleg bij een eventuele veiligheidsmelding (Android). */
  warning?: ReactNode;
  /** Android, andere browser dan Chrome: eerst via Chrome; de eigen browser als alternatief. */
  viaChrome?: ViaChrome;
};

export type ViaChrome = {
  /** Naam van de huidige browser (voor "Liever in …?"). */
  browserName: string;
  /** Kopje van het uitklapblok; standaard "Liever in <browser>? Zo doe je het daar". */
  altTitle?: string;
  /** Waarom Chrome. */
  intro: ReactNode;
  /** Stappen om het toch in de huidige browser te doen. */
  steps: Step[];
  /** Uitleg bij een veiligheidsmelding in deze browser. */
  warning?: ReactNode;
};

const OPEN_APP: Step = { icon: 'home', text: <>Open {APP_NAME} voortaan via het nieuwe icoon op je beginscherm.</> };

/** Uitleg bij een eventuele veiligheidsmelding van Android (Play Protect) bij het installeren. */
const WARNING_GENERAL: ReactNode = (
  <>
    Zie je een melding dat de app <strong>onveilig</strong> is of niet uit de Play Store komt? {APP_NAME} is een web-app
    van deze website; daarom komt hij niet uit de Play Store. Kies <strong>Meer details</strong> →{' '}
    <strong>Toch installeren</strong>.
  </>
);

/** Stappen als de gebruiker de knop "Openen in Chrome" gebruikt. */
const VIA_CHROME_STEPS: Step[] = [
  { icon: 'compass', text: <>Tik hieronder op <strong>Openen in Chrome</strong>.</> },
  { icon: 'download', text: <>Tik in Chrome op <strong>Installeren</strong> (of ⋮ → <strong>App installeren</strong>).</> },
  OPEN_APP,
];

const BROWSER_NAME: Partial<Record<Environment['browser'], string>> = {
  samsung: 'Samsung Internet',
  firefox: 'Firefox',
  edge: 'Edge',
  opera: 'Opera',
};

/** Android, andere browser dan Chrome: waarom Chrome, en hoe het toch in de eigen browser kan. */
function androidOwnBrowser(env: Environment): ViaChrome {
  const name = BROWSER_NAME[env.browser] ?? 'deze browser';
  if (env.browser === 'samsung') {
    return {
      browserName: name,
      intro: (
        <>
          Via <strong>Samsung Internet</strong> krijg je vaak de melding dat de app <strong>onveilig</strong> is. Via{' '}
          <strong>Chrome</strong> gaat het zonder melding, en blijven de kleuren goed.
        </>
      ),
      steps: [
        { icon: 'menu', text: <>Tik rechtsonder op <strong>☰</strong> (menu).</> },
        { icon: 'addSquare', text: <>Kies <strong>Pagina toevoegen aan</strong> → <strong>Startscherm</strong> (of <strong>App installeren</strong>).</> },
        { icon: 'check', text: <>Tik op <strong>Toevoegen</strong> of <strong>Installeren</strong>.</> },
      ],
      warning: (
        <>
          Zie je <strong>"Gevaarlijke app geblokkeerd"</strong> of <strong>"gemaakt voor een oudere versie van
          Android"</strong>? Dat komt door hoe Samsung Internet apps verpakt, niet door {APP_NAME}. Kies{' '}
          <strong>Meer details</strong> → <strong>Toch installeren</strong> als dat er staat; anders: gebruik Chrome.
        </>
      ),
    };
  }
  const own: Record<string, Step[]> = {
    firefox: [
      { icon: 'dotsVertical', text: <>Tik op <strong>⋮</strong> (menu).</> },
      { icon: 'addSquare', text: <>Kies <strong>Installeren</strong> of <strong>Toevoegen aan startscherm</strong>.</> },
      { icon: 'check', text: <>Tik op <strong>Toevoegen</strong>.</> },
    ],
    edge: [
      { icon: 'more', text: <>Tik onderin op <strong>•••</strong> (menu).</> },
      { icon: 'addSquare', text: <>Kies <strong>Toevoegen aan telefoon</strong> of <strong>App installeren</strong>.</> },
      { icon: 'check', text: <>Tik op <strong>Installeren</strong>.</> },
    ],
    opera: [
      { icon: 'dotsVertical', text: <>Open het menu van Opera (⋮ of het O-icoon).</> },
      { icon: 'addSquare', text: <>Kies <strong>Toevoegen aan</strong> → <strong>Startscherm</strong>.</> },
      { icon: 'check', text: <>Tik op <strong>Toevoegen</strong>.</> },
    ],
  };
  return {
    browserName: name,
    intro: (
      <>
        Installeren werkt het best via <strong>Chrome</strong>: zonder waarschuwingen, en gedeelde workouts komen dan
        direct in de app.
      </>
    ),
    steps: own[env.browser] ?? [
      { icon: 'dotsVertical', text: <>Open het menu van je browser.</> },
      { icon: 'addSquare', text: <>Kies <strong>Toevoegen aan startscherm</strong> of <strong>App installeren</strong>.</> },
      OPEN_APP,
    ],
    warning: WARNING_GENERAL,
  };
}


/** Kiest de juiste installatie-uitleg voor dit toestel en deze browser. */
export function getGuide(env: Environment): Guide {
  // ── Ingebouwde browser van een app (WhatsApp, Instagram, Facebook, …) ──
  if (env.browser === 'inapp' && env.os === 'android') {
    const app = env.inAppName ?? 'een app';
    return {
      title: 'Open deze pagina in Chrome',
      steps: VIA_CHROME_STEPS,
      viaChrome: {
        browserName: app === 'een app' ? 'deze app' : app,
        altTitle: 'Werkt de knop niet? Zo open je Chrome zelf',
        intro: (
          <>
            Je bekijkt deze pagina nu in {app === 'een app' ? 'de ingebouwde browser van een app' : <>de browser van <strong>{app}</strong></>}.
            Daar kun je {APP_NAME} niet installeren. Open hem in <strong>Chrome</strong>.
          </>
        ),
        steps: [
          { icon: 'dotsVertical', text: <>Werkt de knop niet? Tik rechtsboven op <strong>⋮</strong>.</> },
          { icon: 'compass', text: <>Kies <strong>Openen in Chrome</strong> (of <strong>Openen in browser</strong>).</> },
          { icon: 'download', text: <>In Chrome zie je deze pagina weer, met de knop om te installeren.</> },
        ],
      },
    };
  }
  if (env.browser === 'inapp') {
    const app = env.inAppName ?? 'een app';
    const target = env.os === 'ios' ? 'Safari' : 'Chrome';
    return {
      title: `Open deze pagina in ${target}`,
      intro: (
        <>
          Je bekijkt deze pagina nu in {app === 'een app' ? 'de ingebouwde browser van een app' : <>de browser van <strong>{app}</strong></>}.
          Daar kun je {APP_NAME} niet installeren.
        </>
      ),
      steps:
        env.os === 'ios'
          ? [
              { icon: 'more', text: <>Tik op <strong>•••</strong> of op het kompas-icoon (meestal rechtsboven of rechtsonder).</> },
              { icon: 'compass', text: <>Kies <strong>Open in Safari</strong> (of <strong>Open in browser</strong>).</> },
              { icon: 'iosShare', text: <>In Safari zie je deze pagina weer, met de stappen om te installeren.</> },
            ]
          : [
              { icon: 'dotsVertical', text: <>Tik rechtsboven op <strong>⋮</strong>.</> },
              { icon: 'compass', text: <>Kies <strong>Openen in Chrome</strong> (of <strong>Openen in browser</strong>).</> },
              { icon: 'download', text: <>In Chrome zie je deze pagina weer, met de knop om te installeren.</> },
            ],
      copyLink: true,
      hint: <>Lukt dat niet? Kopieer de link en plak hem in de adresbalk van {target}.</>,
    };
  }

  // ── iPhone / iPad ──
  if (env.os === 'ios') {
    if (env.browser !== 'safari') {
      return {
        title: 'Open deze pagina in Safari',
        intro: <>Op de iPhone kun je {APP_NAME} alleen via <strong>Safari</strong> op je beginscherm zetten.</>,
        steps: [
          { icon: 'copy', text: <>Tik hieronder op <strong>Kopieer link</strong>.</> },
          { icon: 'compass', text: <>Open de app <strong>Safari</strong>.</> },
          { icon: 'paste', text: <>Tik op de adresbalk, kies <strong>Plak en ga</strong> en volg daar de stappen.</> },
        ],
        copyLink: true,
      };
    }
    const modern = (env.safariVersion ?? 0) >= 26;
    const where = env.isTablet ? 'rechtsboven' : 'onderin';
    const steps: Step[] = modern
      ? [
          { icon: 'more', text: <>Tik {env.isTablet ? 'rechtsboven' : 'rechtsonder'} op <strong>•••</strong>.</> },
          { icon: 'iosShare', text: <>Tik op <strong>Deel</strong>.</> },
          { icon: 'addSquare', text: <>Kies <strong>Zet op beginscherm</strong>. Zie je het niet? Scroll dan een stukje omlaag.</> },
          { icon: 'toggle', text: <>Zorg dat <strong>Open als webapp</strong> aan staat en tik op <strong>Voeg toe</strong>.</> },
          OPEN_APP,
        ]
      : [
          { icon: 'iosShare', text: <>Tik {where} op de <strong>Deel</strong>-knop.</> },
          { icon: 'addSquare', text: <>Kies <strong>Zet op beginscherm</strong>. Zie je het niet? Scroll dan een stukje omlaag.</> },
          { icon: 'plus', text: <>Tik rechtsboven op <strong>Voeg toe</strong>.</> },
          OPEN_APP,
        ];
    return {
      title: 'Zet de app op je beginscherm',
      steps,
      arrow: env.isTablet ? 'top-right' : modern ? 'bottom-right' : 'bottom-center',
      hint: (
        <>
          Zie je onderin een kompas-icoon, bijvoorbeeld na het openen vanuit WhatsApp? Tik daar eerst op om de pagina in
          Safari te openen.
        </>
      ),
    };
  }

  // ── Android ──
  if (env.os === 'android') {
    if (env.browser === 'chrome') {
      return {
        title: 'Zet de app op je startscherm',
        steps: [
          { icon: 'dotsVertical', text: <>Tik rechtsboven op <strong>⋮</strong>.</> },
          { icon: 'download', text: <>Kies <strong>App installeren</strong> (of <strong>Toevoegen aan startscherm</strong>).</> },
          { icon: 'check', text: <>Tik op <strong>Installeren</strong>. Het icoon verschijnt op je startscherm.</> },
        ],
        arrow: 'top-right',
        hint: <>Zie je dit vanuit WhatsApp of een andere app? Tik dan eerst op ⋮ en kies <strong>Openen in Chrome</strong>.</>,
        warning: WARNING_GENERAL,
      };
    }
    // Alle andere Android-browsers: installeren via Chrome (zonder waarschuwing, kleuren blijven goed).
    return { title: 'Installeer de app via Chrome', viaChrome: androidOwnBrowser(env), steps: VIA_CHROME_STEPS };
  }

  // ── Onbekend mobiel toestel ──
  return {
    title: 'Zet de app op je beginscherm',
    steps: [
      { icon: 'dotsVertical', text: <>Open het menu van je browser.</> },
      { icon: 'addSquare', text: <>Kies <strong>Toevoegen aan beginscherm</strong> of <strong>App installeren</strong>.</> },
      OPEN_APP,
    ],
  };
}
