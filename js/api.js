/* ==========================================================================
   api.js — External API calls
   ==========================================================================
   All network requests are centralised here. To point the app at a proxy
   or a different API version, edit the BASE_URLS object below.

   Services used (all free, no API key required):
     • Open-Meteo         → current weather + forecasts
     • Open-Meteo Geocoding → city search by name
     • Nominatim (OSM)    → reverse geocoding (coordinates → city name)
   ========================================================================== */


/* --------------------------------------------------------------------------
   BASE URLS
   -------------------------------------------------------------------------- */
const BASE_URLS = {
  weather:   'https://api.open-meteo.com/v1/forecast',
  geocoding: 'https://geocoding-api.open-meteo.com/v1/search',
  reverse:   'https://nominatim.openstreetmap.org/reverse',
};


/* --------------------------------------------------------------------------
   fetchWeather(lat, lon)
   Full forecast: current conditions + hourly (48 h) + daily (7 days).
   Returns the raw Open-Meteo JSON or throws on HTTP error.
   -------------------------------------------------------------------------- */
async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude:  lat,
    longitude: lon,
    /* current conditions */
    current: [
      'temperature_2m',
      'apparent_temperature',
      'weathercode',
      'windspeed_10m',
      'relativehumidity_2m',
      'precipitation',
      'uv_index',
    ].join(','),
    /* hourly data for the scroll strip */
    hourly: [
      'temperature_2m',
      'weathercode',
    ].join(','),
    /* daily data for the 7-day list and the chart */
    daily: [
      'weathercode',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
    ].join(','),
    wind_speed_unit: 'kmh',   /* always fetch in km/h; mph conversion happens in JS */
    timezone:        'auto',  /* use the timezone of the requested location */
    forecast_days:   7,
  });

  const res = await fetch(`${BASE_URLS.weather}?${params}`);
  if (!res.ok) throw new Error(`Weather API error: HTTP ${res.status}`);
  return res.json();
}


/* --------------------------------------------------------------------------
   fetchWeatherCurrent(lat, lon)
   Lightweight version: current conditions only.
   Used to populate the Compare and Map cards without fetching full forecasts.
   -------------------------------------------------------------------------- */
async function fetchWeatherCurrent(lat, lon) {
  const params = new URLSearchParams({
    latitude:  lat,
    longitude: lon,
    current: [
      'temperature_2m',
      'apparent_temperature',
      'weathercode',
      'windspeed_10m',
      'relativehumidity_2m',
      'uv_index',
    ].join(','),
    timezone: 'auto',
  });

  const res = await fetch(`${BASE_URLS.weather}?${params}`);
  if (!res.ok) throw new Error(`Weather API error: HTTP ${res.status}`);
  return res.json();
}


/* --------------------------------------------------------------------------
   searchCity(query, maxResults)
   Searches for cities matching the given name string.
   Returns an array of location objects or an empty array.
   -------------------------------------------------------------------------- */
async function searchCity(query, maxResults = 5) {
  const params = new URLSearchParams({
    name:     query,
    count:    maxResults,
    language: 'en',   /* always request English names for consistency */
    format:   'json',
  });

  const res = await fetch(`${BASE_URLS.geocoding}?${params}`);
  if (!res.ok) throw new Error(`Geocoding API error: HTTP ${res.status}`);
  const data = await res.json();
  return data.results || [];
}


/* --------------------------------------------------------------------------
   reverseGeocode(lat, lon)
   Converts GPS coordinates into a human-readable city name.
   Returns { city, countryCode } or fallback values.
   -------------------------------------------------------------------------- */
async function reverseGeocode(lat, lon) {
  const params = new URLSearchParams({ lat, lon, format: 'json' });
  const res = await fetch(`${BASE_URLS.reverse}?${params}`, {
    /* Nominatim requires a descriptive User-Agent */
    headers: { 'Accept-Language': 'en' },
  });
  if (!res.ok) throw new Error(`Reverse geocoding error: HTTP ${res.status}`);
  const data = await res.json();
  const addr = data.address || {};
  return {
    city:        addr.city || addr.town || addr.village || addr.county || 'Unknown location',
    countryCode: (addr.country_code || '').toUpperCase(),
  };
}
