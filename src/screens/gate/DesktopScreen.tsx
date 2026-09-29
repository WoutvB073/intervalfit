import { copyText, currentLink } from '../../engine/clipboard';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { QrCode } from '../../components/QrCode';
import { showToast } from '../../components/Toast';
import { APP_NAME } from '../../config';

/** Op een computer: alleen een verwijzing naar de telefoon, met QR-code. */
export function DesktopScreen() {
  const link = currentLink();
  return (
    <div className="desktop">
      <div className="desktop__card">
        <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="gate__logo" />
        <h1 className="gate__title">{APP_NAME}</h1>
        <p className="desktop__text">
          Deze app is gemaakt voor je telefoon. Open deze link op je telefoon.
        </p>
        <QrCode text={link} size={220} />
        <p className="desktop__scan">
          <Icon name="phone" size={20} /> Scan de code met de camera van je telefoon.
        </p>
        <div className="desktop__link">
          <code>{link.length > 70 ? `${link.slice(0, 67)}…` : link}</code>
          <Button
            variant="secondary"
            icon="copy"
            onClick={async () => showToast((await copyText(link)) ? 'Link gekopieerd' : 'Kopiëren lukte niet')}
          >
            Kopieer link
          </Button>
        </div>
      </div>
    </div>
  );
}
