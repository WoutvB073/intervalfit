# Plan: IntervalFit (PWA)

Persoonlijke interval/tabata-trainingsapp als Progressive Web App. Draait volledig op het toestel
(geen backend, geen accounts), is installeerbaar op iPhone en Android en werkt offline.
De naam "IntervalFit" staat op één plek (`src/config.ts` + manifest in `vite.config.ts`).

## Status (01-10-2026)

| Stap | Status |
|---|---|
| 1. Basisstructuur (+ installatiescherm) | ✅ af, getest op iPhone 14 |
| 2. Workout-editor + figuurtjes/galerij | ✅ af, getest |
| 3. Speler | ✅ af, getest (incl. aanpassingen: kleinere timer, automatisch pauzeren, korte instructies) |
| 4. Instellingen + 4 thema's + back-up | ✅ af, getest |
| 5. Delen | ✅ getest op iPhone 14 (WhatsApp-voorbeeld + importeren). **Nog te testen**: op de telefoon van de moeder en op Android (gebruiker meldt dit later) |
| 6. Overzicht na afloop (geschiedenis, streak, calorieën, confetti, boodschappen) | ✅ af, getest op iPhone 14 |
| 6b. Extra oefeningen (12) + materiaal-filter | ✅ af, getest op iPhone 14 |
| 7. Afwerking (definitief logo/splash, rondgang, toegankelijkheid, Lighthouse, README, handleiding) | ✅ gebouwd en online (versie 1.0.0). **Eindtest door de gebruiker**: met de moeder (iPhone) en op Android, volgens de testlijst |

| 7b. Android-fixes na test moeder (thema's bleven donker; melding "onveilig" bij installeren) | ✅ gebouwd en online (versie 1.0.1). **Wacht op test** op de telefoon van de moeder (opnieuw installeren via Chrome) |

**Na de eindtest:** alleen nog onderhoud en eventuele wensen; zie README → "Zelf iets aanpassen".

## Aanvullende besluiten (onderweg genomen)
- **Stil-knop:** optie C — standaard mengen met muziek; schakelaar "Geluid altijd laten klinken" (alleen iPhone) zet `navigator.audioSession.type = 'playback'` (oudere iOS: stil `<audio>`-lusje); na de workout/test weer uit. Stem is met stil-knop meestal wél hoorbaar.
- **Vergrendelen/andere app/telefoontje:** workout **pauzeert automatisch**; pauzescherm met "Gepauzeerd omdat je de app verliet". Eenmalige tips bij de eerste workout (`appState.playerTipsSeen`).
- **Instructies:** max. ± 60 tekens, het belangrijkste aandachtspunt (unit-test bewaakt dit). In de speler (aftellen/rust) max. 2 regels via `FitText` (letters krimpen i.p.v. afkappen).
- **Speler-layout:** raster (kop / voortgang / midden / bediening); afbeelding krimpt mee, timer kleiner (± 172 px op iPhone 14). Nooit overlap — getest op SE, 14, groot Android en liggend.
- **Extra oefeningen:** "Side leg raises links/rechts" (39 oefeningen totaal). Links = liggend op rechterzij, linkerbeen omhoog. Spraaktekst met kant ("zijplank, links").
- **Ontwikkelaarsmodus:** `?dev=1` (uit: `?dev=0`) of in de geïnstalleerde app **7× snel op het logo tikken** (was 5×; 7× binnen 3 s kan niet per ongeluk) → geel blok op Home met test-workout (3× 10 s, 2 rondes), galerij (`#/galerij`, `#/galerij/houdingen`) en nep-geschiedenis. Zonder ontwikkelaarsmodus geeft `#/galerij` "Niet gevonden".
- **Delen:** deelbericht "Ik heb een workout voor je: … Open de link om hem in IntervalFit te zetten: …"; linkcode zonder `+`/`$` (vervangen door `~`/`_`, oude links werken nog); "Workout importeren" op Home (plakken herkent link/code/WhatsApp-bericht); dubbele workout → "Nog een keer toevoegen?"; nieuwe workout bovenaan en licht op. Link in Android Chrome: direct toevoegen (gedeeld geheugen met de app); in iPhone Safari: stappenplan "Kopieer voor de app".
- **Thema's:** Licht & fris (standaard), Donker & sportief (Barlow Condensed, neon), Kleurrijk & vrolijk (Fredoka, kleurverlopen), Zacht pastel (Nunito, donkere tekst op pastel). Fasekleuren per thema via `--work/-bg/-ink/-accent` in `themes.css`.
- **Extra oefeningen (51 totaal):** step-ups (trede getekend), single-leg bridge links/rechts (links = linkervoet op de grond; rechts gespiegeld), pike push-ups, plank up-downs, V-ups, Hielen tikken (van bovenaf op een matje, `topDown`), bicep curls (dumbbell op de kop gezien) en hammer curls (dumbbell in profiel, om en om), pull-ups (breed, bovenhands, ellebogen naar buiten) en chin-ups (smal, onderhands, onderarmen verticaal) aan een stang in een deurpost, Hangend knieheffen (zijaanzicht, stang aan deurpost).
- **Afwerking (stap 7):**
  - *Icoon:* het bestaande bliksemlogo (ring + voortgangsboog + gele stip + bliksem) strak uitgewerkt in `public/logo.svg`; drie alternatieve ontwerpen (A figuurtje, B stopwatch, C dumbbell) afgewezen, staan in `design/icon/`. Alle formaten + maskable via de build; iPhone-opstartschermen (SE + 11 t/m 17, staand) met `tools/splash.mjs`, niet in de offline-cache.
  - *Rondgang als nieuwe gebruiker* (`tools/e2e/walkthrough.mjs`) → verbeterd: welkomstkaartje verdwijnt na de eerste opgeslagen of afgeronde workout; galerij alleen in ontwikkelaarsmodus; logo-tik 7×; deeltekst genderneutraal; getrainde tijd overal gewoon afgerond (`formatTrained`); een afgeronde workout telt alleen mee bij ≥ 1 min of ≥ de helft van de geplande tijd (dus niet alles doorgespoeld).
  - *Toegankelijkheid:* contrast volgens WCAG AA in alle thema's (knoppen iets donkerder: fris #0a8657, vrolijk #d6336b, pastel #7a69ba; rood en lichtste grijs in pastel/vrolijk aangepast); `tests/contrast.test.ts` bewaakt dit.
  - *Prestaties:* editor, instellingen, overzicht, voortgang, handleiding, galerij en deel-voorbeeld worden apart geladen (wel in de offline-cache). Lighthouse (mobiel, trage Android-emulatie): app 95–96 prestaties / 100 toegankelijkheid / 100 best practices / 100 SEO; installatiescherm 95/100/100/100. PWA: installeerbaar zonder fouten, offline starten werkt (`tools/e2e/pwa-check.mjs`).
  - *Handleiding:* 1 pagina, in de app (Instellingen → Hulp → Handleiding, `#/handleiding`) en als pdf `public/handleiding.pdf` (online), gemaakt met `tools/manual-pdf.mjs`.
- **Android: thema's en donkere modus (7b):**
  - *Oorzaak:* browsers die webpagina's zelf donker maken (Chrome "Auto Dark"/"Websites donker maken", Samsung Internet donkere modus, Android WebView, Opera-vlag) kleurden de lichte thema's om. Nagebootst met Chrome-emulatie (`Emulation.setAutoDarkModeOverride`).
  - *Oplossing:* per thema `color-scheme: only light` / `only dark` in de CSS én `<meta name="color-scheme">` (gezet door `applyTheme` en al vóór het eerste beeld door een klein script in `index.html`, samen met `theme-color` voor de statusbalk). PWA-plugin voegt geen eigen theme-color meer toe.
  - *Grenzen:* oudere Samsung Internet-versies negeren de opt-out (eigen "force dark"); daarvoor een tip in Instellingen → Thema (alleen Samsung Internet + donkere modus aan) en het advies via Chrome te installeren. De navigatiebalk van Android en het Android-opstartscherm (manifest `background_color`, licht) kan een web-app niet per thema kleuren.
  - *Test:* `tools/e2e/darkmode-test.mjs` (4 thema's × Home/Instellingen/speler/installatiescherm × licht/donker/geforceerd).
- **Android: installeren (7b):**
  - *Oorzaak melding:* Samsung Internet verpakt de app (WebAPK) voor een oude Android-versie → Android 14+ / Play Protect: "Gevaarlijke app geblokkeerd … gemaakt voor een oudere versie van Android". Chrome verpakt actueel → geen melding.
  - *Besluit:* op Android in elke andere browser dan Chrome (Samsung Internet, Firefox, Edge, Opera, ingebouwde browsers van WhatsApp/Instagram/Facebook) adviseert het installatiescherm Chrome met de knop **Openen in Chrome** (`intent://…;package=com.android.chrome;S.browser_fallback_url=…?geenchrome=1`, `src/engine/chrome.ts`); daaronder "Liever in <browser>?" met de eigen stappen en uitleg bij de melding. Geen eigen Installeren-knop buiten Chrome. Geen Chrome → melding + eigen stappen open.
  - *Gedeelde link* in een andere Android-browser: niet direct toevoegen (ander geheugen dan de via Chrome geïnstalleerde app) maar **Openen in Chrome** (`?deel=CODE` → `#/deel/CODE`) of **Kopieer voor de app**.
  - Hulp-vraag "Melding dat de app onveilig is (Android)?" en handleiding aangepast. Tests: `tests/android.test.ts`, `tools/e2e/android-test.mjs`.
- **Materiaal:** `equipment` per oefening: geen (standaard), `stoel` (stoel/trap: step-ups, tricep dips), `dumbbells`, `stang`. Bibliotheek: tweede rij keuzeknopjes (Alle materialen · Zonder materiaal · Stoel of trap · Dumbbells · Optrekstang) en een klein label linksboven op tegels met materiaal. Figuren: rekwisieten `step`, `bar`, `barSide`; `dumbbells: 'end' | 'side'`, `grip: 'over' | 'under'` (kleur `--fig-gear`, standaard `--text-2`).
- **Back-up:** JSON incl. foto's (data-URL), geschiedenis; instellingen niet. Terugzetten voegt toe (geen dubbelen).
- **Overzicht na afloop (stap 6):** route `#/klaar/:id`; bij afloop wordt de workout direct bewaard (`storage/history.ts`) en vervangt het overzicht de speler (terug = Home). Net afgerond: confetti in themakleuren (`canvas-confetti`, niet bij "Verminder beweging"), medaille met pictogram/getal van de belangrijkste boodschap, optellende tegels (getraind, werktijd, ≈ kcal, rondes, oefeningen; gestopt: "2 van 3"), reeks + dagen van deze week, *Klaar* en *Nog een keer*. Vanuit de geschiedenis: zelfde overzicht zonder feest, met terugknop.
- **Gestopt:** vanaf 1 minuut bewaard met eigen kop ("Goed bezig!" e.d.) en positieve boodschap; onder 1 minuut → Home + melding (stopvraag zegt dit al).
- **Boodschappen** (`data/messages.ts`): kandidaten met prioriteit (eerste workout 100, aantal-mijlpaal 95, gestopt 92, reeks-mijlpaal 90 — alleen als nieuw record of ≥ 7 dagen, record 80/78, welkom terug 75, uren totaal 74, week/vandaag/oefeningtotaal/lopende reeks/topoefening/tijdstip lager, compliment 20). Max. 2 uit verschillende soorten, belangrijkste eerst. Varianten van de laatste 14 workouts worden overgeslagen; gewone soorten die de laatste 2 keer kwamen zakken in prioriteit. Kop en boodschappen worden in de geschiedenis bewaard (keuze vast per workout-id).
- **Naam:** optioneel veld "Je naam" in Instellingen (Over jou); hooguit één keer per overzicht gebruikt, ook in de slotzin van de stem ("Goed gedaan, Ria!").
- **Mijn voortgang** (`#/voortgang`): via reeks-blokje op Home (verschijnt na de eerste workout). Reeks (0 = "Tijd voor een nieuwe reeks"), langste reeks, deze week, totalen, meest gedane oefening, lijst afgelopen workouts (20 per keer).
- **Reeks:** dagen op rij t/m vandaag, of t/m gisteren als er vandaag nog niet getraind is. Week = ma t/m zo.
- **Nep-geschiedenis** (ontwikkelaarsmodus, knop op Home): scenario's (leeg, 4, 9, 2/6 dagen op rij, pauze 12 dagen, 49 workouts ≈ 10 u, 2 maanden gevarieerd) + nep-afronden (15/45 min, gestopt 6 min/40 s, 7:05). Echte geschiedenis wordt bij de eerste keer bewaard (`intervalfit.historyBackup`) en is terug te zetten.

## 0. Besluiten (na overleg)

| Onderwerp | Besluit |
|---|---|
| Hosting | Openbare GitHub-repository `WoutvB073/intervalfit`, GitHub Pages via GitHub Actions. URL: `https://woutvb073.github.io/intervalfit/` |
| Projectmap | `C:\dev\IntervalApp` (buiten OneDrive; GitHub is de back-up) |
| Commits | Ondertekend met het GitHub-privéadres (noreply) |
| Stil-knop iPhone | Optie C: standaard mengen met muziek + duidelijke tip over de stil-knop. Instelling "Geluid altijd laten klinken (ook als telefoon op stil staat)" met uitleg dat muziek dan pauzeert |
| Doeltoestellen | iPhone 11 en nieuwer (iOS 16.4+), Android 10+ met recente Chrome (bv. Samsung A-serie 2020). Animaties en timer moeten ook op trage processors soepel zijn. Testen op kleine schermen: iPhone SE (375×667) en 360 px breed |
| Oefeningnamen | Logische mix: Engels waar dat in NL gangbaar is (squats, plank, burpees, jumping jacks, mountain climbers, crunches, sit-ups, high knees), Nederlands waar dat natuurlijk klinkt (opdrukken, uitvalspassen, zijplank, muurzit). Beide varianten altijd als zoekwoord. Instructies in het Nederlands. Per oefening optioneel een aparte spraaktekst zodat de Nederlandse stem de naam begrijpelijk uitspreekt |
| Gestopte workouts | Tellen mee in geschiedenis en streak vanaf 1 minuut getraind, met aangepaste positieve boodschap |
| Kleine extra's | Allemaal akkoord: streak-blokje op Home, "Nog een keer", voortgangsbalk in speler, stemkeuze, omhoog/omlaag-knoppen naast slepen, welkomstkaartje |

### Installatiescherm als toegangspoort (toegevoegd na stap 1)
- In een gewone browser (niet `display-mode: standalone` / `navigator.standalone`) toont de app alleen een installatiescherm, niet de app zelf.
- Toestel en browser worden herkend (`src/engine/platform.ts`), met alleen de passende stappen: iPhone Safari (met pijl naar •••/Deel, iOS 26-stappen incl. "Open als webapp"), iPhone met andere browser (naar Safari + Kopieer link), Android Chrome (Installeren-knop of handmatig), Samsung Internet (☰ → Pagina toevoegen aan → Startscherm, of knop), ingebouwde browsers van WhatsApp/Instagram/Facebook enz. (openen in Safari/Chrome + Kopieer link).
- Gedeelde link (`#/deel/…`) in de browser: eerst voorbeeld van de workout met "Kopieer voor de app", daaronder de installatiestappen.
- Computer: alleen "Deze app is gemaakt voor je telefoon" + offline gemaakte QR-code. Tablets krijgen de telefoonweergave.
- Installatiekaart op Home verwijderd. Ontwikkelaarsmodus: `?dev=1` (uit met `?dev=0`).

### Werkwijze
- Per stap: bouwen → zelf testen → commit + push → samenvatting, link naar online versie en testlijst (iPhone én Android).
- Na elke stap wachten op akkoord.
- Keuzes die niet in dit plan staan en gebruik of uitstraling beïnvloeden: eerst vragen.

## 1. Techniek

| Onderdeel | Keuze |
|---|---|
| Basis | Vite + React + TypeScript (strict) |
| PWA | vite-plugin-pwa (Workbox `generateSW`), alles precachen → volledig offline |
| Iconen/splash | @vite-pwa/assets-generator vanuit één SVG-logo (PNG-maten, maskable, apple-touch-icon, iOS-opstartschermen) |
| Navigatie | Eigen mini hash-router (`#/…`) |
| Opslag | localStorage met versienummer + migratie (workouts, instellingen, geschiedenis); IndexedDB via `idb-keyval` (foto's) |
| Herordenen | `@dnd-kit/sortable` met sleepgreep (touch) |
| Delen | `lz-string` in de URL-hash |
| Confetti | `canvas-confetti` |
| Lettertypes | Lokaal via @fontsource (geen externe verzoeken) |
| Tests | Vitest (logica) + browsertests in de preview (telefoonformaten, staand/liggend, offline) |

Geen UI-kit en geen state-library: eigen componenten en een kleine store (`useSyncExternalStore`).

## 2. Mapstructuur

```
IntervalApp/
├─ .github/workflows/deploy.yml
├─ public/logo.svg
├─ src/
│  ├─ main.tsx, App.tsx, config.ts, router.ts
│  ├─ data/        exercises.ts (★ bibliotheek), sampleWorkouts.ts, messages.ts
│  ├─ model/       types.ts, timeline.ts, calories.ts, achievements.ts
│  ├─ storage/     store.ts, photos.ts, backup.ts, share.ts
│  ├─ engine/      timer.ts, audio.ts, speech.ts, wakeLock.ts, haptics.ts, platform.ts
│  ├─ figure/      Figure.tsx, animate.ts
│  ├─ screens/     Home, Editor, Player, Summary, Settings, SharePreview
│  ├─ components/  Button, Stepper, TimePicker, Sheet, Dialog, ProgressRing, Toast…
│  └─ styles/      tokens.css, themes.css, global.css
├─ tests/
└─ README.md
```

## 3. Schermen en navigatie

```
Home ──▶ Start ─────────────────▶ Speler ──(klaar/stop)──▶ Overzicht ──▶ Home
 │  ├─ Bewerken ──▶ Editor ──▶ Bibliotheek (paneel) / Oefening (paneel)
 │  └─ ⋯ Meer: Dupliceren · Delen · Verwijderen
 ├─ ＋ Nieuwe workout ──▶ Editor
 ├─ Importeren (link of code plakken) ──▶ Voorbeeld ──▶ Importeren
 └─ ⚙ Instellingen (met Hulp: installeren, importeren, geluid op iPhone)

Gedeelde link (#/deel/…) ──▶ Voorbeeld ──▶ Importeren / Kopieer voor de app
```

- Eén hoofdactie per scherm; knoppen met tekst én icoon; aanraakvlakken ≥ 48 px.
- Altijd een eigen terugknop (iPhone-app heeft geen browserknop); Android-terug sluit eerst panelen.
- Bevestiging bij verwijderen en stoppen.

**Home**: kaarten (naam, "6 oefeningen · 3 rondes · 14 min", strookje mini-figuurtjes, *Start* en *Bewerken*, *⋯* voor Dupliceren/Delen/Verwijderen). Streak-blokje, welkomstkaartje, installatie-uitleg (Android: echte *Installeren*-knop).

**Editor**: naam, rondes, rust tussen oefeningen, rust tussen rondes (+/-). Oefeningenlijst met sleepgreep, figuur/foto, naam, werktijd, rust. Oefening-paneel: naam, werktijd, eigen rust, foto maken/kiezen/verwijderen, omhoog/omlaag, verwijderen. Bibliotheek: zoeken (ook NL/EN-varianten), categorieën, meerdere aanvinken, eigen oefening. Tijden: +/- per 5 s (ingedrukt = sneller), snelkeuzes 20/30/45/60 s, tik op getal = native draaiwiel. Onderaan: totale duur (live) + *Opslaan*.

**Speler**: aftellen / werk / rust elk eigen kleur. Werk: naam, grote animatie of foto, grote timer met ring, "Ronde 2/4 · Oefening 3/6", voortgangsbalk. Rust: "RUST", timer, "Volgende: …" met afbeelding. Pauze-overlay. ⏭ = volgende fase; ⏮ = oefening opnieuw, binnen 3 s = vorige oefening. ✕ en Android-terug vragen bevestiging. Liggend: afbeelding en timer naast elkaar.

**Overzicht**: confetti, tegels (totale tijd, rondes, oefeningen, werktijd, ≈ kcal), persoonlijke boodschap, *Klaar* en *Nog een keer*.

**Instellingen**: geluid (piepjes, fluitje, spraak, trillen, "altijd laten klinken", volume, test), aftellen (aan/uit + duur, standaard 10 s), thema (4), gewicht, stemkeuze, back-up, hulp.

## 4. Datamodel

```ts
type Workout = {
  id: string; name: string;
  exercises: WorkoutExercise[];
  restSec: number;              // standaardrust ná elke oefening
  rounds: number;
  roundRestSec: number;         // vervangt de gewone rust tussen twee rondes
  createdAt: number; updatedAt: number;
};
type WorkoutExercise = {
  id: string; libraryId?: string; name: string; workSec: number;
  restSec?: number;             // optionele eigen rust ná deze oefening
  photoId?: string;
};
type LibraryExercise = {
  id: string; name: string; aliases: string[]; spoken?: string;
  category: 'benen' | 'boven' | 'core' | 'cardio';
  instruction: string; met: number; defaultWorkSec: number; animation?: PoseAnimation;
};
type Settings = {
  sound: { beeps; whistle; voice; vibrate; alwaysAudible; volume };
  countdown: { enabled; seconds };
  theme: 'sportief' | 'fris' | 'vrolijk' | 'pastel';
  weightKg?: number; voiceURI?: string;
};
type HistoryEntry = {
  id; date; workoutId; workoutName; totalSec; workSec; kcal; rounds;
  exercisesDone; completed; perExercise: { key; name; workSec }[];
};
```

- Fases: [aftellen] → werk₁ → rust → … → werkₙ → rondepauze → werk₁ → … → klaar. Rust van 0 s wordt overgeslagen.
- Totale duur = rondes × Σ werktijd + rondes × Σ rust(na oefening 1…n−1) + (rondes − 1) × rondepauze. Aftellen telt niet mee.
- Opslagsleutels met versienummer + migratie. Foto's verkleind tot max. 1024 px; ongebruikte foto's automatisch opgeruimd.

## 5. iPhone-aandachtspunten

| Probleem | Oplossing |
|---|---|
| Geluid/spraak pas na tik | Tik op *Start* ontgrendelt audio, stil geluidje, lege spraakzin, wake lock. Fallback: "Tik om geluid aan te zetten" |
| Vertraging | Piep/fluit zelf gesynthetiseerd, vooraf naar buffers gerenderd, ~1,5 s vooruit ingepland op de audioklok; annuleren bij pauze/overslaan |
| Stil-knop | Standaard mengen met muziek + tip; instelling "altijd laten klinken" (audiosessie `playback` / stille `<audio>`-truc), muziek pauzeert dan |
| Spraak | Beste nl-NL-stem (anders nl-BE, anders uit). Wachten op `voiceschanged`, `cancel()` vóór elke uiting. Start = max(na fluitje, rusteinde − 3 s − spreekduur − 0,3 s); spreeksnelheid per stem gemeten. Korte variant als de lange niet past |
| Scherm aan | Screen Wake Lock (opnieuw na terugkomen) + op iPhone ook stil lusvideootje (NoSleep-techniek) |
| Trillen | Niet op iPhone → optie verborgen met uitleg, nooit een fout |
| Wegschakelen | Tijdstempels; bij terugkomen doorspoelen naar juiste fase, geluiden opnieuw inplannen |
| Installeren | `display: standalone`, `orientation: any`, iOS-meta's, apple-touch-icon, opstartschermen; uitleg in app; waarschuwing in WhatsApp/Instagram-browser |
| Gegevens | Beginscherm-apps vallen niet onder de 7-dagen-regel van Safari; `navigator.storage.persist()`; back-up |
| Back-up op iPhone | Exporteren via deelmenu; download als fallback |
| Safe areas | `viewport-fit=cover` + `env(safe-area-inset-*)`, ook liggend |
| Safari-eigenaardigheden | `dvh`, invoer ≥ 16 px, `touch-action: manipulation`, geen pull-to-refresh/selectie in speler |

## 6. Delen
- Link `…/#/deel/<code>`; code = compacte JSON met lz-string.
- Native deelmenu, anders link kopiëren.
- Voorbeeldscherm met *Importeren*. iPhone: app herkent link of code in geplakte tekst ("Houd link ingedrukt → Kopieer → IntervalFit → Importeren → Plakken"); in Safari toont het voorbeeldscherm dat stappenplan met *Kopieer voor de app*.
- Eigen foto's gaan niet mee (bibliotheekfiguur of letter-tegel).
- Kapotte links → vriendelijke melding.

## 7. Oefeningen en animaties
- 37 oefeningen (zijplank links/rechts apart) in `src/data/exercises.ts`, met NL/EN-zoekwoorden, instructie, MET, spraaktekst.
- Eén zelfgemaakt figuurtje (dikke afgeronde lijnen), 2–4 houdingen per oefening, vloeiend geïnterpoleerd; rekwisieten waar nodig. Kleuren uit het thema, accent op het werkende lichaamsdeel.
- Galerijpagina tijdens ontwikkeling. In lijsten stilstaand, in de speler geanimeerd; respecteert "Verminder beweging". Licht genoeg voor trage Android-toestellen.

## 8. Calorieën, geschiedenis, prestaties
- kcal = Σ(MET × kg × uren werk) + 2,0 × kg × uren rust; alleen echt getrainde tijd.
- Streak = dagen op rij met ≥ 1 workout (≥ 1 min).
- Boodschappenmotor op prioriteit: eerste workout, mijlpalen, reeks, langste/meeste kcal ooit, minuten per oefening vandaag, deze week, totaal, vroege vogel, afwisselend compliment. Aparte boodschappen voor gestopte workouts.

## 9. Thema's
- **Donker & sportief**: bijna zwart, neongroen werk, elektrisch blauw rust, amber aftellen, gloed op de ring.
- **Licht & fris** (standaard): wit/mint, fris groen, hemelsblauw, koraal.
- **Kleurrijk & vrolijk**: volvlak kleurverlopen per fase, speelse ronde letters.
- **Zacht pastel**: crème, perzik, lavendel, zachtgeel.
Voldoende contrast (WCAG AA); statusbalkkleur past mee.

## 10. Bouwvolgorde

| Stap | Inhoud |
|---|---|
| 1. Basisstructuur | Project, PWA, tijdelijk icoon, router, opslag + migratie, themasysteem, bouwstenen, Home met voorbeeldworkouts, installatie-uitleg, GitHub Pages |
| 2. Workout-editor | Bibliotheek + animaties + galerij, editor, slepen, tijdkiezers, foto/camera, totale duur |
| 3. Speler | Timermotor, fases/kleuren, bediening, audio, spraak (+ uitspraakcontrole), wake lock, trillen, liggend, wegschakelen |
| 4. Instellingen | Geluidsopties incl. "altijd laten klinken", aftellen, 4 thema's volledig af, gewicht, back-up, stemkeuze, hulp |
| 5. Delen | Coderen, deelmenu, voorbeeldscherm, plakken in app, uitleg |
| 6. Overzicht na afloop | Geschiedenis, streak, calorieën, boodschappen, confetti |
| 7. Afwerking | Overgangen, definitief icoon + opstartschermen, updatemelding (nooit tijdens workout), toegankelijkheid, Lighthouse, README |

Updates: nieuwe versie wordt op de achtergrond opgehaald en toegepast bij volgende start of via melding op Home — nooit tijdens een workout.
