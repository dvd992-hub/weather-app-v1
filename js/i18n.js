/* ==========================================================================
   i18n.js — Internationalisation: English / Italian
   ==========================================================================
   Strategy (hybrid):
     1. On first load, detect the browser language via navigator.language.
        If it starts with "it", use Italian; otherwise default to English.
     2. The user can manually switch language at any time via the EN / IT
        toggle in the navigation bar.
     3. The chosen language is persisted in localStorage under the key
        "weatherapp_lang" so it is remembered across sessions.

   Usage:
     t('key')              → returns the translated string for the active lang
     setLang('en'|'it')   → switches language, re-renders all UI strings,
                             saves the choice to localStorage
   ========================================================================== */


/* --------------------------------------------------------------------------
   TRANSLATIONS
   Each key maps to an object with 'en' and 'it' values.
   All UI strings that need to change with the language live here.
   -------------------------------------------------------------------------- */
const TRANSLATIONS = {

  /* ── Navigation ── */
  tab_weather:  { en: 'Weather',  it: 'Meteo'    },
  tab_compare:  { en: 'Compare',  it: 'Confronta' },
  tab_map:      { en: 'Map',      it: 'Mappa'    },

  /* ── Search / header ── */
  search_placeholder: { en: 'Search city…',          it: 'Cerca città…'          },
  search_title:       { en: 'Search',                it: 'Cerca'                 },
  locate_title:       { en: 'Use my location',       it: 'Usa la mia posizione'  },
  save_btn:           { en: 'Save',                  it: 'Salva'                 },
  saved_btn:          { en: 'Saved',                 it: 'Salvata'               },

  /* ── Welcome state ── */
  welcome_title: { en: 'Real-time weather',                           it: 'Meteo in tempo reale'                     },
  welcome_sub:   { en: 'Search a city or use your location.',        it: 'Cerca una città o usa la tua posizione.'  },

  /* ── Loading / errors ── */
  loading:            { en: 'Loading…',                      it: 'Caricamento…'                     },
  error_not_found:    { en: 'City not found. Try another name.',  it: 'Città non trovata. Prova un altro nome.' },
  error_network:      { en: 'Network error. Check your connection.', it: 'Errore di rete. Controlla la connessione.' },
  error_weather:      { en: 'Could not load weather data.',    it: 'Impossibile caricare i dati meteo.'       },
  error_geo:          { en: 'Could not get your location.',    it: 'Impossibile ottenere la posizione.'       },
  error_geo_support:  { en: 'Geolocation not supported.',      it: 'Geolocalizzazione non supportata.'        },
  current_location:   { en: 'Current location',               it: 'Posizione attuale'                        },

  /* ── Weather stats labels ── */
  stat_wind:    { en: 'Wind',      it: 'Vento'    },
  stat_humidity:{ en: 'Humidity',  it: 'Umidità'  },
  stat_uv:      { en: 'UV',        it: 'UV'       },
  stat_precip:  { en: 'Precip.',   it: 'Precip.'  },
  feels_like:   { en: 'Feels like', it: 'Percepita' },

  /* ── Sections ── */
  section_hourly:  { en: 'Hourly forecast',  it: 'Previsioni orarie'  },
  section_daily:   { en: 'Next 7 days',      it: 'Prossimi 7 giorni'  },
  section_chart:   { en: '7-day temperature', it: 'Temperatura 7 giorni' },
  hour_now:        { en: 'Now',              it: 'Ora'                 },

  /* ── Alerts ── */
  alert_title:        { en: 'Weather alert',   it: 'Attenzione'        },
  alert_wind:         { en: 'Strong wind ({v} km/h) — avoid outdoor activities.', it: 'Vento forte ({v} km/h) — evita attività all\'aperto.' },
  alert_storm:        { en: 'Thunderstorm in progress — stay indoors.',  it: 'Temporale in corso — rimani al riparo.'        },
  alert_rain:         { en: 'Precipitation in progress.',               it: 'Precipitazioni in corso.'                     },
  alert_freeze:       { en: 'Sub-zero temperatures — watch for ice.',   it: 'Temperature sotto zero — attenzione al ghiaccio.' },
  alert_uv:           { en: 'Very high UV index ({v}) — use sunscreen.', it: 'Indice UV molto alto ({v}) — usa la protezione solare.' },
  alert_heat:         { en: 'Extreme heat — hydrate frequently.',       it: 'Caldo estremo — idratati frequentemente.'      },

  /* ── Clothing advice ── */
  advice_title:       { en: 'What to wear today', it: 'Cosa mettere oggi' },
  advice_heavy_coat:  { en: '🧥 Heavy coat',       it: '🧥 Cappotto pesante' },
  advice_coat:        { en: '🧥 Coat',             it: '🧥 Cappotto'         },
  advice_jacket:      { en: '🧥 Jacket',           it: '🧥 Giacca'           },
  advice_sweater:     { en: '👕 Sweater',          it: '👕 Felpa'            },
  advice_tshirt:      { en: '👕 T-shirt',          it: '👕 T-shirt'          },
  advice_umbrella:    { en: '☂️ Umbrella',          it: '☂️ Ombrello'         },
  advice_snow_boots:  { en: '🥾 Snow boots',       it: '🥾 Stivali da neve'  },
  advice_sunglasses:  { en: '😎 Sunglasses',       it: '😎 Occhiali da sole' },
  advice_sunscreen:   { en: '🧴 Sunscreen',        it: '🧴 Crema solare'     },
  advice_scarf:       { en: '🧣 Scarf',            it: '🧣 Sciarpa'          },
  advice_umbrella_fc: { en: '🌂 Umbrella (rain forecast)', it: '🌂 Ombrello (pioggia prevista)' },

  /* ── Compare tab ── */
  compare_empty_title:  { en: 'No saved cities',      it: 'Nessuna città salvata' },
  compare_empty_sub:    { en: 'Search a city in the Weather tab and press Save to add it here.', it: 'Cerca una città nella scheda Meteo e premi Salva per aggiungerla qui.' },
  compare_saved_one:    { en: '1 city saved',         it: '1 città salvata'       },
  compare_saved_many:   { en: '{n} cities saved',     it: '{n} città salvate'     },
  compare_refresh:      { en: 'Refresh',              it: 'Aggiorna'              },
  compare_feels:        { en: 'Feels like',           it: 'Percepita'             },
  compare_wind:         { en: 'Wind',                 it: 'Vento'                 },
  compare_humidity:     { en: 'Humidity',             it: 'Umidità'               },
  compare_uv:           { en: 'UV',                   it: 'UV'                    },
  legend_warmest:       { en: 'Warmest',              it: 'Più caldo'             },
  legend_coldest:       { en: 'Coldest',              it: 'Più freddo'            },

  /* ── Map tab ── */
  map_empty: { en: 'Save cities to see them on the map.', it: 'Salva delle città per vederle sulla mappa.' },
  loading_compare: { en: 'Loading…', it: 'Caricamento…' },

  /* ── Day names (short) ── */
  day_sun: { en: 'Sun', it: 'Dom' },
  day_mon: { en: 'Mon', it: 'Lun' },
  day_tue: { en: 'Tue', it: 'Mar' },
  day_wed: { en: 'Wed', it: 'Mer' },
  day_thu: { en: 'Thu', it: 'Gio' },
  day_fri: { en: 'Fri', it: 'Ven' },
  day_sat: { en: 'Sat', it: 'Sab' },
  today:   { en: 'Today', it: 'Oggi' },
  tomorrow:{ en: 'Sun',   it: 'Dom'  }, /* day after today, always a day name */
};


/* --------------------------------------------------------------------------
   LANGUAGE STATE
   -------------------------------------------------------------------------- */

/** Storage key used to persist the language choice */
const LANG_STORAGE_KEY = 'weatherapp_lang';

/**
 * Detect the initial language:
 *   1. Check localStorage for a previously saved preference.
 *   2. Fall back to the browser language (navigator.language).
 *   3. Default to English if neither resolves to Italian.
 */
function detectInitialLang() {
  const saved = localStorage.getItem(LANG_STORAGE_KEY);
  if (saved === 'en' || saved === 'it') return saved;

  const browser = (navigator.language || '').toLowerCase();
  return browser.startsWith('it') ? 'it' : 'en';
}

/** Currently active language ('en' or 'it') */
let currentLang = detectInitialLang();


/* --------------------------------------------------------------------------
   PUBLIC API
   -------------------------------------------------------------------------- */

/**
 * Returns the translated string for the given key in the active language.
 * Supports simple template replacement: t('alert_wind', { v: 45 })
 * replaces '{v}' with 45 in the result.
 *
 * @param {string} key
 * @param {object} [vars] — optional key→value replacements
 * @returns {string}
 */
function t(key, vars) {
  const entry = TRANSLATIONS[key];
  if (!entry) {
    console.warn(`[i18n] Missing translation key: "${key}"`);
    return key;
  }
  let str = entry[currentLang] || entry['en'] || key;

  /* replace {placeholder} tokens */
  if (vars) {
    Object.keys(vars).forEach(k => {
      str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
    });
  }
  return str;
}

/**
 * Returns the localised short day name for a JS Date object.
 * @param {Date} date
 * @returns {string}
 */
function tDay(date) {
  const keys = ['day_sun','day_mon','day_tue','day_wed','day_thu','day_fri','day_sat'];
  return t(keys[date.getDay()]);
}

/**
 * Walks every element that has a [data-i18n] attribute and updates its
 * textContent to the translated string for the current language.
 * This handles all static HTML text that is not generated by JS render
 * functions (tab labels, empty-state messages, map empty text, etc.).
 */
function applyStaticTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = t(key);
    if (translation) el.textContent = translation;
  });
}

/**
 * Switches the active language, persists the choice, and triggers a full
 * UI re-render so every string updates without a page reload.
 * @param {'en'|'it'} lang
 */
function setLang(lang) {
  if (lang !== 'en' && lang !== 'it') return;
  currentLang = lang;
  localStorage.setItem(LANG_STORAGE_KEY, lang);

  /* Update html[lang] attribute for accessibility */
  document.documentElement.lang = lang;

  /* Update toggle button states */
  document.getElementById('btn-lang-en').classList.toggle('active', lang === 'en');
  document.getElementById('btn-lang-it').classList.toggle('active', lang === 'it');

  /* Update all static [data-i18n] elements (tab labels, empty states, etc.) */
  applyStaticTranslations();

  /* Update search placeholder */
  document.getElementById('search-input').placeholder = t('search_placeholder');

  /* Re-render the active content panels */
  if (currentCity) {
    renderWeather(currentCity.data, currentCity.name);
    updateSaveButton();
  } else {
    showWelcome();
  }
  renderCompare();
  /* Map list uses translated strings too */
  renderMapList();
}
