# IntervalFit

Een persoonlijke interval- en tabata-trainingsapp. Iedere oefening heeft een eigen werktijd, en tijdens het trainen
zie je groot welke oefening bezig is. De app draait helemaal op je telefoon: geen account, geen server, en na de
eerste keer openen werkt hij ook zonder internet.

**Online versie:** https://woutvb073.github.io/intervalfit/

---

## 1. De app online zetten

De app staat op GitHub Pages en wordt **automatisch** online gezet zodra er iets naar de `main`-branch wordt gepusht.
Dat is eenmalig zo ingesteld:

1. De code staat in de repository `WoutvB073/intervalfit` op GitHub.
2. Onder **Settings → Pages** staat bij *Source* de optie **GitHub Actions** geselecteerd.
3. Het bestand `.github/workflows/deploy.yml` test en bouwt de app en zet hem online.

Je kunt de voortgang volgen onder het tabblad **Actions** van de repository. Een groen vinkje betekent: online.

## 2. Installeren op iPhone

1. Open de link hierboven in **Safari**. (Heb je de link via WhatsApp gekregen? Tik op de link en kies zo nodig
   *Open in Safari*.)
2. Tik onderin op **•••** of op het deel-icoon (vierkantje met pijl omhoog).
3. Kies **Deel** en daarna **Zet op beginscherm**. Zie je het niet? Scroll dan een stukje omlaag.
4. Zorg dat **Open als webapp** aan staat en tik op **Voeg toe**.
5. Open IntervalFit voortaan via het nieuwe icoon op je beginscherm. De app opent dan zonder adresbalk.

> Let op: op iPhone heeft de app op het beginscherm een **eigen geheugen**, los van Safari. Gebruik daarom altijd
> het icoon op je beginscherm.

## 3. Installeren op Android

1. Open de link hierboven in **Chrome**.
2. Tik op de knop **Installeren** in de app, of tik rechtsboven op **⋮** en kies **App installeren**
   (of **Toevoegen aan startscherm**).
3. Bevestig met **Installeren**. Het icoon verschijnt op je startscherm.

## 4. Later een nieuwe versie online zetten

1. Pas de code aan en controleer lokaal:
   ```bash
   npm test
   npm run build
   ```
2. Sla de wijziging op en stuur hem naar GitHub:
   ```bash
   git add -A
   git commit -m "Korte beschrijving van de wijziging"
   git push
   ```
3. Na een paar minuten staat de nieuwe versie online. Wie de app al heeft, ziet op het beginscherm van de app de
   melding **"Er is een nieuwe versie"** met de knop **Bijwerken**. (Die melding verschijnt nooit tijdens een
   workout.)

---

## Voor ontwikkelaars

```bash
npm install      # eenmalig
npm run dev      # ontwikkelserver op http://localhost:5173/intervalfit/
npm test         # automatische tests
npm run build    # productieversie in dist/
npm run preview  # productieversie lokaal bekijken
```

- De oefeningenbibliotheek staat in één bestand: `src/data/exercises.ts`.
- De naam van de app staat in `src/config.ts`, `vite.config.ts` en `index.html`.
- Het app-icoon wordt gemaakt uit `public/logo.svg` (configuratie in `pwa-assets.config.ts`).
- Het volledige plan en de gemaakte keuzes staan in `PLAN.md`.
