import { ScrollViewStyleReset } from 'expo-router/html';

// Šis failas skirtas tik žiniatinkliui ir naudojamas konfigūruoti šakniniam HTML
// kiekvienam žiniatinklio puslapiui statinio atvaizdavimo metu.
// Šios funkcijos turinys vykdomas tik Node.js aplinkose ir
// neturi prieigos prie DOM ar naršyklės API.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/*
          Išjungiamas body slinkimas žiniatinklyje. Dėl to ScrollView komponentai veikia panašiau kaip native aplinkoje.
          Vis dėlto body slinkimas dažnai naudingas mobiliajame žiniatinklyje. Jei norite jį įjungti, pašalinkite šią eilutę.
        */}
        <ScrollViewStyleReset />

        {/* Naudojami neapdoroti CSS stiliai kaip apėjimo būdas užtikrinti, kad fono spalva niekada nemirgėtų tamsiame režime. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        {/* Čia pridėkite bet kokius papildomus <head> elementus, kuriuos norite turėti globaliai žiniatinklyje... */}
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #fff;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #000;
  }
}`;
