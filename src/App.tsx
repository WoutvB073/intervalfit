import { useEffect } from 'react';
import { useRoute } from './router';
import { useStore } from './storage/store';
import { settingsStore } from './storage/data';
import { applyTheme } from './styles/theme';
import { Home } from './screens/Home';
import { Placeholder } from './screens/Placeholder';
import { Gallery } from './screens/Gallery';
import { Editor } from './screens/editor/Editor';
import { InstallScreen } from './screens/gate/InstallScreen';
import { DesktopScreen } from './screens/gate/DesktopScreen';
import { ToastHost, showToast } from './components/Toast';
import { useUpdateState } from './engine/update';
import { env, isStandalone } from './engine/platform';

/**
 * - Geïnstalleerd (beginscherm) of `?dev=1`: de app zelf.
 * - Telefoon/tablet in de browser: alleen het installatiescherm.
 * - Computer: verwijzing naar de telefoon met QR-code.
 */
export function App({ devMode }: { devMode: boolean }) {
  const settings = useStore(settingsStore);

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  const inApp = isStandalone() || devMode;
  return (
    <>
      {inApp ? <AppRoutes /> : env.isMobile ? <GateRoutes /> : <DesktopScreen />}
      {devMode && !isStandalone() && <span className="dev-badge">dev</span>}
      <ToastHost />
    </>
  );
}

function GateRoutes() {
  const route = useRoute();
  return <InstallScreen shareCode={route.name === 'share' ? route.code : undefined} />;
}

function AppRoutes() {
  const route = useRoute();
  const { offlineReady } = useUpdateState();

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
      screen = <Editor key={route.id ?? 'nieuw'} id={route.id} />;

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
    case 'gallery':
      screen = <Gallery poses={route.poses} />;
      break;
    case 'share':
      screen = <Placeholder title="Gedeelde workout" step={5} text="Importeren binnen de app komt in stap 5." />;
      break;
    default:
      screen = <Placeholder title="Oeps" text="Deze pagina bestaat niet." />;
  }

  return (
    <div key={route.name} className="route">
      {screen}
    </div>
  );
}
