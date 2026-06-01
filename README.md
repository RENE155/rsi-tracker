# RSI Tracker

**RSI Tracker** – realaus laiko kriptovaliutų RSI (santykinio stiprumo indekso) stebėjimo sistema. Ją sudaro dvi dalys: mobilioji programėlė (Expo / React Native) ir foninė tarnyba (FastAPI), kuri seka „Bybit" rinkos duomenis ir siunčia „push" pranešimus, kai RSI peržengia perpirkimo (overbought) arba perpardavimo (oversold) ribas.

> ℹ️ Tai portfolio variantas. Visi slapti raktai pašalinti – savo konfigūracijai naudokite `.env.example` failus.

## Parsisiųsti

- [App Store](https://apps.apple.com/us/app/rsi-tracker/id6748629243)
- [Google Play](https://play.google.com/store/apps/details?id=com.renaldas.tst2)

## Funkcionalumas

- 📈 Realaus laiko RSI skaičiavimas visoms „Bybit" USDT begalinių kontraktų (perpetual) poroms
- 🔔 „Push" pranešimai (Expo) peržengus perpirkimo / perpardavimo ribas
- ⚙️ Konfigūruojamas RSI periodas, ribos, žvakių intervalas ir pranešimų „atvėsimo" laikas
- 👤 Vartotojų autentifikacija (Supabase, Google, Apple)
- 💳 Prenumeratos per „RevenueCat"
- 🌍 Kalbų palaikymas (i18n)

## Architektūra

```
rsi-tracker/
├── mobile/    # Expo / React Native programėlė (TypeScript)
└── backend/   # FastAPI tarnyba: Bybit WebSocket → RSI → Expo push (Python)
```

### `mobile/` – mobilioji programėlė

Technologijos: Expo 52, React Native 0.77, expo-router, Supabase, RevenueCat (`react-native-purchases`), `expo-notifications`, grafikai (`react-native-chart-kit`, `react-native-wagmi-charts`).

```bash
cd mobile
npm install
cp .env.example .env   # įrašykite savo reikšmes
npm start
```

> Pastaba: natyvūs `ios/` ir `android/` aplankai į repozitoriją neįtraukti – jie generuojami komanda `npx expo prebuild`. Norėdami naudoti „push" pranešimus / Google prisijungimą, pridėkite savo `google-services.json` ir `GoogleService-Info.plist` failus.

### `backend/` – foninė tarnyba

Technologijos: FastAPI, Bybit WebSocket, Supabase, Expo Push API.

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # įrašykite savo reikšmes
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Tarnybos būseną galima patikrinti adresu `http://localhost:8000/status`.

## Aplinkos kintamieji

Žr. `mobile/.env.example` ir `backend/.env.example`.

## Diegimas

- **Backend**: tinka „Render" ar panašios paslaugos. Start komanda: `uvicorn main:app --host 0.0.0.0 --port $PORT`.
- **Mobile**: EAS Build (`eas build --platform ios|android`).
