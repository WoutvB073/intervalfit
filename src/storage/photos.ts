import { useEffect, useState } from 'react';
import { createStore, del, get, keys, set } from 'idb-keyval';
import { newId } from '../model/id';
import type { Workout } from '../model/types';

/** Eigen foto's staan in IndexedDB (localStorage is te klein voor afbeeldingen). */
const db = createStore('intervalfit-photos', 'photos');

const MAX_SIDE = 1024;
const QUALITY = 0.82;

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Deze foto kan niet worden geopend.'));
    };
    img.src = url;
  });
}

/**
 * Verkleint een foto (max. 1024 px, JPEG) en bewaart hem. Geeft de sleutel terug.
 * De draaiing uit de camera (EXIF) wordt door de browser al toegepast bij het tekenen.
 */
export async function savePhoto(file: Blob): Promise<string> {
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Foto verwerken lukte niet.');
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', QUALITY));
  if (!blob) throw new Error('Foto verwerken lukte niet.');
  const id = newId();
  await set(id, blob, db);
  return id;
}

export async function deletePhoto(id: string): Promise<void> {
  urlCache.delete(id);
  await del(id, db);
}

/** Ruimt foto's op die in geen enkele workout meer gebruikt worden. */
export async function cleanupPhotos(workouts: Workout[]): Promise<void> {
  try {
    const used = new Set(workouts.flatMap((w) => w.exercises.map((e) => e.photoId).filter(Boolean)));
    const all = (await keys(db)) as string[];
    await Promise.all(all.filter((k) => !used.has(k)).map((k) => del(k, db)));
  } catch {
    /* opruimen is niet belangrijk genoeg om een fout te tonen */
  }
}

/** Foto's als data-URL (voor de back-up). */
export async function exportPhotos(ids: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const id of new Set(ids)) {
    const blob = await get<Blob>(id, db);
    if (!blob) continue;
    out[id] = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  }
  return out;
}

/** Foto's uit een back-up terugzetten (bestaande blijven staan). Geeft het aantal nieuwe terug. */
export async function importPhotos(map: Record<string, string>): Promise<number> {
  const have = new Set((await keys(db)) as string[]);
  let n = 0;
  for (const [id, url] of Object.entries(map)) {
    if (have.has(id) || typeof url !== 'string' || !url.startsWith('data:image/')) continue;
    const blob = await (await fetch(url)).blob();
    await set(id, blob, db);
    n++;
  }
  return n;
}

const urlCache = new Map<string, string>();

/** Object-URL van een opgeslagen foto (of undefined zolang hij laadt / niet bestaat). */
export function usePhotoUrl(id: string | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(() => (id ? urlCache.get(id) : undefined));
  useEffect(() => {
    if (!id) {
      setUrl(undefined);
      return;
    }
    const cached = urlCache.get(id);
    if (cached) {
      setUrl(cached);
      return;
    }
    let active = true;
    void get<Blob>(id, db).then((blob) => {
      if (!blob || !active) return;
      const u = URL.createObjectURL(blob);
      urlCache.set(id, u);
      setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [id]);
  return url;
}
