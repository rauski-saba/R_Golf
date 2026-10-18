# R_Golf

Golfkierrosten tuloskirjanpito selaimessa. Toimii puhelimessa ja tietokoneella, ja sen voi lisätä puhelimen kotinäytölle.

## Mitä se tekee

- Hakee Suomen, Turkin ja Tunisian golfkentät väylätietoineen (par, väylähcp) OpenStreetMapista.
- Kentän voi lisätä tai korjata käsin, samoin tiit (CR ja slope).
- Kierroksella syötetään lyönnit väylä kerrallaan useammalle pelaajalle.
- Laskee pelitasoituksen (WHS), tasoituslyönnit väylittäin ja pistebogey-pisteet.

Tiedot tallentuvat toistaiseksi vain omaan selaimeen. Kierroksen jakaminen kavereille tulee seuraavassa vaiheessa.

## Käyttö

Sovellus on pelkkää HTML:ää, CSS:ää ja JavaScriptiä ilman käännösvaihetta. Paikallisesti:

```sh
python3 -m http.server 8000
# avaa http://localhost:8000
```

Testit (Node 18+):

```sh
node --test tests/
```

## Kenttädata

Kenttätiedot © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), lisenssi ODbL 1.0. Haku tehdään [Overpass API](https://overpass-api.de/):n kautta.
