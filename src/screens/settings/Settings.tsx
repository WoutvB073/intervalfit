import { useEffect, useMemo, useState } from 'react';
import type { Settings as SettingsT, ThemeId } from '../../model/types';
import { useStore } from '../../storage/store';
import { settingsStore, workoutsStore } from '../../storage/data';
import { buildBackup, importBackup, shareFile } from '../../storage/backup';
import { THEMES } from '../../styles/theme';
import { goBack } from '../../router';
import { Button, IconButton } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { SwitchRow } from '../../components/Switch';
import { Stepper } from '../../components/Stepper';
import { showToast } from '../../components/Toast';
import { audio } from '../../engine/audio';
import { speech } from '../../engine/speech';
import { canVibrate, isIOS } from '../../engine/platform';
import { APP_NAME, APP_VERSION } from '../../config';

type SoundPatch = Partial<SettingsT['sound']>;

export function Settings() {
  const settings = useStore(settingsStore);
  const update = (patch: Partial<SettingsT>) => settingsStore.set((s) => ({ ...s, ...patch }));
  const updateSound = (patch: SoundPatch) => settingsStore.set((s) => ({ ...s, sound: { ...s.sound, ...patch } }));
  const s = settings.sound;

  return (
    <div className="screen settings">
      <header className="top-bar">
        <IconButton icon="back" label="Terug" onClick={() => goBack()} />
        <h1 className="top-bar__title">Instellingen</h1>
        <span className="top-bar__spacer" />
      </header>

      <main className="settings__main">
        {/* ── Geluid ── */}
        <section className="settings-group" aria-labelledby="set-sound">
          <h2 id="set-sound">Geluid</h2>
          <div className="card settings-card">
            <SwitchRow label="Piepjes" hint="Bij de laatste 3 seconden van elke fase" checked={s.beeps} onChange={(v) => updateSound({ beeps: v })} />
            <SwitchRow label="Fluitje" hint="Bij het begin en einde van elke oefening" checked={s.whistle} onChange={(v) => updateSound({ whistle: v })} />
            <SwitchRow
              label="Stem"
              hint={speech.supported ? 'Kondigt in de rust de volgende oefening aan' : 'Niet beschikbaar op dit toestel'}
              checked={s.voice && speech.supported}
              disabled={!speech.supported}
              onChange={(v) => updateSound({ voice: v })}
            />
            <SwitchRow
              label="Trillen"
              hint={canVibrate ? 'Korte tril bij elke wissel' : isIOS ? 'Trillen wordt op iPhone niet ondersteund' : 'Niet beschikbaar op dit toestel'}
              checked={s.vibrate && canVibrate}
              disabled={!canVibrate}
              onChange={(v) => updateSound({ vibrate: v })}
            />
            {isIOS && (
              <SwitchRow
                label="Geluid altijd laten klinken"
                hint="Ook als je iPhone op stil staat. Let op: muziek van andere apps (zoals Spotify) pauzeert dan tijdens de workout."
                checked={s.alwaysAudible}
                onChange={(v) => updateSound({ alwaysAudible: v })}
              />
            )}
            <div className="settings-row">
              <span className="settings-row__label">Volume</span>
              <div className="volume">
                <Icon name="soundLow" size={22} />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={s.volume}
                  aria-label="Volume"
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    updateSound({ volume: v });
                    audio.setVolume(v);
                  }}
                />
                <Icon name="sound" size={22} />
              </div>
            </div>
            <VoicePicker value={settings.voiceURI} onChange={(uri) => update({ voiceURI: uri })} />
            <div className="settings-row settings-row--action">
              <TestSoundButton settings={settings} />
            </div>
          </div>
        </section>

        {/* ── Aftellen ── */}
        <section className="settings-group" aria-labelledby="set-countdown">
          <h2 id="set-countdown">Aftellen vóór de start</h2>
          <div className="card settings-card">
            <SwitchRow
              label="Aftellen"
              hint="Tijd om klaar te gaan staan, met de eerste oefening al in beeld"
              checked={settings.countdown.enabled}
              onChange={(v) => update({ countdown: { ...settings.countdown, enabled: v } })}
            />
            <div className={`settings-row${settings.countdown.enabled ? '' : ' is-muted'}`}>
              <span className="settings-row__label">Duur</span>
              <Stepper
                label="Duur van het aftellen"
                value={settings.countdown.seconds}
                min={3}
                max={30}
                step={1}
                format={(v) => `${v} s`}
                disabled={!settings.countdown.enabled}
                onChange={(v) => update({ countdown: { ...settings.countdown, seconds: v } })}
              />
            </div>
          </div>
        </section>

        {/* ── Thema ── */}
        <section className="settings-group" aria-labelledby="set-theme">
          <h2 id="set-theme">Thema</h2>
          <div className="theme-grid" role="radiogroup" aria-labelledby="set-theme">
            {THEMES.map((t) => (
              <ThemeTile key={t.id} id={t.id} label={t.label} active={settings.theme === t.id} onPick={() => update({ theme: t.id })} />
            ))}
          </div>
        </section>

        {/* ── Over jou: naam en gewicht ── */}
        <section className="settings-group" aria-labelledby="set-weight">
          <h2 id="set-weight">Over jou</h2>
          <div className="card settings-card">
            <label className="settings-row settings-row--field">
              <span className="settings-row__text">
                <span className="settings-row__label">Je naam</span>
                <span className="settings-row__hint">Voor persoonlijke berichten na je workout. Mag leeg blijven.</span>
              </span>
              <input
                className="field__input settings-name"
                type="text"
                value={settings.name ?? ''}
                placeholder="Voornaam"
                maxLength={30}
                autoComplete="given-name"
                autoCapitalize="words"
                enterKeyHint="done"
                onChange={(e) => update({ name: e.target.value })}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v) update({ name: v });
                  else settingsStore.set(({ name: _drop, ...rest }) => rest);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
              />
            </label>
            <SwitchRow
              label="Mijn gewicht invullen"
              hint="Alleen voor het schatten van verbrande calorieën. Zonder gewicht rekenen we met 70 kg."
              checked={settings.weightKg !== undefined}
              onChange={(v) => {
                if (v) update({ weightKg: 70 });
                else settingsStore.set(({ weightKg: _drop, ...rest }) => rest);
              }}
            />
            {settings.weightKg !== undefined && (
              <div className="settings-row">
                <span className="settings-row__label">Gewicht</span>
                <Stepper
                  label="Lichaamsgewicht"
                  value={settings.weightKg}
                  min={30}
                  max={200}
                  step={1}
                  format={(v) => `${v} kg`}
                  onChange={(v) => update({ weightKg: v })}
                />
              </div>
            )}
          </div>
        </section>

        {/* ── Back-up ── */}
        <BackupSection />

        {/* ── Hulp ── */}
        <section className="settings-group" aria-labelledby="set-help">
          <h2 id="set-help">Hulp</h2>
          <div className="card settings-card help">
            <details>
              <summary>Hoor ik geen piepjes op mijn iPhone?</summary>
              <p>
                Zet de stil-knop aan de zijkant van je iPhone uit, of zet hierboven <strong>Geluid altijd laten klinken</strong> aan.
                Controleer ook het volume. De stem is meestal ook met de stil-knop hoorbaar.
              </p>
            </details>
            <details>
              <summary>Mag ik mijn telefoon vergrendelen tijdens een workout?</summary>
              <p>
                Dat hoeft niet: het scherm blijft tijdens een workout vanzelf aan. Vergrendel je toch je telefoon of open je een
                andere app, dan pauzeert de workout vanzelf. Tik daarna op <strong>Verder</strong>.
              </p>
            </details>
            <details>
              <summary>Kan ik muziek luisteren tijdens een workout?</summary>
              <p>
                Ja. Start je muziek (bijv. Spotify) en daarna de workout; de piepjes en de stem klinken eroverheen. Met{' '}
                <strong>Geluid altijd laten klinken</strong> aan pauzeert je muziek wel.
              </p>
            </details>
            <details>
              <summary>Hoe zet ik de app op een nieuwe telefoon?</summary>
              <p>
                Tik hierboven op <strong>Back-up maken</strong> en bewaar het bestand (bijv. in Bestanden of stuur het naar jezelf).
                Installeer de app op je nieuwe telefoon en kies daar <strong>Back-up terugzetten</strong>.
              </p>
            </details>
          </div>
        </section>

        <p className="settings__about">
          {APP_NAME} · versie {APP_VERSION}
          <br />
          Alles blijft op dit toestel: geen account en geen internet nodig.
        </p>
      </main>
    </div>
  );
}

function VoicePicker({ value, onChange }: { value?: string; onChange: (uri: string | undefined) => void }) {
  const [voices, setVoices] = useState(() => speech.dutchVoices());
  useEffect(() => speech.onVoicesChanged(() => setVoices(speech.dutchVoices())), []);
  if (voices.length < 2) return null;
  return (
    <label className="settings-row">
      <span className="settings-row__label">Stem</span>
      <select
        className="settings-select"
        value={value ?? voices[0]!.voiceURI}
        onChange={(e) => {
          onChange(e.target.value);
          speech.setPreferred(e.target.value);
        }}
      >
        {voices.map((v) => (
          <option key={v.voiceURI} value={v.voiceURI}>
            {v.name} ({v.lang.replace('_', '-')})
          </option>
        ))}
      </select>
    </label>
  );
}

/** Speelt alle geluiden achter elkaar af en daarna een stemvoorbeeld. */
function TestSoundButton({ settings }: { settings: SettingsT }) {
  const [busy, setBusy] = useState(false);
  const run = () => {
    // Binnen de tik ontgrendelen (iPhone).
    audio.unlock({ alwaysAudible: settings.sound.alwaysAudible, volume: settings.sound.volume });
    speech.setPreferred(settings.voiceURI);
    speech.unlock();
    setBusy(true);
    void audio.whenReady().then(() => {
      const t = Date.now() + 250;
      const plan = [
        ['beep', 0],
        ['beep', 1000],
        ['beep', 2000],
        ['whistleStart', 3000],
        ['whistleEnd', 4300],
        ['finish', 5500],
      ] as const;
      plan.forEach(([kind, at], i) => audio.schedule(`test:${i}:${t}`, kind, t + at));
      setTimeout(() => {
        speech.speak('Volgende: skwots, 45 seconden.', settings.sound.volume);
        setBusy(false);
        if (!audio.ready) showToast('Geen geluid? Controleer de stil-knop en het volume.');
      }, 7200);
      // Muziek van andere apps weer vrijgeven.
      setTimeout(() => audio.setAlwaysAudible(false), 10_000);
    });
  };
  return (
    <Button variant="secondary" size="lg" icon="sound" block onClick={run} disabled={busy}>
      {busy ? 'Luister…' : 'Test geluid'}
    </Button>
  );
}

function ThemeTile({ id, label, active, onPick }: { id: ThemeId; label: string; active: boolean; onPick: () => void }) {
  return (
    <button type="button" role="radio" aria-checked={active} className={`theme-tile${active ? ' is-active' : ''}`} onClick={onPick}>
      <span className="theme-tile__preview" data-theme={id}>
        <span className="theme-tile__card">
          <span className="theme-tile__line" />
          <span className="theme-tile__line theme-tile__line--short" />
          <span className="theme-tile__btn" />
        </span>
        <span className="theme-tile__player">
          <span className="theme-tile__ring">30</span>
        </span>
      </span>
      <span className="theme-tile__label">
        {active && <Icon name="check" size={18} />}
        {label}
      </span>
    </button>
  );
}

function BackupSection() {
  const workouts = useStore(workoutsStore);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const count = workouts.length;

  // Het bestand vooraf maken, zodat "Back-up maken" direct het deelmenu kan openen (vereist op iPhone).
  useEffect(() => {
    let active = true;
    setFile(null);
    void buildBackup(true).then((f) => active && setFile(f));
    return () => {
      active = false;
    };
  }, [workouts]);

  const sizeKb = useMemo(() => (file ? Math.max(1, Math.round(file.size / 1024)) : 0), [file]);

  const onExport = async () => {
    if (!file) return;
    const r = await shareFile(file);
    if (r === 'downloaded') showToast('Back-up gedownload');
    if (r === 'shared') showToast('Back-up gedeeld');
  };

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setImporting(true);
    try {
      const r = await importBackup(f);
      const parts = [
        r.added === 1 ? '1 workout toegevoegd' : `${r.added} workouts toegevoegd`,
        r.skipped ? `${r.skipped} stonden er al` : '',
        r.photos ? (r.photos === 1 ? '1 foto' : `${r.photos} foto's`) : '',
      ].filter(Boolean);
      showToast(parts.join(' · '));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Terugzetten lukte niet.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <section className="settings-group" aria-labelledby="set-backup">
      <h2 id="set-backup">Back-up</h2>
      <div className="card settings-card settings-card--padded">
        <p className="settings-text">
          Bewaar al je workouts ({count}), je geschiedenis en je eigen foto's in één bestand. Handig voor een nieuwe telefoon.
        </p>
        <div className="backup-actions">
          <Button variant="primary" size="lg" icon="share" block onClick={onExport} disabled={!file}>
            {file ? `Back-up maken (${sizeKb} kB)` : 'Back-up voorbereiden…'}
          </Button>
          <label className={`btn btn--secondary btn--lg btn--block${importing ? ' is-disabled' : ''}`}>
            <Icon name="download" size={24} />
            <span>{importing ? 'Bezig…' : 'Back-up terugzetten'}</span>
            <input type="file" accept="application/json,.json" className="visually-hidden" onChange={onImport} />
          </label>
        </div>
        <p className="settings-hint">
          {isIOS ? 'Op iPhone kies je in het deelmenu bijvoorbeeld "Bewaar in Bestanden" of WhatsApp. ' : ''}
          Terugzetten voegt workouts toe; je huidige workouts blijven staan.
        </p>
      </div>
    </section>
  );
}
