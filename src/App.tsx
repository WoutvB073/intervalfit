import { useEffect } from 'react';
import { useRoute } from './router';
import { useStore } from './storage/store';
import { settingsStore } from './storage/data';
import { applyTheme } from './styles/theme';
import { Home } from './screens/Home';
import { Placeholder } from './screens/Placeholder';
import { ToastHost, showToast } from './components/Toast';
import { useUpdateState } from './engine/update';

export function App() {
  const route = useRoute();
  const settings = useStore(settingsStore);
  const { offlineReady } = useUpdateState();

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    if (offlineReady) showToast('Klaar! De app werkt nu ook zonder internet.');
  }, [offlineReady]);

  // Bij elk nieuw scherm bovenaan beginnen. (Blok-body: nieuwere browsers laten scrollTo een Promise teruggeven.)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route.name]);

  let screen;
  switch (route.name) {
    case 'home':
      screen = <Home />;
      break;
    case 'editor':
      screen = <Placeholder title={route.id ? 'Workout bewerken' : 'Nieuwe workout'} step={2} text="Hier kun je straks oefeningen kiezen, tijden instellen en de volgorde slepen." />;
      break;
    case 'player':
      screen = <Placeholder title="Workout" step={3} text="Hier komt de speler met timer, geluid en spraak." />;
      break;
    case 'summary':
      screen = <Placeholder title="Goed gedaan!" step={6} />;
      break;
    case 'settings':
      screen = <Placeholder title="Instellingen" step={4} text="Geluid, aftellen, thema's, gewicht en back-up." />;
      break;
    case 'share':
      screen = <Placeholder title="Gedeelde workout" step={5} />;
      break;
    default:
      screen = <Placeholder title="Oeps" text="Deze pagina bestaat niet." />;
  }

  return (
    <>
      <div key={route.name} className="route">
        {screen}
      </div>
      <ToastHost />
    </>
  );
}
