# R_Golf

Golfporukan oma tuloskirjanpito. Asennetaan puhelimen kotinäytölle (Android ja iPhone), toimii myös ilman verkkoyhteyttä ja synkronoi tulokset, kun yhteys palaa.

## Points-peli

Ei tasoituksia. Pisteet väylittäin lasketaan yhteen:

| | Pisteet |
|---|---|
| Väyläosuma (ei par 3 -väylillä) | 1 |
| Green (GIR) | 1 |
| Hole in one | 4 |
| Eagle tai parempi | 3 |
| Birdie | 2 |
| Par | 1 |

Pelaajat merkitsevät väylä- ja green-osumat itse, tulospisteet lasketaan lyönneistä. Lisäksi kirjataan lyöntitulos (scr).
Kuka tahansa voi kirjata kenen tahansa tuloksen, ja flightin kirjaaja voi rajata näkymän oman flightinsa pelaajiin.

## Mitä se tekee

- Hakee Suomen, Turkin ja Tunisian golfkentät väylätietoineen (par, väylähcp) OpenStreetMapista.
- El Kantaoui Golfin (Tunisia) Sea- ja Panorama-kentät ovat valmiina tiitietoineen, joten ne toimivat ilman verkkoyhteyttä.
- Kentän voi lisätä tai korjata käsin, samoin tiit (CR ja slope).
- Kierroksella syötetään lyönnit väylä kerrallaan useammalle pelaajalle.
- Pelimuodot: Points (ilman tasoituksia) ja pistebogey (WHS-pelitasoitus, tasoituslyönnit väylittäin).

Kaikki tallentuu ensin puhelimeen. Kun kierros jaetaan, muut liittyvät kuusimerkkisellä koodilla, ja muutokset synkronoidaan Supabaseen aina kun verkko on käytössä. Jos samaa merkintää on muutettu kahdessa puhelimessa, uusin muutos voittaa.

## Synkronoinnin käyttöönotto (kerran)

1. Luo projekti osoitteessa supabase.com.
2. Aja `supabase/schema.sql` projektin SQL Editorissa.
3. Kopioi Project Settings → API -sivulta Project URL ja anon public key tiedostoon `js/config.js`.
4. Julkaise sovellus (esim. Vercel: tuo GitHub-repo, ei build-asetuksia) ja jaa osoite porukalle. Puhelimessa: Safari → Jaa → Lisää Koti-valikkoon, Chrome → ⋮ → Asenna sovellus.

Ilman asetuksia sovellus toimii yhdellä puhelimella ilman jakamista.

## Käyttö

Sovellus on pelkkää HTML:ää, CSS:ää ja JavaScriptiä ilman käännösvaihetta. Paikallisesti:

```sh
python3 -m http.server 8000
# avaa http://localhost:8000
```

Testit (Node 18+):

```sh
node --test tests/*.test.mjs
```

## Kenttädata

Kenttätiedot © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), lisenssi ODbL 1.0. Haku tehdään [Overpass API](https://overpass-api.de/):n kautta.
