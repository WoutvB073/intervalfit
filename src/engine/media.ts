import { audio } from './audio';
import { speech } from './speech';
import { keepAwake } from './keepAwake';
import { settingsStore } from '../storage/data';

let prepared = false;

/**
 * Moet SYNCHROON in een tik-afhandeling worden aangeroepen (bv. de Start-knop):
 * ontgrendelt geluid en spraak op iPhone en houdt het scherm aan.
 */
export function prepareWorkoutMedia(): void {
  const s = settingsStore.get();
  audio.unlock({ alwaysAudible: s.sound.alwaysAudible, volume: s.sound.volume });
  speech.setPreferred(s.voiceURI);
  speech.unlock();
  keepAwake.start();
  prepared = true;
}

/** Is er in deze sessie al op Start getikt (en draait de audio)? */
export function mediaPrepared(): boolean {
  return prepared && audio.state !== 'none';
}

export function releaseWorkoutMedia(): void {
  keepAwake.stop();
  speech.cancel();
  audio.cancelAll();
}
