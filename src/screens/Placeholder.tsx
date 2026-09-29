import { IconButton } from '../components/Button';
import { Icon } from '../components/Icon';
import { goBack } from '../router';

/** Tijdelijk scherm voor onderdelen die in een volgende bouwstap komen. */
export function Placeholder({ title, step, text }: { title: string; step?: number; text?: string }) {
  return (
    <div className="screen">
      <header className="top-bar">
        <IconButton icon="back" label="Terug" onClick={() => goBack()} />
        <h1 className="top-bar__title">{title}</h1>
        <span className="top-bar__spacer" />
      </header>
      <main className="placeholder">
        <div className="empty__art" aria-hidden="true">
          <Icon name="sparkle" size={40} />
        </div>
        <h2>{step ? `Komt in stap ${step}` : 'Niet gevonden'}</h2>
        <p>{text ?? 'Dit onderdeel wordt nog gebouwd.'}</p>
      </main>
    </div>
  );
}
