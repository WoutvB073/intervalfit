import { lazy, Suspense, useEffect } from 'react';
import { useRoute } from './router';
import { useStore } from './storage/store';
import { settingsStore } from './storage/data';
import { applyTheme } from './styles/theme';
import { Home } from './screens/Home';
import { Placeholder } from './screens/Placeholder';
import { Player } from './screens/player/Player';

// Schermen die niet direct bij het opstarten nodig zijn, apart laden (sneller starten op trage telefoons).
// Ze staan wel in de offline-cache, dus ook zonder internet openen ze direct.
const Gallery = lazy(() => import('./screens/Gallery').then((m) => ({ default: m.Gallery })));
const Editor = lazy(() => import('./screens/editor/Editor').then((m) => ({ default: m.Editor })));
const Settings = lazy(() => import('./screens/settings/Settings').then((m) => ({ default: m.Settings })));
const SharePreview = lazy(() => import('./screens/share/SharePreview').then((m) => ({ default: m.SharePreview })));
const Summary = lazy(() => import('./screens/summary/Summary').then((m) => ({ default: m.Summary })));
const Progress = lazy(() => import('./screens/progress/Progress').then((m) => ({ default: m.Progress })));
const Manual = lazy(() => import('./screens/manual/Manual').then((m) => ({ default: m.Manual })));
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
      {inApp ? <AppRoutes devMode={devMode} /> : env.isMobile ? <GateRoutes /> : <DesktopScreen />}
      {devMode && !isStandalone() && <span className="dev-badge">dev</span>}
      <ToastHost />
    </>
  );
}

function GateRoutes() {
  const route = useRoute();
  return <InstallScreen shareCode={route.name === 'share' ? route.code : undefined} />;
}

function AppRoutes({ devMode }: { devMode: boolean }) {
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
      screen = <Home devMode={devMode} />;
      break;
    case 'editor':
      screen = <Editor key={route.id ?? 'nieuw'} id={route.id} />;

      break;
    case 'player':
      screen = <Player id={route.id} devMode={devMode} />;
      break;
    case 'summary':
      screen = <Summary id={route.id} devMode={devMode} />;
      break;
    case 'manual':
      screen = <Manual />;
      break;
    case 'progress':
      screen = <Progress />;
      break;
    case 'settings':
      screen = <Settings />;
      break;
    case 'gallery':
      // Alleen voor ontwikkelaars; gewone gebruikers zien hier 'niet gevonden'.
      screen = devMode ? <Gallery poses={route.poses} /> : <Placeholder title="Oeps" text="Deze pagina bestaat niet." />;
      break;
    case 'share':
      screen = <SharePreview code={route.code} />;
      break;
    default:
      screen = <Placeholder title="Oeps" text="Deze pagina bestaat niet." />;
  }

  return (
    <div key={route.name} className="route">
      <Suspense fallback={null}>{screen}</Suspense>
    </div>
  );
}
