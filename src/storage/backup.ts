import type { HistoryEntry, Workout } from '../model/types';
import { historyStore, workoutsStore } from './data';
import { exportPhotos, importPhotos } from './photos';
import { APP_NAME } from '../config';

/**
 * Back-up als JSON-bestand: alle workouts, de geschiedenis en (optioneel) eigen foto's.
 * Instellingen horen bij het toestel en worden niet overgezet.
 */
export type BackupFile = {
  app: 'IntervalFit';
  format: 1;
  exportedAt: string;
  workouts: Workout[];
  history: HistoryEntry[];
  photos?: Record<string, string>;
};

export async function buildBackup(includePhotos = true): Promise<File> {
  const workouts = workoutsStore.get();
  const ids = workouts.flatMap((w) => w.exercises.map((e) => e.photoId).filter((x): x is string => !!x));
  const data: BackupFile = {
    app: 'IntervalFit',
    format: 1,
    exportedAt: new Date().toISOString(),
    workouts,
    history: historyStore.get(),
    ...(includePhotos && ids.length ? { photos: await exportPhotos(ids) } : {}),
  };
  const date = new Date().toISOString().slice(0, 10);
  return new File([JSON.stringify(data)], `${APP_NAME.toLowerCase()}-backup-${date}.json`, { type: 'application/json' });
}

/**
 * Deel of bewaar het bestand. iPhone: het deelmenu ("Bewaar in Bestanden", WhatsApp, mail).
 * Moet direct binnen een tik worden aangeroepen (daarom wordt het bestand vooraf gemaakt).
 */
export async function shareFile(file: File): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: `${APP_NAME} back-up` });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // Delen lukte niet: val terug op downloaden.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}

export type ImportResult = { added: number; skipped: number; history: number; photos: number };

/** Leest een back-up en voegt toe wat er nog niet is. Bestaande workouts blijven altijd staan. */
export async function importBackup(file: File): Promise<ImportResult> {
  let data: Partial<BackupFile>;
  try {
    data = JSON.parse(await file.text()) as Partial<BackupFile>;
  } catch {
    throw new Error('Dit bestand kan niet worden gelezen. Kies een back-up van IntervalFit (.json).');
  }
  if (data.app !== 'IntervalFit' || !Array.isArray(data.workouts)) {
    throw new Error('Dit is geen back-up van IntervalFit.');
  }
  const existing = new Set(workoutsStore.get().map((w) => w.id));
  const fresh = data.workouts.filter(
    (w): w is Workout => !!w && typeof w.id === 'string' && Array.isArray(w.exercises) && !existing.has(w.id),
  );
  const photos = data.photos ? await importPhotos(data.photos) : 0;
  if (fresh.length) workoutsStore.set((list) => [...list, ...fresh]);

  let history = 0;
  if (Array.isArray(data.history)) {
    const seen = new Set(historyStore.get().map((h) => h.id));
    const add = data.history.filter((h): h is HistoryEntry => !!h && typeof h.id === 'string' && !seen.has(h.id));
    history = add.length;
    if (add.length) historyStore.set((list) => [...list, ...add].sort((a, b) => a.date.localeCompare(b.date)));
  }
  return { added: fresh.length, skipped: data.workouts.length - fresh.length, history, photos };
}
