# IntervalFit

Een persoonlijke interval- en tabata-trainingsapp. Iedere oefening heeft een eigen werktijd, en tijdens het trainen
zie je groot welke oefening bezig is, met een bewegend figuurtje, piepjes en een stem. De app draait helemaal op de
telefoon: geen account, geen server, en na de eerste keer openen werkt hij ook zonder internet.

- **Online:** https://woutvb073.github.io/intervalfit/
- **Handleiding voor gebruikers (1 pagina, pdf):** https://woutvb073.github.io/intervalfit/handleiding.pdf
  (ook in de app: Instellingen → Hulp → Handleiding)

---

## 1. Installeren

**iPhone** (iOS 16.4 of nieuwer)
1. Open de link in **Safari**. (Via WhatsApp gekregen? Tik op de link en kies zo nodig *Open in Safari*.)
2. Tik op **•••** of op het deel-icoon (vierkantje met pijl omhoog).
3. Kies **Zet op beginscherm**. Zie je het niet? Scroll een stukje omlaag.
4. Laat **Open als webapp** aan staan en tik op **Voeg toe**.
5. Open IntervalFit voortaan via het icoon op het beginscherm.

> Op iPhone heeft de app op het beginscherm een **eigen geheugen**, los van Safari. Gebruik daarom altijd het icoon.

**Android** (altijd via **Chrome**)
1. Open de link in **Chrome**. Open je hem in een andere browser (bijv. Samsung Internet), dan staat er een knop
   **Openen in Chrome**.
2. Tik op **Installeren** in de app, of op **⋮** → **App installeren** / **Toevoegen aan startscherm**.

> Waarom Chrome? Via Samsung Internet geeft Android vaak de melding *"Gevaarlijke app geblokkeerd / gemaakt voor een
> oudere versie van Android"* en kan Samsung Internet de kleuren van de app donker maken. Via Chrome gebeurt dat niet.
> Al via Samsung Internet geïnstalleerd? Maak een back-up, verwijder de app, installeer via Chrome en zet de back-up terug.

Wie de link in een gewone browser opent, ziet alleen een installatiescherm met de stappen voor het eigen toestel en
de eigen browser. Op een computer verschijnt een QR-code.

## 2. Een nieuwe versie online zetten

De app staat op GitHub Pages en gaat **automatisch** online na een push naar `main`
(`.github/workflows/deploy.yml` test, bouwt en publiceert; volgen via het tabblad **Actions** of `gh run watch`).

```bash
npm test
npm run build
git add -A
git commit -m "Korte beschrijving"
git push
```

Wie de app al heeft, ziet op Home de melding **"Er is een nieuwe versie"** met **Bijwerken**; die melding komt
nooit tijdens een workout.

---

## 3. Zelf iets aanpassen (of laten aanpassen)

Je kunt dit zelf doen of aan Claude Code vragen. Geef dan altijd mee: *"Lees eerst CLAUDE.md en PLAN.md."*
Voorbeeld: *"Lees eerst CLAUDE.md en PLAN.md. Voeg de oefening 'Burpee met opdrukken' toe aan de bibliotheek, met
animatie, zoals de bestaande oefeningen."*

### Een oefening toevoegen
1. **Gegevens** – voeg een blok toe in `src/data/exercises.ts` (in de juiste categorie):
   ```ts
   {
     id: 'good-mornings',              // uniek, kleine letters; nooit meer wijzigen (staat in gedeelde links)
     name: 'Good mornings',            // Engels als dat in NL gebruikelijk is, anders Nederlands
     category: 'benen',                // 'benen' | 'boven' | 'core' | 'cardio'
     met: 3.5,                         // inspanning voor de calorieschatting
     defaultWorkSec: 30,
     equipment: 'dumbbells',           // weglaten = zonder materiaal; anders 'stoel' | 'dumbbells' | 'stang'
     aliases: ['good morning', 'heupscharnier', 'rugstrekken'],   // Nederlandse én Engelse zoekwoorden
     spoken: 'goed mornings',          // alleen als de Nederlandse stem de naam anders verkeerd uitspreekt
     instruction: 'Rug recht, heupen naar achteren, knieën licht gebogen.', // max. ± 60 tekens
   },
   ```
2. **Animatie** – voeg in `src/figure/animations.ts` een animatie toe met dezelfde `id` (sleutelhoudingen + tijden).
   Links/rechts-varianten: de ene maken, de andere gespiegeld (`mirror: true`, zie zijplank en bicep curls links/rechts).
   Draaiende bewegingen (zoals Russian twists) kun je in 3D opbouwen met `src/figure/body3d.ts`. Zonder animatie krijgt
   de oefening vanzelf een nette letter-tegel.
3. **Controleren**:
   - `npm test` (o.a. aantal oefeningen in `tests/basics.test.ts` ophogen, instructielengte, animatie-checks);
   - galerij: `…/intervalfit/?dev=1#/galerij`, en per oefening 8 momenten via de knop *Houdingen*
     (of `cd tools/e2e && node poses.mjs <id>`);
   - de stem: speel een workout af met de nieuwe oefening.

### Teksten, kleuren en logo
- **Boodschappen na afloop**: `src/data/messages.ts` (per soort een lijst varianten; `{naam}`, `{tijd}` enz. worden
  ingevuld).
- **Thema's/kleuren**: `src/styles/themes.css`. `npm test` controleert het contrast (leesbaarheid) van de
  belangrijkste kleuren.
- **Naam van de app**: `src/config.ts`, `vite.config.ts` (manifest) en `index.html`.
- **Logo/app-icoon**: `public/logo.svg` (volledig gevuld vierkant, inhoud binnen een cirkel met straal 205 rond het
  midden). Alle icoonformaten (ook Android maskable en favicon) ontstaan vanzelf bij `npm run build`. Daarna de
  iPhone-opstartschermen opnieuw maken: `node tools/splash.mjs`.
- **Handleiding**: tekst in `src/screens/manual/Manual.tsx`; daarna de pdf opnieuw maken met de ontwikkelserver aan:
  `node tools/manual-pdf.mjs` (schrijft `public/handleiding.pdf`).

### Opgeslagen gegevens
Alles staat in `localStorage` (workouts, instellingen, geschiedenis) en IndexedDB (eigen foto's), met een
schemaversie in `src/storage/data.ts`. Verander je de vorm van opgeslagen gegevens, verhoog dan `SCHEMA_VERSION` en
voeg een stap toe in `migrate()`, zodat bestaande workouts nooit kapotgaan.

---

## 4. Voor ontwikkelaars

```bash
npm install      # eenmalig
npm run dev      # ontwikkelserver (poort 5183 via .claude/launch.json)
npm test         # unit-tests (Vitest)
npm run build    # productieversie in dist/ (tsc + vite build)
npm run preview  # productieversie lokaal
```

**Ontwikkelaarsmodus** (verborgen voor gewone gebruikers)
- In een browser: open de app met `?dev=1` (uit met `?dev=0`); de keuze wordt onthouden. Linksonder staat dan "dev".
- In de geïnstalleerde app: **7× snel op het logo** op Home tikken (nog eens 7× = uit).
- Dan verschijnt op Home een geel blok met: test-workout (3× 10 s, 2 rondes), **Galerij** en **Nep-geschiedenis**
  (scenario's voor mijlpalen, en een workout nep-afronden; de echte geschiedenis wordt bewaard en is terug te zetten).
- Zonder ontwikkelaarsmodus geeft `#/galerij` "Niet gevonden".

**Browsertests** (`tools/e2e/`, puppeteer-core + lokale Chrome): `cd tools/e2e && node <script>.mjs [basis-url]`.
Belangrijkste: `walkthrough.mjs` (rondgang als nieuwe gebruiker + controle op zichtbare ontwikkelaarsfuncties),
`summary-test.mjs`, `library-test.mjs`, `player-test.mjs`, `layout-test.mjs`, `share-test.mjs`, `backup-test.mjs`,
`bg-test.mjs`, `pwa-check.mjs` (installeerbaarheid + offline starten). Zie `CLAUDE.md` voor de volledige lijst.

**Mappen**
```
src/
  data/       oefeningen, voorbeeldworkouts, boodschappen, nep-geschiedenis (dev)
  model/      types, tijdlijn, calorieën, reeks/statistiek, opmaak
  engine/     tijdmotor, geluid, spraak, scherm-aan, platformherkenning, confetti
  figure/     het figuurtje (skelet, animaties, tekenen)
  storage/    opslag, geschiedenis, foto's, back-up, delen
  screens/    Home, editor, speler, overzicht, voortgang, instellingen, handleiding, delen, installatiescherm
  components/ knoppen, panelen, pictogrammen, …
  styles/     thema's en opmaak
tools/        splash.mjs, manual-pdf.mjs, e2e/ (browsertests)
design/icon/  ontwerpstudies voor het icoon + beginscherm-voorbeeld
```

Het volledige plan, alle besluiten en de status staan in **`PLAN.md`**; werkafspraken voor Claude in **`CLAUDE.md`**.
