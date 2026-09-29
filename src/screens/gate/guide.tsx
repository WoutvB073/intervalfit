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
};

const OPEN_APP: Step = { icon: 'home', text: <>Open {APP_NAME} voortaan via het nieuwe icoon op je beginscherm.</> };

/** Kiest de juiste installatie-uitleg voor dit toestel en deze browser. */
export function getGuide(env: Environment): Guide {
  // ── Ingebouwde browser van een app (WhatsApp, Instagram, Facebook, …) ──
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
    if (env.browser === 'samsung') {
      return {
        title: 'Zet de app op je startscherm',
        steps: [
          { icon: 'menu', text: <>Tik rechtsonder op <strong>☰</strong> (menu).</> },
          { icon: 'addSquare', text: <>Kies <strong>Pagina toevoegen aan</strong>.</> },
          { icon: 'home', text: <>Kies <strong>Startscherm</strong> en tik op <strong>Toevoegen</strong>.</> },
          { icon: 'check', text: <>Open {APP_NAME} voortaan via het nieuwe icoon op je startscherm.</> },
        ],
        arrow: 'bottom-right',
      };
    }
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
      };
    }
    return {
      title: 'Open deze pagina in Chrome',
      intro: <>Installeren werkt het best in <strong>Chrome</strong>.</>,
      steps: [
        { icon: 'copy', text: <>Tik hieronder op <strong>Kopieer link</strong>.</> },
        { icon: 'compass', text: <>Open <strong>Chrome</strong>, tik op de adresbalk en plak de link.</> },
        { icon: 'download', text: <>Volg daar de stappen om te installeren.</> },
      ],
      copyLink: true,
      hint: <>Of gebruik het menu van je eigen browser en kies <strong>Toevoegen aan startscherm</strong>.</>,
    };
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
