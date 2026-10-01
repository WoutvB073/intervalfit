import { useMemo, useState } from 'react';
import { env } from '../../engine/platform';
import { promptInstall, useInstallPrompt } from '../../engine/install';
import { copyText, currentLink } from '../../engine/clipboard';
import { chromeMissing, openInChrome } from '../../engine/chrome';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { showToast } from '../../components/Toast';
import { APP_NAME } from '../../config';
import { getGuide, type Guide } from './guide';
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

  // Eigen "Installeren"-knop alleen in Chrome (en iOS kent hem niet). In Samsung Internet e.d. zou die knop
  // een installatie met veiligheidswaarschuwing starten; daar sturen we eerst naar Chrome.
  const showInstallButton = install.canPrompt && env.browser !== 'inapp' && !guide.viaChrome;

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
          {guide.viaChrome && shareCode ? 'Nog geen app?' : showInstallButton ? 'Installeer de app' : guide.title}
        </h2>

        {guide.viaChrome ? (
          <ViaChromeBlock guide={guide} shareCode={shareCode} onCopyLink={onCopyLink} />
        ) : showInstallButton ? (
          <>
            <Button variant="primary" size="lg" icon="download" block onClick={onInstall} className="gate__install-btn">
              Installeren
            </Button>
            <details className="gate__manual">
              <summary>Lukt het niet? Zo doe je het zelf</summary>
              <StepList steps={guide.steps} />
              {guide.warning && <Warning>{guide.warning}</Warning>}
            </details>
          </>
        ) : (
          <>
            {guide.intro && <p className="gate__intro">{guide.intro}</p>}
            <StepList steps={guide.steps} />
            {guide.warning && <Warning>{guide.warning}</Warning>}
          </>
        )}

        {guide.copyLink && !guide.viaChrome && (
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
        {guide.hint && !showInstallButton && !guide.viaChrome && <p className="gate__hint">{guide.hint}</p>}
      </section>

      <p className="gate__footer">
        Heb je {APP_NAME} al op je beginscherm? Open hem dan via het icoon.
      </p>

      {/* Bij een gedeelde link geen pijl: wie de app al heeft, hoeft niet te installeren. */}
      {guide.arrow && !showInstallButton && !guide.viaChrome && !shareCode && (
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

/**
 * Android, andere browser dan Chrome: knop "Openen in Chrome" met de stappen, link kopiëren als het niet lukt,
 * en uitklapbaar hoe het toch in de eigen browser kan (met uitleg bij een veiligheidsmelding).
 */
function ViaChromeBlock({ guide, shareCode, onCopyLink }: { guide: Guide; shareCode?: string; onCopyLink: () => void }) {
  const via = guide.viaChrome!;
  const missing = chromeMissing();
  return (
    <>
      {missing && (
        <p className="gate__notice">
          Chrome kon niet worden geopend. Staat Chrome niet op deze telefoon? Gebruik dan de stappen voor {via.browserName}{' '}
          hieronder.
        </p>
      )}
      {shareCode ? (
        // Bij een gedeelde link staat de knop "Openen in Chrome" al bij de workout hierboven.
        <p className="gate__intro">
          Tik hierboven op <strong>Openen in Chrome</strong>. In Chrome kun je de workout toevoegen en daarna de app
          installeren (⋮ → <strong>App installeren</strong>).
        </p>
      ) : (
        <>
          <p className="gate__intro">{via.intro}</p>
          <Button variant="primary" size="lg" icon="compass" block onClick={() => openInChrome()} className="gate__install-btn">
            Openen in Chrome
          </Button>
          <StepList steps={guide.steps} />
        </>
      )}
      <div className="gate__copy">
        <p className="gate__hint">Gaat Chrome niet open? Kopieer de link en plak hem in de adresbalk van Chrome.</p>
        <Button variant="secondary" size="lg" icon="copy" block onClick={onCopyLink}>
          Kopieer link
        </Button>
      </div>
      <details className="gate__manual" open={missing}>
        <summary>{via.altTitle ?? `Liever in ${via.browserName}? Zo doe je het daar`}</summary>
        <StepList steps={via.steps} />
        {via.warning && <Warning>{via.warning}</Warning>}
      </details>
    </>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <p className="gate__warning">
      <Icon name="shield" size={20} />
      <span>{children}</span>
    </p>
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
