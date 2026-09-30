import { useMemo } from 'react';
import type { Workout } from '../../model/types';
import { Sheet } from '../../components/Sheet';
import { Button } from '../../components/Button';
import { showToast } from '../../components/Toast';
import { shareMessage, shareUrl } from '../../storage/share';
import { totalDurationSec } from '../../model/timeline';
import { formatTotal } from '../../model/format';
import { copyText } from '../../engine/clipboard';
import { APP_NAME } from '../../config';

/** Workout delen: via het deelmenu van de telefoon (WhatsApp enz.) of door het bericht te kopiëren. */
export function ShareSheet({ workout, onClose }: { workout: Workout | null; onClose: () => void }) {
  const message = useMemo(
    () => (workout ? shareMessage(workout, shareUrl(workout), formatTotal(totalDurationSec(workout))) : ''),
    [workout],
  );
  const hasPhotos = !!workout?.exercises.some((e) => e.photoId);
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  const onShare = async () => {
    try {
      await navigator.share({ title: `${APP_NAME}: ${workout!.name}`, text: message });
      onClose();
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        const ok = await copyText(message);
        showToast(ok ? 'Bericht gekopieerd. Plak het in WhatsApp of een mail.' : 'Delen lukte niet.');
      }
    }
  };

  const onCopy = async () => {
    const ok = await copyText(message);
    showToast(ok ? 'Bericht gekopieerd. Plak het in WhatsApp of een mail.' : 'Kopiëren lukte niet.');
    if (ok) onClose();
  };

  return (
    <Sheet open={!!workout} onClose={onClose} title="Workout delen">
      {workout && (
        <div className="share-sheet">
          <p className="share-sheet__intro">Dit bericht wordt verstuurd. Wie de link opent, kan de workout in zijn eigen app zetten.</p>
          <div className="share-sheet__message">{message}</div>
          {hasPhotos && (
            <p className="notice notice--warn">Eigen foto's gaan niet mee (te groot voor een link). De ander ziet de standaardfiguurtjes.</p>
          )}
          {canShare && (
            <Button variant="primary" size="lg" icon="share" block onClick={onShare}>
              Delen via WhatsApp, mail…
            </Button>
          )}
          <Button variant={canShare ? 'secondary' : 'primary'} size="lg" icon="copy" block onClick={onCopy}>
            Bericht kopiëren
          </Button>
        </div>
      )}
    </Sheet>
  );
}
