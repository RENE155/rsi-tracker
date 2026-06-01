import asyncio
import os
import sys
import time
import logging
import threading
from collections import defaultdict
from contextlib import asynccontextmanager

import numpy as np
import pandas as pd
import requests
from fastapi import FastAPI, HTTPException
from pybit.unified_trading import HTTP, WebSocket
from supabase import create_client, Client
from dotenv import load_dotenv

# Įkelti .env failą vietinei plėtrai
load_dotenv()

# --- Konfigūracija ---
# Bybit raktai (privaloma)
BYBIT_API_KEY = os.environ['BYBIT_API_KEY']
BYBIT_API_SECRET = os.environ['BYBIT_API_SECRET']

# Supabase konfigūracija (privaloma)
SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_SERVICE_KEY = os.environ['SUPABASE_SERVICE_KEY']

# RSI konfigūracija
RSI_PERIODS = int(os.getenv('RSI_PERIODS', '14'))
OVERBOUGHT_THRESHOLD = int(os.getenv('OVERBOUGHT_THRESHOLD', '90'))
OVERSOLD_THRESHOLD = int(os.getenv('OVERSOLD_THRESHOLD', '10'))
KLINE_INTERVAL = os.getenv('KLINE_INTERVAL', '240') # Numatytasis 4H

# Įspėjimų konfigūracija
ALERT_COOLDOWN_SECONDS = int(os.getenv('ALERT_COOLDOWN_SECONDS', '300')) # 5 minutės
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

# WebSocket konfigūracija
WS_PING_INTERVAL = 20  # Siųsti ping kas 20 sekundžių
WS_PING_TIMEOUT = 10   # Laukti pong atsakymo iki 10 sekundžių
HEARTBEAT_INTERVAL = 15 # Tikrinti ryšį kas 15 s vietoj 30 s
NO_MESSAGE_TIMEOUT = 60 # Prisijungti iš naujo, jei 60 s nėra pranešimų (sumažinta nuo 120 s)
MAX_RECONNECT_DELAY = 300 # Maksimalus delsimas tarp pakartotinio prisijungimo bandymų

# --- Žurnalo nustatymai ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(threadName)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)] # Rašyti į stdout, skirta Render
)
logger = logging.getLogger(__name__)

# --- RSI skaičiavimas ---
def calculate_rsi(prices, periods=RSI_PERIODS):
    """Apskaičiuoti RSI iš pandas kainų Series"""
    if len(prices) < periods + 1: # Reikia bent periods + 1 duomenų taškų
        return np.nan
    delta = prices.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(com=periods - 1, adjust=False).mean() # Naudoti com=periods-1 standartiniam RSI
    avg_loss = loss.ewm(com=periods - 1, adjust=False).mean()
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return rsi.iloc[-1] # Grąžinti paskutinę apskaičiuotą RSI reikšmę


# --- RSI Monitor klasė ---
class RSIMonitor:
    def __init__(self, supabase_client: Client):
        logger.info("Initializing RSI Monitor...")
        self.supabase: Client = supabase_client
        self.session = HTTP(
            testnet=False, # Nustatyti True testavimui, jei reikia
            api_key=BYBIT_API_KEY,
            api_secret=BYBIT_API_SECRET
        )
        self.ws = None # WebSocket objektas, inicializuojamas vėliau
        self.price_data = defaultdict(list)
        self.symbols = []
        self.subscribed_symbols = set()
        self.lock = threading.Lock()
        self.is_running = False
        self.rsi_values = {}
        self.last_alert_time = defaultdict(float)
        self.connected = False
        self.reconnect_count = 0
        self.last_message_time = 0
        self.last_heartbeat_check = 0
        self._stop_event = threading.Event()
        self._last_connected_log = 0
        self.funding_rates = {} # Pridėta finansavimo normoms saugoti
        self.daily_rsi_cache = {} # Talpykla dienos RSI reikšmėms
        self.daily_rsi_cache_time = {} # Talpyklos laiko žymos dienos RSI reikšmėms
        self.ticker_subscribed_symbols = set()  # Sekti simbolius, užsiprenumeruotus ticker duomenims

    def _get_all_symbols(self):
        """Gauti aktyviai prekiaujamų USDT linijinių amžinųjų kontraktų simbolių sąrašą"""
        logger.info("Fetching available symbols from Bybit...")
        try:
            max_retries = 3
            retry_delay = 2
            for attempt in range(max_retries):
                try:
                    instruments = self.session.get_instruments_info(
                        category="linear",
                        limit=1000
                    )
                    if instruments.get("retCode") != 0:
                        raise Exception(f"Bybit API error: {instruments.get('retMsg', 'Unknown error')}")
                    break
                except Exception as e:
                    if attempt < max_retries - 1:
                        logger.warning(f"Failed to get instruments (attempt {attempt+1}/{max_retries}): {e}")
                        time.sleep(retry_delay * (2 ** attempt))
                    else:
                        logger.error(f"Failed to get instruments after {max_retries} attempts: {e}")
                        raise
            
            symbols = sorted([
                s["symbol"] for s in instruments["result"]["list"]
                if s["symbol"].endswith("USDT") and s["status"] == "Trading"
            ])
            logger.info(f"Found {len(symbols)} actively trading USDT linear perpetual symbols.")
            logger.info(f"First 5: {symbols[:5]}, Last 5: {symbols[-5:]}")
            return symbols
        except Exception as e:
            logger.error(f"Error getting symbols: {e}", exc_info=True)
            return []

    def get_rsi_for_interval(self, symbol, interval):
        """
        Apskaičiuoti RSI konkrečiam simboliui ir intervalui

        Args:
            symbol (str): Prekybos simbolis, pvz. "BTCUSDT"
            interval (str): Kline intervalas, pvz. "240" (4h) arba "D" (1d)

        Returns:
            float arba None: RSI reikšmė arba None, jei įvyksta klaida
        """
        try:
            # Tikrinti talpyklą dienos reikšmėms, kad sumažėtų API kvietimų
            if interval == "D":
                cache_key = f"{symbol}_{interval}"
                # Grąžinti talpykloje esančią reikšmę, jei ji ne senesnė nei 1 valanda
                now = time.time()
                if (cache_key in self.daily_rsi_cache and 
                    cache_key in self.daily_rsi_cache_time and
                    now - self.daily_rsi_cache_time[cache_key] < 3600):
                    logger.debug(f"Using cached daily RSI for {symbol}: {self.daily_rsi_cache[cache_key]}")
                    return self.daily_rsi_cache[cache_key]
            
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    kline_data = self.session.get_kline(
                        category="linear",
                        symbol=symbol,
                        interval=interval,
                        limit=RSI_PERIODS + 50  # Gauti pakankamai duomenų RSI skaičiavimui
                    )
                    
                    if kline_data.get("retCode", -1) != 0:
                        msg = kline_data.get('retMsg', 'Unknown API error')
                        logger.warning(f"API error getting {interval} kline for {symbol}: {msg}")
                        if "rate limit" in msg.lower():
                            wait_time = 1 * (2 ** attempt)
                            logger.warning(f"Rate limit hit. Waiting {wait_time}s...")
                            time.sleep(wait_time)
                            continue
                        return None
                    
                    if not kline_data.get("result", {}).get("list"):
                        logger.warning(f"No {interval} kline data returned for {symbol}")
                        return None
                        
                    prices = [float(k[4]) for k in kline_data["result"]["list"]]
                    prices.reverse()  # API pirmiausia grąžina naujausius

                    if len(prices) >= RSI_PERIODS + 1:
                        rsi = calculate_rsi(pd.Series(prices))
                        if not np.isnan(rsi):
                            # Talpinti dienos RSI reikšmes
                            if interval == "D":
                                self.daily_rsi_cache[f"{symbol}_{interval}"] = rsi
                                self.daily_rsi_cache_time[f"{symbol}_{interval}"] = time.time()
                            return rsi
                    else:
                        logger.warning(f"Insufficient data for {symbol} {interval} RSI calculation")
                    
                    return None
                except Exception as e:
                    if attempt < max_retries - 1:
                        wait_time = 1 * (2 ** attempt)
                        logger.warning(f"Error getting {interval} RSI for {symbol} (attempt {attempt+1}/{max_retries}): {e}. Retrying in {wait_time}s...")
                        time.sleep(wait_time)
                    else:
                        logger.error(f"Failed to get {interval} RSI for {symbol} after {max_retries} attempts: {e}")
                        return None
        except Exception as e:
            logger.error(f"Unexpected error calculating {interval} RSI for {symbol}: {e}", exc_info=True)
            return None

    def init_websocket(self):
        """Inicializuoti arba iš naujo inicializuoti WebSocket ryšį"""
        logger.info("Initializing WebSocket connection...")
        try:
            if self.ws:
                try:
                    # Bandyti tvarkingai uždaryti, jei ryšys egzistuoja
                    self.ws.exit()
                    logger.info("Existing WebSocket connection closed.")
                except Exception as e:
                    logger.warning(f"Error closing existing WebSocket: {e}")

            # Apibrėžti įvykių tvarkykles
            def on_disconnect():
                # Tai gali iškviesti pybit arba mūsų kodas
                if self.connected:
                    logger.warning("WebSocket disconnected (on_disconnect callback triggered)")
                    self.connected = False
                    self.last_message_time = 0 # Iš naujo nustatyti laikmatį

            def on_error(error):
                # Užregistruoti konkrečią klaidą ir pažymėti kaip atjungtą
                logger.error(f"WebSocket error (on_error callback triggered): {error}", exc_info=True)
                self.connected = False
                self.last_message_time = 0 # Iš naujo nustatyti laikmatį

            def on_close():
                # Užregistruoti, kai ryšys uždaromas, ir pažymėti kaip atjungtą
                if self.connected: # Vengti registravimo, jei jau pažymėta kaip atjungta
                    logger.info("WebSocket connection closed (on_close callback triggered)")
                    self.connected = False
                    self.last_message_time = 0 # Iš naujo nustatyti laikmatį

            # Patikrinti, ar pybit WebSocket palaiko įvykių tvarkykles
            # Jei ne, remsimės savo heartbeat monitoriumi
            try:
                self.ws = WebSocket(
                    testnet=False,
                    channel_type="linear",
                    ping_interval=WS_PING_INTERVAL,
                    ping_timeout=WS_PING_TIMEOUT,
                    trace_logging=False,
                    on_disconnect=on_disconnect,
                    on_error=on_error,
                    on_close=on_close
                )
                logger.info("WebSocket initialized with event handlers.")
            except TypeError:
                # Tvarkyklės nepalaikomos, naudoti standartinį konstruktorių
                logger.warning("WebSocket event handlers (on_error, on_close) not supported by this pybit version. Relying on heartbeat.")
                self.ws = WebSocket(
                    testnet=False,
                    channel_type="linear",
                    ping_interval=WS_PING_INTERVAL,
                    ping_timeout=WS_PING_TIMEOUT,
                    trace_logging=False
                )

            self.connected = False
            self.last_message_time = time.time() # Inicializuoti laikmatį
            logger.info("WebSocket initialization process complete.")
        except Exception as e:
            logger.error(f"WebSocket initialization error: {e}", exc_info=True)
            self.ws = None # Užtikrinti, kad ws yra None, jei inicializacija nepavyksta


    def _heartbeat_monitor_thread(self):
        """Veikia atskirame gijos sraute, kad stebėtų WebSocket ryšio būklę."""
        logger.info("Heartbeat monitor thread started.")
        last_log_time = 0

        while not self._stop_event.is_set():
            current_time = time.time()

            # Jei turime aktyvų ryšį, kuris pastaruoju metu negavo pranešimų
            if (self.ws and self.connected and
                self.last_message_time > 0 and
                (current_time - self.last_message_time > NO_MESSAGE_TIMEOUT) and
                len(self.subscribed_symbols) > 0):

                # Registruoti rečiau, kad neužpildytume žurnalų
                if current_time - last_log_time > 60:  # Registruoti daugiausia kartą per minutę
                    logger.warning(f"Heartbeat Monitor: No messages received for {int(current_time - self.last_message_time)} seconds (threshold: {NO_MESSAGE_TIMEOUT}s). Triggering reconnect.")
                    last_log_time = current_time

                # Aktyviai tikrinti ryšį bandant ping, jei biblioteka tai palaiko
                try:
                    # Pažymėti ryšį kaip atjungtą, kad pagrindinis ciklas prisijungtų iš naujo
                    logger.info("Heartbeat Monitor: Marking connection as disconnected to trigger reconnect.")
                    self.connected = False

                    # Bandyti tvarkingai uždaryti ryšį
                    if self.ws:
                        try:
                            self.ws.exit()
                        except Exception as e:
                            logger.warning(f"Error closing stale WebSocket: {e}")
                except Exception as e:
                    logger.error(f"Error during connection test: {e}")

            # Taip pat atlikti greitą ping testą kas 30 s, kad įsitikintume, jog ryšys reaguoja
            elif (self.ws and self.connected and
                  self.last_message_time > 0 and
                  (current_time - self.last_message_time > 30)):
                logger.debug("Performing routine connection check")

                # Tiesiog pažymėti laiką, kad žinotume, jog heartbeat veikia
                # websockets biblioteka jau pati tvarko ping/pong
                self.last_heartbeat_check = current_time

            time.sleep(HEARTBEAT_INTERVAL)

        logger.info("Heartbeat monitor thread stopped.")

    def initialize_price_history(self):
        """Įkelti istorinius kainų duomenis visiems simboliams, kad būtų galima pradėti RSI skaičiavimą"""
        logger.info("Starting historical price data initialization...")
        if not self.symbols:
            self.symbols = self._get_all_symbols()
            if not self.symbols:
                logger.error("Cannot initialize price history: Failed to fetch symbols.")
                return False # Nurodyti nesėkmę

        with self.lock:
            self.price_data.clear()
            self.rsi_values.clear()

        total_symbols = len(self.symbols)
        for idx, symbol in enumerate(self.symbols, 1):
            if not self.is_running:
                logger.info("Stopping price history initialization.")
                return False

            logger.info(f"Initializing {symbol} ({idx}/{total_symbols})...")
            try:
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        kline_data = self.session.get_kline(
                            category="linear",
                            symbol=symbol,
                            interval=KLINE_INTERVAL,
                            limit=RSI_PERIODS + 100 # Gauti pakankamai duomenų pradiniam RSI + atsarga
                        )
                        if kline_data.get("retCode", -1) != 0:
                            msg = kline_data.get('retMsg', 'Unknown API error')
                            logger.warning(f"API error for {symbol}: {msg}")
                            if "rate limit" in msg.lower():
                                wait_time = 1 * (2 ** attempt)
                                logger.warning(f"Rate limit hit for {symbol}. Waiting {wait_time}s...")
                                time.sleep(wait_time)
                                continue # Bandyti iš naujo
                            else:
                                # Nutraukti dėl klaidų, nesusijusių su normos riba, po registravimo
                                break
                        break # Sėkmė
                    except Exception as e:
                        if attempt < max_retries - 1:
                            wait_time = 1 * (2 ** attempt)
                            logger.warning(f"Failed to get kline for {symbol} (attempt {attempt+1}/{max_retries}): {e}. Retrying in {wait_time}s...")
                            time.sleep(wait_time)
                        else:
                            logger.error(f"Failed to get kline for {symbol} after {max_retries} attempts.", exc_info=True)
                            raise # Iškelti pakartotinai po maksimalaus bandymų skaičiaus

                if kline_data.get("retCode") == 0 and kline_data.get("result", {}).get("list"):
                    prices = [float(k[4]) for k in kline_data["result"]["list"]]
                    prices.reverse() # API pirmiausia grąžina naujausius

                    if len(prices) >= RSI_PERIODS + 1:
                        with self.lock:
                            self.price_data[symbol] = prices
                            rsi = calculate_rsi(pd.Series(prices))
                            if not np.isnan(rsi):
                                self.rsi_values[symbol] = rsi
                                logger.info(f"Initial RSI for {symbol}: {rsi:.2f}")
                                # Patikrinti pradinę ribą be atvėsimo laiko
                                self._check_and_send_alert(symbol, rsi, is_initial=True)
                        logger.info(f"Loaded {len(prices)} historical prices for {symbol}. Initial RSI: {self.rsi_values.get(symbol, 'N/A')}")
                    else:
                        logger.warning(f"Insufficient historical data for {symbol} ({len(prices)} points). Need {RSI_PERIODS + 1}.")
                else:
                     logger.warning(f"Could not retrieve valid kline data for {symbol}. API Response: {kline_data}")

                time.sleep(0.2) # Vengti normos ribos viršijimo

            except Exception as e:
                logger.error(f"Error initializing price history for {symbol}: {e}", exc_info=True)
                continue # Tęsti su kitu simboliu

        logger.info("Historical data initialization complete.")
        return True # Nurodyti sėkmę

    def subscribe_to_klines(self):
        """Užsiprenumeruoti WebSocket kline srautus visiems simboliams"""
        if not self.ws:
            logger.error("WebSocket not initialized. Cannot subscribe.")
            return False

        if not self.symbols:
            logger.warning("Symbols list is empty. Attempting to fetch.")
            self.symbols = self._get_all_symbols()
            if not self.symbols:
                logger.error("Cannot subscribe: Failed to fetch symbols.")
                return False

        logger.info("Starting WebSocket kline subscriptions...")

        def handle_message_wrapper(message):
            """Apvalkalas, atnaujinantis paskutinio pranešimo laiką ir iškviečiantis pagrindinę tvarkyklę"""
            # Atnaujinti ryšio būseną ir paskutinio pranešimo laiką
            self.last_message_time = time.time()

            # Registruoti tai tik kartą per minutę, kad išvengtume žurnalų šiukšlinimo
            if not hasattr(self, '_last_connected_log') or time.time() - self._last_connected_log > 60:
                if not self.connected:
                    logger.info("WebSocket is receiving messages - marking as connected")
                self._last_connected_log = time.time()

            self.connected = True  # Pažymėti kaip prisijungusį, kai pranešimai pradeda plaukti

            # Apdoroti pranešimo turinį
            self._handle_kline_message(message)

        def handle_ticker_message(message):
            """Tvarkyklė ticker pranešimams, kurie apima finansavimo normos duomenis"""
            # Taip pat atnaujinti paskutinio pranešimo laiką ryšio būsenai
            self.last_message_time = time.time()
            self.connected = True

            # Apdoroti ticker pranešimą
            self._handle_ticker_message(message)

        # Išvalyti ankstesnes prenumeratas prieš pradedant naujas
        self.subscribed_symbols.clear()
        self.ticker_subscribed_symbols.clear()

        # Prenumeruoti partijomis, kad išvengtume galimų problemų su per dideliu argumentų skaičiumi vienu metu
        batch_size = 25  # Mažesnis partijos dydis (sumažintas nuo 50), kad būtų išvengta perkrovos
        successfully_subscribed = set()
        ticker_successfully_subscribed = set()

        # Pirmiausia užsiprenumeruoti kline srautus
        for i in range(0, len(self.symbols), batch_size):
            batch_symbols = self.symbols[i:i+batch_size]  # Gauti dabartinės partijos simbolius
            logger.info(f"Attempting to subscribe symbols in batch {i//batch_size + 1}/{(len(self.symbols)+batch_size-1)//batch_size}...")
            try:
                symbols_in_batch_subscribed = 0
                for symbol in batch_symbols:
                    # Naudoti specifinį kline_stream metodą kiekvienam simboliui
                    self.ws.kline_stream(
                        symbol=symbol,
                        interval=KLINE_INTERVAL,
                        callback=handle_message_wrapper
                    )
                    # Laikoma sėkme, jei nėra tiesioginės išimties
                    successfully_subscribed.add(symbol)
                    symbols_in_batch_subscribed += 1
                    # Pridėti nedidelį delsimą tarp prenumeratų, kad serveris nebūtų perkrautas
                    time.sleep(0.05)

                logger.info(f"Subscribed {symbols_in_batch_subscribed} symbols in batch {i//batch_size + 1}. Total subscribed: {len(successfully_subscribed)}.")
                # Pridėti delsimą tarp prenumeratos užklausų partijų siuntimo
                if i + batch_size < len(self.symbols):
                     logger.info("Waiting 2 seconds before next batch...")
                     time.sleep(2)  # Padidinta nuo 1 iki 2 sekundžių, kad būtų daugiau laiko tarp partijų

            except Exception as e:
                logger.error(f"Error subscribing symbols in batch {i//batch_size + 1}: {e}", exc_info=True)
                # Nuspręsti, kaip elgtis su partijos nesėkme: tęsti su kita partija ar sustoti?
                # Kol kas tai užregistruos klaidą ir tęs su kita partija.
                # Apsvarstyti logikos pridėjimą partijai ar konkretiems simboliams bandyti iš naujo, jei reikia.

        # Dabar užsiprenumeruoti ticker srautus finansavimo normos duomenims
        logger.info("Starting WebSocket ticker subscriptions for funding rates...")
        for i in range(0, len(self.symbols), batch_size):
            batch_symbols = self.symbols[i:i+batch_size]  # Gauti dabartinės partijos simbolius
            logger.info(f"Attempting to subscribe to ticker streams in batch {i//batch_size + 1}/{(len(self.symbols)+batch_size-1)//batch_size}...")
            try:
                tickers_in_batch_subscribed = 0
                for symbol in batch_symbols:
                    # Užsiprenumeruoti ticker srautą, kad gautume finansavimo normos atnaujinimus
                    self.ws.ticker_stream(
                        symbol=symbol,
                        callback=handle_ticker_message
                    )
                    # Laikoma sėkme, jei nėra tiesioginės išimties
                    ticker_successfully_subscribed.add(symbol)
                    tickers_in_batch_subscribed += 1
                    # Pridėti nedidelį delsimą tarp prenumeratų
                    time.sleep(0.05)

                logger.info(f"Subscribed {tickers_in_batch_subscribed} ticker streams in batch {i//batch_size + 1}. Total subscribed: {len(ticker_successfully_subscribed)}.")
                if i + batch_size < len(self.symbols):
                    logger.info("Waiting 2 seconds before next ticker batch...")
                    time.sleep(2)
            except Exception as e:
                logger.error(f"Error subscribing ticker streams in batch {i//batch_size + 1}: {e}", exc_info=True)

        self.subscribed_symbols = successfully_subscribed
        self.ticker_subscribed_symbols = ticker_successfully_subscribed

        if not self.subscribed_symbols:
             logger.error("Failed to subscribe to any kline streams after processing all batches.")
             return False

        logger.info(f"Successfully subscribed to {len(self.subscribed_symbols)} kline streams and {len(self.ticker_subscribed_symbols)} ticker streams.")
        self.last_message_time = time.time() # Iš naujo nustatyti laikmatį po sėkmingų prenumeratų
        self.connected = True
        self.reconnect_count = 0 # Iš naujo nustatyti pakartotinio prisijungimo skaitiklį po sėkmingos prenumeratos
        return True
        
    def _handle_kline_message(self, message):
        """Apdoroti gaunamus kline WebSocket pranešimus ir atnaujinti RSI reikšmes"""
        try:
            if "topic" not in message or "data" not in message or not message["data"]:
                # logger.debug(f"Ignoring non-kline or empty message: {message}")
                return

            topic = message["topic"]
            symbol = topic.split(".")[2] # Daroma prielaida, kad temos formatas "kline.INTERVAL.SYMBOL"

            if symbol not in self.symbols:
                 logger.warning(f"Received message for unexpected symbol: {symbol}")
                 return # Ignoruoti simbolius, kurių neketinome sekti

            data = message["data"][0]
            is_closed = data.get("confirm", False)
            current_price = float(data["close"])
            timestamp_ms = int(data["start"]) # Žvakės pradžios laikas

            with self.lock:
                current_prices = self.price_data.get(symbol, [])
                new_rsi = np.nan

                if is_closed:
                    # Patikrinti, ar ši žvakė naujesnė nei paskutinė įrašyta kaina
                    # Šią logiką gali tekti patikslinti pagal tai, kaip veikia laiko žymos/atnaujinimai
                    if not current_prices or timestamp_ms > getattr(current_prices[-1], 'timestamp_ms', 0):
                         # Pridėti kainą (galbūt taip pat išsaugoti laiko žymą, jei reikia)
                         self.price_data[symbol].append(current_price)
                         # Išlaikyti pagrįstą buferio dydį
                         if len(self.price_data[symbol]) > RSI_PERIODS + 200:
                             self.price_data[symbol] = self.price_data[symbol][-(RSI_PERIODS + 200):]
                         logger.debug(f"CLOSED candle for {symbol}. Price: {current_price}. History length: {len(self.price_data[symbol])}")
                         # Perskaičiuoti RSI uždarytai žvakei
                         price_series = pd.Series(self.price_data[symbol])
                         new_rsi = calculate_rsi(price_series)

                else: # Nepatvirtinta (tarpinė) žvakės atnaujinimas
                    if not current_prices:
                        # Idealiu atveju to neturėtų nutikti, jei istorija inicializuota, bet apsidrausti
                        self.price_data[symbol].append(current_price)
                        logger.debug(f"First price point (unconfirmed) for {symbol}: {current_price}")
                    else:
                        # Sukurti laikiną seriją su atnaujinta naujausia kaina
                        temp_prices = current_prices[:-1] + [current_price]
                        price_series = pd.Series(temp_prices)
                        new_rsi = calculate_rsi(price_series)
                        # Pasirinktinai: registruoti tik reikšmingus nepatvirtintų žvakių pokyčius, kad sumažėtų triukšmas
                        # prev_rsi = self.rsi_values.get(symbol)
                        # if prev_rsi is None or abs(new_rsi - prev_rsi) > 1:
                        #      logger.debug(f"Intermediate RSI for {symbol}: {new_rsi:.2f}")


                # Išsaugoti ir patikrinti ribą, jei RSI galioja
                if not np.isnan(new_rsi):
                     prev_rsi = self.rsi_values.get(symbol, np.nan)
                     self.rsi_values[symbol] = new_rsi
                     if is_closed: # Registruoti galutinį RSI uždarytoms žvakėms
                         logger.info(f"{symbol} RSI updated (CLOSED): {new_rsi:.2f}")
                     # Patikrinti ribą, jei RSI reikšmingai pasikeitė arba peržengė ribą
                     if (
                         np.isnan(prev_rsi)
                         or abs(new_rsi - prev_rsi) > 0.1
                         or (prev_rsi < OVERBOUGHT_THRESHOLD and new_rsi >= OVERBOUGHT_THRESHOLD)
                         or (prev_rsi > OVERSOLD_THRESHOLD and new_rsi <= OVERSOLD_THRESHOLD)
                     ):
                         self._check_and_send_alert(symbol, new_rsi)

        except Exception as e:
            logger.error(f"Error processing kline message for {symbol if 'symbol' in locals() else 'unknown symbol'}: {e}", exc_info=True)
            logger.error(f"Problematic message: {message}")

    def _handle_ticker_message(self, message):
        """Apdoroti gaunamus ticker WebSocket pranešimus ir atnaujinti finansavimo normas"""
        try:
            if "topic" not in message or "data" not in message or not message["data"]:
                return

            topic = message["topic"]
            if not topic.startswith("tickers."):
                return  # Ne ticker pranešimas

            symbol = topic.split(".")[1]  # Daroma prielaida, kad temos formatas "tickers.SYMBOL"
            
            if symbol not in self.symbols:
                logger.warning(f"Received ticker message for unexpected symbol: {symbol}")
                return
                
            data = message["data"]
            funding_rate_str = data.get("fundingRate")
            
            if funding_rate_str is not None and funding_rate_str != "":
                try:
                    funding_rate = float(funding_rate_str)
                    with self.lock:
                        self.funding_rates[symbol] = funding_rate
                    logger.debug(f"Updated funding rate for {symbol}: {funding_rate}")
                except ValueError:
                    logger.warning(f"Could not convert funding rate '{funding_rate_str}' to float for {symbol}")
                    
        except Exception as e:
            logger.error(f"Error processing ticker message for {symbol if 'symbol' in locals() else 'unknown symbol'}: {e}", exc_info=True)
            logger.error(f"Problematic ticker message: {message}")

    def _check_and_send_alert(self, symbol, rsi, is_initial=False):
        """Patikrinti RSI pagal ribas ir prireikus išsiųsti pranešimus."""
        current_time = time.time()
        last_alert = self.last_alert_time.get(symbol, 0)
        alert_type = None
        alert_msg = ""

        if rsi >= OVERBOUGHT_THRESHOLD:
            alert_type = "OVERBOUGHT"
            alert_msg = f"📈 {symbol} RSI is OVERBOUGHT at {rsi:.2f} (Threshold: {OVERBOUGHT_THRESHOLD})"
        elif rsi <= OVERSOLD_THRESHOLD:
            alert_type = "OVERSOLD"
            alert_msg = f"📉 {symbol} RSI is OVERSOLD at {rsi:.2f} (Threshold: {OVERSOLD_THRESHOLD})"

        if alert_type:
            # Siųsti įspėjimą, jei tai pradinis patikrinimas ARBA jei praėjo atvėsimo laikas
            if is_initial or (current_time - last_alert >= ALERT_COOLDOWN_SECONDS):
                logger.warning(f"ALERT Triggered: {alert_msg}")
                self.last_alert_time[symbol] = current_time
                # --- Siųsti push pranešimą ---
                self._send_push_notification(title=f"RSI Alert: {symbol}", body=alert_msg)
            # else:
                 # logger.debug(f"Alert condition met for {symbol} ({alert_type} @ {rsi:.2f}), but still in cooldown.")


    def _send_push_notification(self, title: str, body: str):
        """Užklausia Supabase dėl tokenų ir siunčia pranešimus per Expo."""
        logger.info(f"Preparing to send push notification: {title} - {body}")
        try:
            # 1. Užklausti Supabase dėl visų push tokenų
            # TODO: vėliau pridėti filtravimą, jei bus įdiegti vartotojo nustatymai
            response = self.supabase.table('push_tokens').select('token').execute()

            if not response.data:
                logger.warning("No push tokens found in database. Cannot send notification.")
                return

            tokens_raw = [item['token'] for item in response.data if item.get('token')]
            if not tokens_raw:
                 logger.warning("No valid push tokens extracted from database response.")
                 return

            # Konvertuoti į aibę, kad gautume unikalius tokenus, paskui atgal į sąrašą
            unique_tokens = list(set(tokens_raw))

            logger.info(f"Found {len(unique_tokens)} unique push tokens to notify (out of {len(tokens_raw)} total).")

            # 2. Siųsti pranešimus į Expo (prireikus skaidyti į dalis)
            # Expo rekomenduoja siųsti po 100 dalimis
            messages = []
            # Iteruoti per unique_tokens vietoj tokens
            for token in unique_tokens:
                 # Bazinis patikrinimas: Expo tokenai dažnai prasideda ExponentPushToken[
                 if isinstance(token, str) and token.startswith("ExponentPushToken["):
                     messages.append({
                         "to": token,
                         "sound": "default",
                         "title": title,
                         "body": body,
                         # "data": {"extra": "data"} # Optional extra data
                     })
                 else:
                     logger.warning(f"Skipping invalid token format: {token}")

            if not messages:
                logger.warning("No valid messages to send after filtering tokens.")
                return

            # Siųsti pranešimus dalimis
            chunk_size = 100
            for i in range(0, len(messages), chunk_size):
                 chunk = messages[i:i+chunk_size]
                 try:
                     headers = {
                         'Accept': 'application/json',
                         'Accept-Encoding': 'gzip, deflate',
                         'Content-Type': 'application/json',
                     }
                     response = requests.post(EXPO_PUSH_URL, headers=headers, json=chunk, timeout=10)
                     response.raise_for_status() # Iškelti HTTPError dėl blogų atsakymų (4xx arba 5xx)

                     # Registruoti sėkmės/nesėkmės informaciją iš Expo atsakymo
                     try:
                         result = response.json()
                         # Prireikus patikrinti result['data'] dėl atskirų pranešimų būsenos
                         logger.info(f"Expo push request successful for chunk {i//chunk_size + 1}. Response status: {response.status_code}")
                         # Pridėti išsamesnį registravimą pagal Expo atsakymo formatą, jei iškiltų problemų
                     except requests.exceptions.JSONDecodeError:
                          logger.info(f"Expo push request successful for chunk {i//chunk_size + 1}. Status code: {response.status_code}. Non-JSON response.")

                 except requests.exceptions.RequestException as e:
                      logger.error(f"Error sending push notification chunk {i//chunk_size + 1} to Expo: {e}")
                      # Tęsti su kita dalimi, jei viena nepavyksta

        except Exception as e:
            # Pagauti klaidas iš Supabase užklausos arba bendros logikos
            logger.error(f"Failed to send push notification: {e}", exc_info=True)


    def _get_current_funding_rate(self, symbol: str) -> float | None:
        """
        Gauna dabartinę vieno simbolio finansavimo normą naudojant bendrą sesiją.

        Args:
            symbol: Prekybos simbolis (pvz., "BTCUSDT").

        Returns:
            Dabartinė finansavimo norma kaip float arba None, jei įvyksta klaida ar nerandama.
        """
        # Pastaba: čia nereikia tikrinti API raktų, nes self.session jų reikalauja inicializuojant
        try:
            # Naudoti trumpą laiko limitą būsenos patikrinimams, kad būtų išvengta blokavimo
            result = self.session.get_tickers(category="linear", symbol=symbol)

            if result and result.get("retCode") == 0:
                ticker_info = result.get("result", {}).get("list", [])
                if ticker_info:
                    funding_rate_str = ticker_info[0].get("fundingRate")
                    if funding_rate_str and funding_rate_str != "": # Įsitikinti, kad norma egzistuoja ir nėra tuščia eilutė
                        try:
                            return float(funding_rate_str)
                        except ValueError:
                            logger.warning(f"Could not convert funding rate '{funding_rate_str}' to float for {symbol}.")
                            return None
                    else:
                        # logger.debug(f"Funding rate key missing or empty in ticker info for {symbol}.")
                        return None # Aiškiai grąžinti None, jei raktas trūksta arba tuščias
                else:
                    # logger.debug(f"No ticker list returned in API response for {symbol}.")
                    return None
            else:
                # Registruoti API klaidas, bet galbūt mažiau išsamiai būsenos patikrinimams, nebent derinama
                # Vengti žurnalų užpildymo, jei endpoint kviečiamas dažnai
                if result.get("retCode") != 10006: # 10006 dažnai yra laikina laiko limito/perkrovos klaida
                     logger.warning(f"Bybit API error fetching ticker for {symbol} funding rate: {result.get('retMsg', 'Unknown error')} (Code: {result.get('retCode')})")
                return None

        except Exception as e:
            # Registruoti kitas išimtis, pvz., ryšio klaidas
            logger.error(f"Exception fetching funding rate for {symbol}: {e}", exc_info=False) # Riboti traceback šiukšlinimą
            return None

    def _run_monitoring_loop(self):
        """Pagrindinis ciklas WebSocket ryšiui ir prenumeratoms valdyti."""
        logger.info("Monitoring loop thread started.")
        self.is_running = True
        self._stop_event.clear()

        # Paleisti heartbeat monitorių atskirame gijos sraute
        heartbeat_thread = threading.Thread(target=self._heartbeat_monitor_thread, daemon=True, name="HeartbeatMon")
        heartbeat_thread.start()

        while not self._stop_event.is_set():
            try:
                # Prireikus inicializuoti arba iš naujo inicializuoti WebSocket
                if not self.ws or not self.connected:
                     # Apskaičiuoti atidėjimą prieš bandant prisijungti/prisijungti iš naujo
                     if self.reconnect_count > 0:
                          backoff = min(2 ** self.reconnect_count, MAX_RECONNECT_DELAY)
                          logger.info(f"Waiting {backoff} seconds before attempting reconnect (attempt {self.reconnect_count + 1})...")
                          time.sleep(backoff)

                     self.init_websocket()
                     if not self.ws:
                         logger.error("Failed to initialize WebSocket. Retrying...")
                         self.reconnect_count += 1
                         continue # Bandyti iš naujo po delsimo

                     # Prireikus gauti simbolius (paprastai tik pirmą kartą)
                     if not self.symbols:
                          if not self.initialize_price_history():
                              logger.error("Failed initial price history load. Cannot proceed with subscription.")
                              # Apsvarstyti ilgesnį pakartotinio bandymo delsimą arba sustojimą, jei tai pakartotinai nepavyksta
                              self.reconnect_count += 1
                              continue

                     # Užsiprenumeruoti klines
                     if not self.subscribe_to_klines():
                         logger.error("Failed to subscribe to kline streams. Retrying...")
                         self.reconnect_count += 1
                         self.connected = False # Užtikrinti, kad pažymėta kaip atjungta
                         # Uždaryti galimai iš dalies prijungtą lizdą prieš bandant iš naujo
                         if self.ws:
                              self.ws.exit()
                              self.ws = None
                         continue # Bandyti prenumeratą iš naujo po delsimo
                     else:
                          # Sėkmė! Iš naujo nustatyti pakartotinio prisijungimo skaitiklį
                          self.reconnect_count = 0
                          self.connected = True


                # Jei prisijungta, tiesiog miegoti ir leisti WS gijai tvarkyti pranešimus
                # Heartbeat monitorius prireikus inicijuos pakartotinį prisijungimą
                # Patikrinti ryšio būseną prieš miegant
                if not self.connected:
                    logger.info("Main Loop: Detected disconnected state. Initiating reconnection sequence.")
                    # Nereikia miegoti, ciklas iš naujo pradės prisijungimo bandymą
                    continue

                time.sleep(5) # Periodiškai tikrinti ciklo būseną

            except (ConnectionRefusedError, ConnectionResetError) as conn_e:
                # Specifinės tinklo ryšio klaidos
                logger.error(f"Main Loop: Network connection error ({type(conn_e).__name__}): {conn_e}")
                self.connected = False
                self.reconnect_count += 1
                if self.ws:
                    try: self.ws.exit()
                    except Exception: pass # Ignoruoti klaidas uždarymo metu
                    finally: self.ws = None
                # Atidėjimas tvarkomas ciklo pradžioje

            except Exception as e:
                 # Bendras gaudytojas kitoms netikėtoms klaidoms
                 logger.error(f"Main Loop: General exception ({type(e).__name__}): {e}", exc_info=True)
                 self.connected = False # Laikyti, kad ryšys prarastas įvykus klaidai
                 self.reconnect_count += 1


        logger.info("Monitoring loop requested to stop.")
        # Išvalyti WebSocket ryšį
        if self.ws:
            logger.info("Closing WebSocket connection...")
            try:
                self.ws.exit()
            except Exception as e:
                logger.warning(f"Exception closing WebSocket: {e}")
        logger.info("Monitoring loop thread finished.")


    def start_monitoring(self):
        """Paleidžia stebėjimo procesą atskirame gijos sraute."""
        if self.is_running:
            logger.warning("Monitoring is already running.")
            return

        # Paleisti pagrindinį ciklą foniniame gijos sraute
        self.monitor_thread = threading.Thread(target=self._run_monitoring_loop, daemon=True, name="RSIMonitorLoop")
        self.monitor_thread.start()
        logger.info("RSI Monitoring background task started.")


    def stop_monitoring(self):
        """Sustabdo stebėjimo procesą."""
        if not self.is_running:
            logger.warning("Monitoring is not running.")
            return

        logger.info("Stopping RSI monitoring...")
        self.is_running = False
        self._stop_event.set() # Duoti gijoms signalą sustoti

        # Laukti, kol gijos baigs darbą
        if hasattr(self, 'monitor_thread') and self.monitor_thread.is_alive():
             logger.info("Waiting for monitoring loop thread to finish...")
             self.monitor_thread.join(timeout=10) # Laukti iki 10 sekundžių
             if self.monitor_thread.is_alive():
                  logger.warning("Monitoring loop thread did not finish gracefully.")
        # Heartbeat gija yra demonas, turėtų išeiti automatiškai

        logger.info("RSI Monitoring stopped.")


# --- FastAPI aplikacija ---

# Globali būsena monitoriaus egzemplioriui
monitor: RSIMonitor = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Paleidimas
    global monitor
    logger.info("FastAPI application startup...")
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        logger.info("Supabase client created.")
        monitor = RSIMonitor(supabase_client=supabase)
        monitor.start_monitoring()
        logger.info("RSI Monitor started in background.")
    except Exception as e:
        logger.error(f"Fatal error during startup: {e}", exc_info=True)
        # Priklausomai nuo rimtumo, gali tekti neleisti aplikacijai pasileisti
        raise HTTPException(status_code=500, detail=f"Startup failed: {e}") from e

    yield # Čia veikia aplikacija

    # Išjungimas
    logger.info("FastAPI application shutdown...")
    if monitor:
        monitor.stop_monitoring()
    logger.info("FastAPI application finished shutdown.")


app = FastAPI(lifespan=lifespan)

@app.get("/")
async def read_root():
    return {"message": "RSI Monitor Service running."}

@app.get("/status")
async def get_status():
    """Grąžina dabartinę RSI monitoriaus būseną."""
    if not monitor:
        return {"status": "error", "message": "Monitor not initialized."}

    with monitor.lock:  # Naudoti užraktą, kad saugiai pasiektume bendrus duomenis
        rsi_count = len(monitor.rsi_values)
        tracked_symbols = len(monitor.symbols)
        subscribed_count = len(monitor.subscribed_symbols)
        ticker_subscribed_count = len(monitor.ticker_subscribed_symbols)

        # Apskaičiuoti laiką nuo paskutinio pranešimo
        time_since_last_msg = int(time.time() - monitor.last_message_time) if monitor.last_message_time else None

        # Tikslesnis ryšio būsenos nustatymas
        if not monitor.connected:
            websocket_status = "disconnected"
        elif time_since_last_msg and time_since_last_msg > 30:
            websocket_status = "stale"  # Ryšys egzistuoja, bet nėra naujausių pranešimų
        else:
            websocket_status = "connected"  # Aktyviai gaunami pranešimai

        # Gauti naujausių RSI reikšmių momentinę nuotrauką (pvz., aukščiausi/žemiausi 5)
        # Saugiai rūšiuoti elementus, tvarkyti galimas NaN ar trūkstamas reikšmes
        valid_rsi = {s: r for s, r in monitor.rsi_values.items() if pd.notna(r)}
        sorted_rsi = sorted(valid_rsi.items(), key=lambda item: item[1], reverse=True)
        top_5_rsi = sorted_rsi[:5]
        bottom_5_rsi = sorted_rsi[-5:]

        # Gauti simbolius su aukščiausiomis ir žemiausiomis finansavimo normomis
        valid_funding = {s: r for s, r in monitor.funding_rates.items() if r is not None}
        sorted_funding = sorted(valid_funding.items(), key=lambda item: item[1])
        lowest_5_funding = sorted_funding[:5]  # Žemiausios (neigiamos) finansavimo normos
        highest_5_funding = sorted_funding[-5:]  # Aukščiausios (teigiamos) finansavimo normos

        # Paruošti rezultatus, naudoti finansavimo normas iš WebSocket duomenų vietoj HTTP užklausų
        results_top_5 = []
        results_bottom_5 = []
        symbols_to_check = {s for s, r in top_5_rsi} | {s for s, r in bottom_5_rsi}

        # Naudoti talpykloje esančias finansavimo normas iš WebSocket duomenų
        funding_rates_snapshot = monitor.funding_rates

        # Jei finansavimo normos dar neprieinamos per WebSocket, naudoti HTTP užklausas
        if not funding_rates_snapshot or len(funding_rates_snapshot) < len(symbols_to_check) / 2:
            logger.info("Not enough funding rates from WebSocket, falling back to HTTP requests")
            for symbol in symbols_to_check:
                if symbol not in funding_rates_snapshot:
                    rate = monitor._get_current_funding_rate(symbol)
                    if rate is not None:
                        monitor.funding_rates[symbol] = rate  # Atnaujinti bendrą talpyklą
                        funding_rates_snapshot[symbol] = rate
                    # Nedidelis delsimas, kad būtų išvengta normos ribos viršijimo
                    time.sleep(0.05)

        # Gauti dienos RSI reikšmes simboliams
        daily_rsi_values = {}
        for symbol in symbols_to_check:
            # Naudoti "D" dienos intervalui
            daily_rsi = monitor.get_rsi_for_interval(symbol, "D")
            if daily_rsi is not None:
                daily_rsi_values[symbol] = round(daily_rsi, 2)
            time.sleep(0.1)  # Pridėti delsimą, kad būtų išvengta normos ribų

        # Užpildyti rezultatus su RSI, dienos RSI ir finansavimo norma
        for symbol, rsi in top_5_rsi:
            rate = funding_rates_snapshot.get(symbol)
            daily_rsi = daily_rsi_values.get(symbol)
            results_top_5.append({
                "symbol": symbol,
                "rsi": round(rsi, 2) if pd.notna(rsi) else None,
                "daily_rsi": daily_rsi,  # Pridėti dienos RSI reikšmę
                "funding_rate": rate,
                "funding_rate_percent": f"{rate * 100:.4f}%" if rate is not None else None
            })

        for symbol, rsi in bottom_5_rsi:
            rate = funding_rates_snapshot.get(symbol)
            daily_rsi = daily_rsi_values.get(symbol)
            results_bottom_5.append({
                "symbol": symbol,
                "rsi": round(rsi, 2) if pd.notna(rsi) else None,
                "daily_rsi": daily_rsi,  # Pridėti dienos RSI reikšmę
                "funding_rate": rate,
                "funding_rate_percent": f"{rate * 100:.4f}%" if rate is not None else None
            })

        # Sukurti sąrašus aukščiausioms ir žemiausioms finansavimo normoms
        highest_funding_list = []
        lowest_funding_list = []
        
        for symbol, rate in highest_5_funding:
            rsi = valid_rsi.get(symbol)
            daily_rsi = daily_rsi_values.get(symbol) if symbol in symbols_to_check else None
            highest_funding_list.append({
                "symbol": symbol,
                "rsi": round(rsi, 2) if pd.notna(rsi) else None,
                "daily_rsi": daily_rsi,
                "funding_rate": rate,
                "funding_rate_percent": f"{rate * 100:.4f}%" if rate is not None else None
            })
            
        for symbol, rate in lowest_5_funding:
            rsi = valid_rsi.get(symbol)
            daily_rsi = daily_rsi_values.get(symbol) if symbol in symbols_to_check else None
            lowest_funding_list.append({
                "symbol": symbol,
                "rsi": round(rsi, 2) if pd.notna(rsi) else None,
                "daily_rsi": daily_rsi,
                "funding_rate": rate,
                "funding_rate_percent": f"{rate * 100:.4f}%" if rate is not None else None
            })

    return {
        "status": "running" if monitor.is_running else "stopped",
        "websocket_status": websocket_status,
        "websocket_connected": monitor.connected,
        "last_message_time_ago_s": time_since_last_msg,
        "tracked_symbol_count": tracked_symbols,
        "subscribed_symbol_count": subscribed_count,
        "ticker_subscribed_count": ticker_subscribed_count,
        "rsi_calculated_count": rsi_count,
        "funding_rates_count": len(monitor.funding_rates),
        "reconnect_attempts": monitor.reconnect_count,
        "top_5_rsi": results_top_5,
        "bottom_5_rsi": results_bottom_5,
        "highest_5_funding": highest_funding_list,
        "lowest_5_funding": lowest_funding_list
    }

# Prireikus pridėti kitus endpoint'us, pvz., rankiniu būdu inicijuoti istorijos atnaujinimą ir pan.


# --- Pagrindinis vykdymo blokas (vietiniam testavimui) ---
# Ši dalis nėra griežtai būtina paleidžiant su Uvicorn per komandinę eilutę,
# bet gali būti naudinga tiesioginiam vykdymui/derinimui.
if __name__ == "__main__":
    # Pastaba: paleidus tiesiogiai tokiu būdu apeinamos Uvicorn serverio funkcijos
    # Geriau paleisti naudojant: uvicorn main:app --reload (plėtrai)
    logger.warning("Running script directly. For production/proper ASGI, use Uvicorn: `uvicorn main:app --host 0.0.0.0 --port 8000`")

    # Bazinis nustatymas monitoriui paleisti atskirai (be FastAPI serverio) derinimui
    try:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        standalone_monitor = RSIMonitor(supabase_client)
        standalone_monitor.start_monitoring()

        # Išlaikyti pagrindinę giją gyvą
        while True:
            time.sleep(60) # Tęsti veikimą

    except KeyboardInterrupt:
        logger.info("Keyboard interrupt received. Shutting down standalone monitor.")
        if 'standalone_monitor' in locals() and standalone_monitor:
             standalone_monitor.stop_monitoring()
    except Exception as e:
         logger.error(f"Error in standalone execution: {e}", exc_info=True) 