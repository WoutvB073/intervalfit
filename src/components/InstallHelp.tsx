import { Sheet } from './Sheet';
import { Icon } from './Icon';
import { inAppBrowser, isAndroid, isIOS } from '../engine/platform';
import { APP_NAME } from '../config';

/** Stap-voor-stap uitleg voor installeren op het beginscherm. */
export function InstallHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={`${APP_NAME} op je beginscherm`}>
      <div className="install-help">
        {inAppBrowser && (
          <p className="notice notice--warn">
            Je bekijkt dit nu in de ingebouwde browser van {inAppBrowser}. Daar kun je niet installeren. Tik op{' '}
            <strong>•••</strong> of <strong>⋮</strong> en kies <strong>Openen in {isIOS ? 'Safari' : 'Chrome'}</strong>.
          </p>
        )}

        {(isIOS || !isAndroid) && (
          <section>
            <h3 className="install-help__os">
              <Icon name="phone" size={20} /> iPhone (Safari)
            </h3>
            <ol className="steps">
              <li>
                Tik onderin op <strong>•••</strong> of op het deel-icoon{' '}
                <Icon name="iosShare" size={18} className="inline-icon" />.
              </li>
              <li>
                Kies <strong>Deel</strong> en daarna <strong>Zet op beginscherm</strong>. Zie je het niet? Scroll dan een
                stukje omlaag.
              </li>
              <li>
                Zorg dat <strong>Open als webapp</strong> aan staat en tik op <strong>Voeg toe</strong>.
              </li>
              <li>Open {APP_NAME} voortaan via het nieuwe icoon op je beginscherm.</li>
            </ol>
          </section>
        )}

        {(isAndroid || !isIOS) && (
          <section>
            <h3 className="install-help__os">
              <Icon name="phone" size={20} /> Android (Chrome)
            </h3>
            <ol className="steps">
              <li>
                Tik rechtsboven op <strong>⋮</strong>.
              </li>
              <li>
                Kies <strong>App installeren</strong> of <strong>Toevoegen aan startscherm</strong>.
              </li>
              <li>
                Tik op <strong>Installeren</strong>. Het icoon verschijnt op je startscherm.
              </li>
            </ol>
          </section>
        )}

        <p className="install-help__note">
          Als app opent {APP_NAME} zonder adresbalk, werkt hij ook zonder internet en blijven je workouts veilig bewaard.
        </p>
      </div>
    </Sheet>
  );
}
