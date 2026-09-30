import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/plus-jakarta-sans/wght.css';
import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/barlow-condensed/latin-800.css';
import '@fontsource-variable/fredoka/wght.css';
import '@fontsource-variable/nunito/wght.css';
import './styles/themes.css';
import './styles/global.css';
import './styles/components.css';
import './styles/home.css';
import './styles/gate.css';
import './styles/figure.css';
import './styles/gallery.css';
import './styles/editor.css';
import './styles/player.css';
import './styles/settings.css';
import { App } from './App';
import { migrate, requestPersistentStorage, workoutsStore } from './storage/data';
import { cleanupPhotos } from './storage/photos';
import { initServiceWorker } from './engine/update';
import { initDevMode } from './engine/devMode';

const devMode = initDevMode();
migrate();
requestPersistentStorage();
// Foto's die bij geen enkele workout meer horen opruimen (bv. na verwijderen of niet-bewaarde wijzigingen).
void cleanupPhotos(workoutsStore.get());
// Ook in de browser registreren: zo is alles al offline beschikbaar zodra de app geïnstalleerd is.
initServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App devMode={devMode} />
  </StrictMode>,
);
