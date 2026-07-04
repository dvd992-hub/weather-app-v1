/* ==========================================================================
   constants.js — Global constants, WMO mappings, and static data
   ========================================================================== */


/* --------------------------------------------------------------------------
   WMO_ICONS
   Maps WMO (World Meteorological Organization) weather interpretation codes
   to their corresponding emoji. Source: Open-Meteo documentation.
   -------------------------------------------------------------------------- */
const WMO_ICONS = {
  0:  '☀️',   /* clear sky */
  1:  '🌤',   /* mainly clear */
  2:  '⛅',   /* partly cloudy */
  3:  '☁️',   /* overcast */
  45: '🌫',   /* fog */
  48: '🌫',   /* depositing rime fog */
  51: '🌦',   /* light drizzle */
  53: '🌦',   /* moderate drizzle */
  55: '🌧',   /* dense drizzle */
  61: '🌧',   /* slight rain */
  63: '🌧',   /* moderate rain */
  65: '🌧',   /* heavy rain */
  71: '❄️',   /* slight snowfall */
  73: '❄️',   /* moderate snowfall */
  75: '❄️',   /* heavy snowfall */
  77: '🌨',   /* snow grains */
  80: '🌦',   /* slight rain showers */
  81: '🌧',   /* moderate rain showers */
  82: '⛈',   /* violent rain showers */
  85: '🌨',   /* slight snow showers */
  86: '🌨',   /* heavy snow showers */
  95: '⛈',   /* thunderstorm */
  96: '⛈',   /* thunderstorm with slight hail */
  99: '⛈',   /* thunderstorm with heavy hail */
};


/* --------------------------------------------------------------------------
   WMO_DESC_KEY
   Maps WMO codes to i18n translation keys.
   The actual strings are in i18n.js so they update when the language changes.
   -------------------------------------------------------------------------- */
const WMO_DESC_KEY = {
  0:  'wmo_clear',        1:  'wmo_mainly_clear',   2:  'wmo_partly_cloudy',
  3:  'wmo_overcast',     45: 'wmo_fog',            48: 'wmo_rime_fog',
  51: 'wmo_drizzle_l',    53: 'wmo_drizzle_m',      55: 'wmo_drizzle_h',
  61: 'wmo_rain_l',       63: 'wmo_rain_m',          65: 'wmo_rain_h',
  71: 'wmo_snow_l',       73: 'wmo_snow_m',          75: 'wmo_snow_h',
  77: 'wmo_snow_grains',
  80: 'wmo_showers_l',    81: 'wmo_showers_m',       82: 'wmo_showers_h',
  85: 'wmo_snow_sh_l',    86: 'wmo_snow_sh_h',
  95: 'wmo_thunder',      96: 'wmo_thunder_hail_l',  99: 'wmo_thunder_hail_h',
};

/*
  Add the WMO description strings directly to TRANSLATIONS in i18n.js.
  They are defined here as plain objects so constants.js stays self-contained
  and we can call wmoDesc(code) without depending on i18n load order.
*/
const WMO_DESC_EN = {
  0:'Clear sky', 1:'Mainly clear', 2:'Partly cloudy', 3:'Overcast',
  45:'Fog', 48:'Rime fog',
  51:'Light drizzle', 53:'Moderate drizzle', 55:'Dense drizzle',
  61:'Slight rain', 63:'Moderate rain', 65:'Heavy rain',
  71:'Slight snowfall', 73:'Moderate snowfall', 75:'Heavy snowfall',
  77:'Snow grains',
  80:'Slight showers', 81:'Moderate showers', 82:'Violent showers',
  85:'Slight snow showers', 86:'Heavy snow showers',
  95:'Thunderstorm', 96:'Thunderstorm with hail', 99:'Thunderstorm with heavy hail',
};

const WMO_DESC_IT = {
  0:'Cielo sereno', 1:'Prevalentemente sereno', 2:'Parzialmente nuvoloso', 3:'Coperto',
  45:'Nebbia', 48:'Nebbia gelata',
  51:'Pioggerella leggera', 53:'Pioggerella moderata', 55:'Pioggerella intensa',
  61:'Pioggia leggera', 63:'Pioggia moderata', 65:'Pioggia forte',
  71:'Neve leggera', 73:'Neve moderata', 75:'Neve forte',
  77:'Granelli di neve',
  80:'Rovesci leggeri', 81:'Rovesci moderati', 82:'Rovesci forti',
  85:'Rovesci di neve leggeri', 86:'Rovesci di neve forti',
  95:'Temporale', 96:'Temporale con grandine', 99:'Temporale violento',
};

/**
 * Returns the WMO weather description in the currently active language.
 * Falls back to English if the code is unknown.
 * @param {number} code — WMO weather interpretation code
 * @returns {string}
 */
function wmoDesc(code) {
  /* currentLang is defined in i18n.js (loaded before this file) */
  const map = currentLang === 'it' ? WMO_DESC_IT : WMO_DESC_EN;
  return map[code] || '';
}


/* --------------------------------------------------------------------------
   getBgClass(wcode)
   Returns the CSS background class for the app wrapper based on conditions.
   Classes are defined in style.css.
   -------------------------------------------------------------------------- */
function getBgClass(wcode) {
  if (wcode <= 1)                         return 'bg-clear';
  if ((wcode >= 71 && wcode <= 77) ||
      (wcode >= 85 && wcode <= 86))       return 'bg-snow';
  if (wcode >= 95)                        return 'bg-storm';
  if (wcode >= 51 && wcode <= 82)         return 'bg-rain';
  if (wcode >= 2)                         return 'bg-cloud';
  return 'bg-clear';
}


/* --------------------------------------------------------------------------
   ALERT_THRESHOLDS
   Numeric limits used by getAlerts() in weather.js.
   Adjust these values to tune alert sensitivity.
   -------------------------------------------------------------------------- */
const ALERT_THRESHOLDS = {
  windStrong:   50,   /* km/h — triggers strong-wind alert */
  windGusty:    30,   /* km/h — suggests scarf in clothing advice */
  uvHigh:        8,   /* UV index — very high, sunscreen recommended */
  uvModerate:    6,   /* UV index — sunglasses recommended */
  heatExtreme:  35,   /* °C — extreme heat alert */
  coldFreezing:  0,   /* °C — sub-zero alert */
  coldChilly:    5,   /* °C — heavy coat */
  coldCool:     15,   /* °C — jacket */
  coldMild:     20,   /* °C — sweater */
  rainChance:   60,   /* % probability — suggest umbrella for forecast rain */
};
