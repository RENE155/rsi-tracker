export interface BybitTicker {
  symbol: string;
  lastPrice: string;
  highPrice24h: string;
  lowPrice24h: string;
  volume24h: string;
  turnover24h: string;
  openInterest: string;
  fundingRate?: string;
  nextFundingTime?: string;
  // Pridėkite kitus svarbius laukus iš Ticker endpoint
}

export interface BybitOpenInterestEntry {
  openInterest: string;
  timestamp: string;
}

export interface BybitOpenInterestData {
  list: BybitOpenInterestEntry[];
  nextPageCursor?: string;
}

interface BybitTickerResponse {
  retCode: number;
  retMsg: string;
  result: {
    category: string;
    list: BybitTicker[];
  };
  retExtInfo: any;
  time: number;
}

interface BybitOpenInterestResponse {
  retCode: number;
  retMsg: string;
  result: {
    symbol: string;
    category: string;
    list: BybitOpenInterestEntry[];
    nextPageCursor?: string;
  };
  retExtInfo: any;
  time: number;
}

const BYBIT_API_BASE_URL = 'https://api.bybit.com'; // Pagrindinis tinklas (Mainnet)

export async function fetchBybitTicker(symbol: string, category: string = 'linear'): Promise<{ ticker?: BybitTicker, error?: string }> {
  try {
    const response = await fetch(`${BYBIT_API_BASE_URL}/v5/market/tickers?category=${category}&symbol=${symbol}`);
    if (!response.ok) {
      const errorData = await response.json();
      return { error: `API Error: ${response.status} - ${errorData?.retMsg || 'Failed to fetch ticker'}` };
    }
    const data: BybitTickerResponse = await response.json();
    if (data.retCode !== 0) {
      return { error: `Bybit Error: ${data.retMsg}` };
    }
    if (data.result && data.result.list && data.result.list.length > 0) {
      return { ticker: data.result.list[0] };
    }
    return { error: 'Ticker data not found for the symbol.' };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch Bybit ticker data.' };
  }
}

export async function fetchBybitOpenInterest(
  symbol: string,
  category: string = 'linear',
  intervalTime: string = '1h', // pvz., 5min, 15min, 30min, 1h, 4h, 1d
  limit: number = 20 // Duomenų taškų skaičius
): Promise<{ openInterestData?: BybitOpenInterestData, error?: string }> {
  try {
    // Bybit open interest endpoint gali reikalauti startTime ir endTime.
    // Paprastumo dėlei gausime naujausius duomenis. Pirmiausia pabandykime be startTime/endTime,
    // nes kai kurie API pagal nutylėjimą grąžina naujausius duomenis arba naudoja 'limit'.
    // Pateiktoje dokumentacijoje rodomi pavyzdžiai su startTime ir endTime puslapiavimui.
    // Paprastesniam „naujausi X taškai“ būdui gali tekti pakoreguoti.
    // Patikrinkime API dokumentaciją dėl 'limit' parametro ar panašaus šiam endpoint.
    // Pateikta dokumentacija skirta /v5/market/open-interest. Ji naudoja startTime, endTime.
    // Sukonstruokime užklausą paskutinėms 20 valandų, jei intervalTime yra '1h'.
    const endTime = Date.now();
    const startTime = endTime - (limit * 60 * 60 * 1000); // Darant prielaidą, kad intervalas 1h

    const response = await fetch(
      `${BYBIT_API_BASE_URL}/v5/market/open-interest?category=${category}&symbol=${symbol}&intervalTime=${intervalTime}&startTime=${startTime}&endTime=${endTime}&limit=${limit}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      return { error: `API Error: ${response.status} - ${errorData?.retMsg || 'Failed to fetch open interest'}` };
    }
    const data: BybitOpenInterestResponse = await response.json();

    if (data.retCode !== 0) {
      return { error: `Bybit Error: ${data.retMsg}` };
    }
    if (data.result && data.result.list) {
      return { openInterestData: { list: data.result.list, nextPageCursor: data.result.nextPageCursor } };
    }
    return { error: 'Open interest data not found.' };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch Bybit open interest data.' };
  }
}

// --- Naujos sąsajos 1 etapui ---
export interface BybitFundingRateEntry {
  symbol: string;
  fundingRate: string;
  fundingRateTimestamp: string; // Paties funding rate laiko žyma
}

export interface BybitFundingHistoryResponse {
  retCode: number;
  retMsg: string;
  result: {
    category: string;
    list: BybitFundingRateEntry[];
  };
  retExtInfo: any;
  time: number;
}

export interface BybitLongShortRatioEntry {
  symbol: string;
  buyRatio: string; // Vartotojų, užimančių long pozicijas, dalis
  sellRatio: string; // Vartotojų, užimančių short pozicijas, dalis
  timestamp: string;
}

export interface BybitLongShortRatioResponse {
  retCode: number;
  retMsg: string;
  result: {
    list: BybitLongShortRatioEntry[];
  };
  retExtInfo: any;
  time: number;
}

// --- Naujos service funkcijos 1 etapui ---
export async function fetchBybitFundingHistory(
  symbol: string,
  category: string = 'linear',
  limit: number = 20 // Duomenų taškų skaičius (pvz., paskutiniams 20 funding intervalų)
): Promise<{ fundingHistory?: BybitFundingRateEntry[], error?: string }> {
  try {
    const response = await fetch(`${BYBIT_API_BASE_URL}/v5/market/funding/history?category=${category}&symbol=${symbol}&limit=${limit}`);
    if (!response.ok) {
      const errorData = await response.json();
      return { error: `API Error: ${response.status} - ${errorData?.retMsg || 'Failed to fetch funding history'}` };
    }
    const data: BybitFundingHistoryResponse = await response.json();
    if (data.retCode !== 0) {
      return { error: `Bybit Error: ${data.retMsg}` };
    }
    if (data.result && data.result.list) {
      return { fundingHistory: data.result.list };
    }
    return { error: 'Funding history data not found.' };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch Bybit funding history.' };
  }
}

export async function fetchBybitLongShortRatio(
  symbol: string,
  category: string = 'linear',
  period: string = '1h', // Duomenų detalumas: 5min, 15min, 30min, 1h, 2h, 4h
  limit: number = 20 // Duomenų taškų skaičius
): Promise<{ longShortRatioHistory?: BybitLongShortRatioEntry[], error?: string }> {
  try {
    const response = await fetch(`${BYBIT_API_BASE_URL}/v5/market/account-ratio?category=${category}&symbol=${symbol}&period=${period}&limit=${limit}`);
    if (!response.ok) {
      const errorData = await response.json();
      return { error: `API Error: ${response.status} - ${errorData?.retMsg || 'Failed to fetch long/short ratio'}` };
    }
    const data: BybitLongShortRatioResponse = await response.json();
    if (data.retCode !== 0) {
      return { error: `Bybit Error: ${data.retMsg}` };
    }
    if (data.result && data.result.list) {
      return { longShortRatioHistory: data.result.list };
    }
    return { error: 'Long/short ratio data not found.' };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch Bybit long/short ratio.' };
  }
}

// --- Naujos sąsajos likvidavimo duomenims ---
export interface BybitLiquidationEntry {
  symbol: string;
  price: string;
  qty: string; // Likvidavimo orderio kiekis
  side: "Buy" | "Sell"; // Likvidavimo kryptis (Buy pusė reiškia, kad likviduota short pozicija, Sell pusė reiškia, kad likviduota long pozicija)
  time: string; // Likvidavimo laiko žyma
  updatedTime?: string; // Spot atveju tai reiškia šio likvidavimo orderio atnaujinimo laiką
}

export interface BybitLiquidationResponse {
  retCode: number;
  retMsg: string;
  result: {
    category: string;
    list: BybitLiquidationEntry[];
    nextPageCursor?: string; // Puslapiavimui, jei prireiks ateityje
  };
  retExtInfo: any;
  time: number;
}

// --- Nauja service funkcija likvidavimo duomenims ---
export async function fetchBybitLiquidations(
  symbol: string,
  category: string = 'linear',
  limit: number = 50 
): Promise<{ liquidations?: BybitLiquidationEntry[], error?: string }> {
  try {
    const response = await fetch(`${BYBIT_API_BASE_URL}/v5/market/liquidations?category=${category}&symbol=${symbol}&limit=${limit}`);

    // 404 konkrečiai traktuojamas kaip šio simbolio duomenų nebuvimas
    if (response.status === 404) {
      return { liquidations: [] };
    }

    if (!response.ok) {
      // Kitiems ne 200 atsakymams (pvz., 500, 403, 400)
      try {
        const errorData = await response.json(); // Bandoma išanalizuoti Bybit klaidą
        return { error: `API Error: ${response.status} - ${errorData?.retMsg || 'Failed to fetch liquidations'}` };
      } catch (e) {
        // Jei pats klaidos atsakymas nėra JSON
        return { error: `API Error: ${response.status} - Service unavailable or invalid request (non-JSON error response)` };
      }
    }

    // Apdorojamas sėkmingas 200 OK atsakymas
    const responseText = await response.text();
    if (!responseText) {
      // Tuščias atsakymo turinys su 200 OK taip pat reiškia, kad duomenų nėra
      return { liquidations: [] };
    }

    let data: BybitLiquidationResponse;
    try {
      data = JSON.parse(responseText);
    } catch (e: any) {
      return { error: `JSON Parse error: ${e.message || 'Failed to parse liquidation data'}` };
    }

    if (data.retCode !== 0) {
      // Bybit API grąžino klaidą JSON turinyje (pvz., netinkami parametrai, bet ne 404/500 HTTP klaida)
      return { error: `Bybit Logic Error: ${data.retMsg} (Code: ${data.retCode})` };
    }

    if (data.result && data.result.list) {
      return { liquidations: data.result.list };
    } else {
      // Galiojanti atsakymo struktūra, bet be list rakto, reiškia, kad likvidavimų nėra
      return { liquidations: [] };
    }

  } catch (error: any) {
    // Tinklo klaidos ar kitos netikėtos problemos gavimo metu
    return { error: `Network or Client Error: ${error.message || 'Failed to fetch Bybit liquidations.'}` };
  }
} 