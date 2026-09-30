# IntervalFit — werkafspraken voor Claude

Persoonlijke interval/tabata-PWA (Vite + React + TS) voor de moeder van de gebruiker. Plan, status en alle besluiten: **PLAN.md** (eerst lezen).

## Werkwijze (elke sessie)
- Communiceer in het **Nederlands**; alle app-tekst is Nederlands.
- Bij nieuw werk: **eerst plannen**, dan stap voor stap bouwen. Keuzes die gebruik of uitstraling raken en niet in PLAN.md staan: **eerst vragen**.
- Na elke stap: zelf testen → **commit + push** → korte samenvatting, **online link**, **testlijst voor iPhone** (en Android waar relevant) → **wachten op akkoord**.
- Visuele wijzigingen (thema's, layout): eerst screenshots laten zien, dán online zetten.
- Werk efficiënt (gerichte tests, alleen nodige screenshots). Dreigt de limiet op te raken: eerst committen en pushen wat af en getest is, en melden waar je gebleven bent.
- Commits eindigen met `Co-Authored-By: Claude …`; git-identiteit is lokaal al ingesteld (GitHub noreply).

## Commando's
- `npm run dev` (poort 5183 via `.claude/launch.json`, niet in git) · `npm test` (Vitest) · `npm run build` (tsc + vite build)
- Online zetten = `git push` naar `main` → GitHub Actions → https://woutvb073.github.io/intervalfit/ (volg met `gh run watch`).
- In de browser de app zelf openen: `…/intervalfit/?dev=1` (anders zie je het installatiescherm).

## Testen
- Unit-tests in `tests/` (tijdlijn, tijdmotor, geluids-/spraakplanning, delen, figuren, bibliotheek).
- Browsertests in `tools/e2e/` (puppeteer-core + lokale Chrome): `cd tools/e2e && node <script>.mjs [basis-url]`. Standaard `http://localhost:5183/intervalfit/`; geef de live-URL mee om online te controleren.
  - `layout-test.mjs` (speler: 5 formaten × 5 fases, overlap-check), `instr-test.mjs` (uitleg niet afgekapt: 40 oefeningen × 5 formaten × 4 thema's), `theme-shots.mjs` (per thema Home/editor/speler), `share-test.mjs` (delen/importeren end-to-end), `backup-test.mjs`, `player-test.mjs` (geluid/spraak-logboek `window.__cueLog`), `bg-test.mjs` (wegschakelen → automatisch pauzeren), `poses.mjs` + `sheet.cjs` (8 momenten per animatie), `matrix.mjs` (installatiescherm per toestel/browser).
- Formaten: iPhone SE 375×667, iPhone 14 390×844, groot Android 412×915, liggend 844×390 / 915×412.
- Wat niet automatisch kan (echt geluid, stem, stil-knop, deelmenu, WhatsApp): in de testlijst voor de gebruiker zetten.

## Valkuilen
- De ingebouwde browser-pane maakt verkeerde uitsneden bij scrollen → screenshots via puppeteer-scripts.
- Headless Chrome: panelen sluiten traag (timers); `page.goto` met alleen een andere `#hash` laadt niet opnieuw → gebruik een nieuwe query (`?r=…`). `emulateMediaFeatures` kent geen `display-mode` → `matchMedia` overschrijven of `navigator.standalone` zetten.
- Vite ververst de pagina bij de eerste keer laden van een nieuwe dependency (kan een test afbreken; opnieuw draaien).
- Nieuwere Chrome: `scrollTo` geeft een Promise terug → nooit direct uit `useEffect` returnen (blok-body gebruiken).
- Workbox: manifest niet dubbel in `globPatterns` (anders geen precache/offline).
- iOS: audio/spraak/wake-lock alleen na een tik (`prepareWorkoutMedia()` synchroon in de klikhandler); geen geluid bij vergrendeld scherm; installed app heeft eigen opslag (los van Safari). Deelmenu voor bestanden moet direct in de tik → back-upbestand vooraf maken.
- Figuren: gestrekte ledematen 71,9 (been) / 51,5 (arm), anders zichtbare knik; voeten met `footAbs` plat houden; `npm test` bevat animatie-checks.
- Voorbeeldworkouts worden alleen bij de allereerste start aangemaakt (`migrate()`); opslag heeft een schemaversie — bij wijziging een migratiestap toevoegen.
