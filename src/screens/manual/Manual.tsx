import { goBack } from '../../router';
import { IconButton } from '../../components/Button';
import { Icon, type IconName } from '../../components/Icon';
import { APP_NAME } from '../../config';

/**
 * Handleiding voor gebruikers (1 pagina). Ook als pdf: `node tools/manual-pdf.mjs`
 * maakt public/handleiding.pdf uit dit scherm (na een tekstwijziging opnieuw draaien).
 */
export function Manual() {
  return (
    <div className="screen manual">
      <header className="top-bar manual__top">
        <IconButton icon="back" label="Terug" onClick={() => goBack('/instellingen')} />
        <h1 className="top-bar__title">Handleiding</h1>
        <span className="top-bar__spacer" />
      </header>

      <main className="manual__main">
        <div className="manual__intro">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="manual__logo" />
          <div>
            <h2 className="manual__title">{APP_NAME}: zo werkt het</h2>
            <p>
              Korte trainingen waarin je om en om oefent en rust. Alles blijft op je eigen telefoon: geen account, geen
              internet nodig.
            </p>
          </div>
        </div>

        <Step n={1} icon="download" title="Installeren (één keer)">
          <p>
            <strong>iPhone:</strong> open de link in <strong>Safari</strong>. Tik op <strong>•••</strong> of het deel-icoon{' '}
            <Icon name="iosShare" size={16} />, kies <strong>Zet op beginscherm</strong>, laat <strong>Open als webapp</strong>{' '}
            aan staan en tik op <strong>Voeg toe</strong>.
          </p>
          <p>
            <strong>Android:</strong> open de link in <strong>Chrome</strong> (niet in Samsung Internet: daar krijg je vaak
            een melding dat het onveilig is) en tik op <strong>Installeren</strong> (of ⋮ → <strong>App installeren</strong>).
          </p>
          <p>Open de app daarna altijd via het nieuwe icoon op je beginscherm.</p>
        </Step>

        <Step n={2} icon="plus" title="Een workout maken">
          <p>
            Tik op <strong>Nieuwe workout</strong> en geef hem een naam. Kies hoeveel <strong>rondes</strong> je doet en hoe
            lang je rust. Tik op <strong>Oefening toevoegen</strong>, tik de oefeningen aan die je wilt en tik onderaan op{' '}
            <strong>Toevoegen</strong>. Tik op een oefening om de tijd aan te passen of er een eigen foto bij te zetten. Klaar?
            Tik op <strong>Opslaan</strong>.
          </p>
        </Step>

        <Step n={3} icon="play" title="Afspelen">
          <p>
            Tik op <strong>Start</strong>. Na het aftellen wisselen oefenen en rusten elkaar af; de kleur van het scherm laat
            zien wat je doet. In de rust zie je (en hoor je) welke oefening komt. Met de knoppen onderin pauzeer je{' '}
            <Icon name="pause" size={15} />, sla je over <Icon name="skipForward" size={15} /> of begin je een oefening
            opnieuw <Icon name="skipBack" size={15} />. Met ✕ stop je.
          </p>
          <p>
            Het scherm blijft vanzelf aan. Vergrendel je je telefoon, dan pauzeert de workout. Hoor je op een iPhone geen
            piepjes? Zet de stil-knop aan de zijkant uit.
          </p>
        </Step>

        <Step n={4} icon="star" title="Na afloop">
          <p>
            Je ziet hoe lang je hebt getraind, hoeveel je ongeveer hebt verbrand en hoeveel dagen op rij je al traint. Via het
            blokje met het vlammetje op het beginscherm kijk je terug naar al je workouts.
          </p>
        </Step>

        <Step n={5} icon="share" title="Een workout delen">
          <p>
            Tik bij een workout op <strong>•••</strong> → <strong>Delen</strong> → <strong>Delen via WhatsApp, mail…</strong>{' '}
            en kies naar wie. De ander krijgt een link.
          </p>
        </Step>

        <Step n={6} icon="paste" title="Een workout ontvangen">
          <p>
            <strong>iPhone:</strong> houd de link in WhatsApp ingedrukt en kies <strong>Kopieer</strong>. Open {APP_NAME},
            tik op <strong>Workout importeren</strong> → <strong>Plakken</strong> → <strong>Toevoegen</strong>.
          </p>
          <p>
            <strong>Android:</strong> tik op de link; de workout komt meteen in de app. Lukt dat niet, gebruik dan ook{' '}
            <strong>Workout importeren</strong>.
          </p>
        </Step>

        <p className="manual__tip">
          <Icon name="settings" size={18} />
          <span>
            In <strong>Instellingen</strong> kies je geluid, stem, aftellen, kleuren en je naam. Nieuwe telefoon? Maak daar
            eerst een <strong>back-up</strong>.
          </span>
        </p>
        <p className="manual__link">De app: woutvb073.github.io/intervalfit</p>
      </main>
    </div>
  );
}

function Step({ n, icon, title, children }: { n: number; icon: IconName; title: string; children: React.ReactNode }) {
  return (
    <section className="manual-step">
      <span className="manual-step__icon" aria-hidden="true">
        <Icon name={icon} size={20} />
      </span>
      <div>
        <h3>
          {n}. {title}
        </h3>
        {children}
      </div>
    </section>
  );
}
