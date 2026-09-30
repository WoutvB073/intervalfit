import { useMemo, useState } from 'react';
import { env } from '../../engine/platform';
import { promptInstall, useInstallPrompt } from '../../engine/install';
import { copyText, currentLink } from '../../engine/clipboard';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { showToast } from '../../components/Toast';
import { APP_NAME } from '../../config';
import { getGuide } from './guide';
import { SharedWorkoutPreview } from './SharedWorkoutPreview';

/**
 * Toegangspoort: in een gewone browser toont de app alleen dit scherm met de installatiestappen
 * die bij dit toestel en deze browser horen. De app zelf opent pas vanaf het beginscherm.
 */
export function InstallScreen({ shareCode }: { shareCode?: string }) {
  const guide = useMemo(() => getGuide(env), []);
  const install = useInstallPrompt();
  const [installed, setInstalled] = useState(false);

  const onInstall = async () => {
    if (await promptInstall()) setInstalled(true);
  };

  const onCopyLink = async () => {
    const ok = await copyText(currentLink());
    showToast(ok ? 'Link gekopieerd' : 'Kopiëren lukte niet. Houd de link hieronder ingedrukt.');
  };

  if (installed || install.installed) {
    return (
      <div className="gate">
        <div className="gate__hero gate__hero--done">
          <div className="gate__done-icon">
            <Icon name="check" size={44} />
          </div>
          <h1 className="gate__title">Gelukt! 🎉</h1>
          <p className="gate__lead">
            Open de app nu via het icoon <strong>{APP_NAME}</strong> op je beginscherm.
          </p>
        </div>
      </div>
    );
  }

  // Android-browsers die zelf een installatieknop aanbieden (Chrome, Samsung Internet, Edge…).
  const showInstallButton = install.canPrompt && env.browser !== 'inapp';

  return (
    <div className={`gate${guide.arrow ? ` gate--arrow-${guide.arrow}` : ''}`}>
      <header className="gate__hero">
        <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="gate__logo" />
        <h1 className="gate__title">{APP_NAME}</h1>
        <p className="gate__lead">
          Jouw eigen interval- en tabata-trainingen, met voor elke oefening een eigen tijd.
        </p>
      </header>

      {shareCode && <SharedWorkoutPreview code={shareCode} />}

      <section className="gate__card" aria-labelledby="gate-steps-title">
        <h2 id="gate-steps-title" className="gate__card-title">
          {showInstallButton ? 'Installeer de app' : guide.title}
        </h2>

        {showInstallButton ? (
          <>
            <Button variant="primary" size="lg" icon="download" block onClick={onInstall} className="gate__install-btn">
              Installeren
            </Button>
            <details className="gate__manual">
              <summary>Lukt het niet? Zo doe je het zelf</summary>
              <StepList steps={guide.steps} />
            </details>
          </>
        ) : (
          <>
            {guide.intro && <p className="gate__intro">{guide.intro}</p>}
            <StepList steps={guide.steps} />
          </>
        )}

        {guide.copyLink && (
          <div className="gate__copy">
            <Button variant="primary" size="lg" icon="copy" block onClick={onCopyLink}>
              Kopieer link
            </Button>
            <input
              className="gate__link"
              readOnly
              value={currentLink()}
              aria-label="Link naar deze pagina"
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>
        )}

        {/* De tip gaat over openen vanuit een andere app; overbodig als de installatieknop werkt. */}
        {guide.hint && !showInstallButton && <p className="gate__hint">{guide.hint}</p>}
      </section>

      <p className="gate__footer">
        Heb je {APP_NAME} al op je beginscherm? Open hem dan via het icoon.
      </p>

      {/* Bij een gedeelde link geen pijl: wie de app al heeft, hoeft niet te installeren. */}
      {guide.arrow && !showInstallButton && !shareCode && (
        <div className={`gate-arrow gate-arrow--${guide.arrow}`} aria-hidden="true">
          <div className="gate-arrow__inner">
            <span className="gate-arrow__label">Begin hier</span>
            <svg className="gate-arrow__svg" viewBox="0 0 24 24" width="36" height="36">
              <path d="M12 3v17M5 13l7 7 7-7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

function StepList({ steps }: { steps: ReturnType<typeof getGuide>['steps'] }) {
  return (
    <ol className="gate-steps">
      {steps.map((s, i) => (
        <li key={i} className="gate-step">
          <span className="gate-step__num">{i + 1}</span>
          <span className="gate-step__icon">
            <Icon name={s.icon} size={24} />
          </span>
          <span className="gate-step__text">{s.text}</span>
        </li>
      ))}
    </ol>
  );
}
