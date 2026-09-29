import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/plus-jakarta-sans/wght.css';
import './styles/themes.css';
import './styles/global.css';
import './styles/components.css';
import './styles/home.css';
import { App } from './App';
import { migrate, requestPersistentStorage } from './storage/data';
import { initServiceWorker } from './engine/update';

migrate();
requestPersistentStorage();
initServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
