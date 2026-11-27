# Huisprojecten

Een app voor alle klussen in en om het huis. Je ziet in één oogopslag wat je **nu** kunt oppakken. Afhankelijkheden ("dit moet eerst") vormen vanzelf **trajecten**, en elk afgerond project levert punten op voor je **huis-level**.

De app is een PWA: hij draait in Safari, staat als een gewone app op je beginscherm en werkt ook offline.

## Op je iPhone zetten

1. Open **https://yorbott.github.io/huisprojecten/** in Safari.
2. Tik op de deelknop (vierkant met pijl omhoog) en kies **Zet op beginscherm**.
3. Open de app voortaan via het icoon *Huis*.

Je gegevens staan op je telefoon. Maak via ⚙︎ › *Back-up exporteren* af en toe een back-up, totdat samen synchroniseren klaar is.

## Wat zit erin (versie 0.1)

- **Nu**: huis-level, net vrijgekomen projecten, wat er bezig is en wat beschikbaar is (beste keuze eerst)
- **Plan**: trajecten met stap X van Y, losse klussen, doel met de route ernaartoe en de kosten daarvan, plus de impact/moeite-matrix
- **Project**: kosten (schatting, offertes, werkelijk), afhankelijkheden (moet eerst / liever eerst), stappen en notities
- **Afronden**: punten, wat er vrijkomt en de werkelijke kosten
- Donkere modus, terugvegen vanaf de linkerrand, offline werken

## Hoe het rekent

- **Op slot**: een project wacht op een *moet eerst*-project dat nog niet klaar is. *Liever eerst* geeft alleen een hint.
- **Traject**: projecten die via afhankelijkheden met elkaar verbonden zijn. De stap is de langste keten ervoor.
- **Punten**: moeite (S 10 · M 30 · L 60 · XL 100) × impact (1–5 → ×0,8 … ×1,2).
- **Huis-level**: level *n* vraagt 40 × (n−1)^1,6 punten in totaal.

## Ontwikkelen

```bash
npm install
npm run dev       # bouwt en serveert op http://localhost:5173
npm run build     # bouwt naar ./dist
```

Elke push naar `main` wordt automatisch gebouwd en op GitHub Pages gezet (zie `.github/workflows/deploy.yml`).

## Planning

1. ✅ Basis: projecten, afhankelijkheden, Nu, Plan, Project, Nieuw project
2. Ruimtes met foto's, Ideeën-inbox, voor/na-foto's
3. Samen gebruiken via de privé-repo `huisprojecten-data`, koppelen met een QR-code
4. Afwerking: zoeken, introductie, automatische fases (later)
