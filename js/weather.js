/* ==========================================================================
   weather.js — Core application logic
   ==========================================================================
   Responsibilities:
     • Global state (current city, saved cities, unit preference)
     • City search with autocomplete debounce
     • Geolocation
     • Weather tab rendering (current + hourly strip + 7-day list + chart)
     • Weather alerts and clothing advice (via i18n keys)
     • Save / remove favourite cities
     • Navigation badge updates
   ========================================================================== */


/* ==========================================================================
   GLOBAL STATE
   ========================================================================== */

/** Active temperature unit: 'C' (Celsius / km/h) or 'F' (Fahrenheit / mph) */
let unit = 'C';

/** Data for the city currently displayed in the Weather tab */
let currentCity = null;   /* { lat, lon, name, data } */

/** List of cities saved by the user */
let savedCities = [];     /* [{ lat, lon, name }] */

/** Cached current-conditions data for saved cities (Compare + Map panels) */
let compareData = {};     /* { cityName: { tempC, feelsC, wcode, windKmh, hum, uv } } */

/** Active Chart.js instance (kept so it can be destroyed before re-render) */
let chartInstance = null;

/** Debounce timer ID for the search input */
let searchDebounceTimer = null;


/* ==========================================================================
   UNIT CONVERSION
   ========================================================================== */

/** Convert °C to the active display unit */
function toTemp(celsius) {
  return unit === 'C'
    ? Math.round(celsius)
    : Math.round(celsius * 9 / 5 + 32);
}

/** Returns the unit label string: '°C' or '°F' */
function unitLabel() {
  return unit === 'C' ? '°C' : '°F';
}

/** Convert and format wind speed */
function toWind(kmh) {
  return unit === 'C'
    ? `${Math.round(kmh)} km/h`
    : `${Math.round(kmh * 0.621)} mph`;
}

/**
 * Switch the active unit and refresh all visible panels.
 * Called by the °C / °F toggle buttons in the header.
 * @param {'C'|'F'} newUnit
 */
function setUnit(newUnit) {
  unit = newUnit;
  document.getElementById('btn-c').classList.toggle('active', newUnit === 'C');
  document.getElementById('btn-f').classList.toggle('active', newUnit === 'F');

  /* Re-render only if there is already data to show */
  if (currentCity) renderWeather(currentCity.data, currentCity.name);
  renderCompare();
  renderMapList();
}


/* ==========================================================================
   TAB NAVIGATION
   ========================================================================== */

/**
 * Activates the selected tab and updates the navigation buttons.
 * @param {'weather'|'compare'|'map'} tabName
 */
function switchTab(tabName) {
  const tabs = ['weather', 'compare', 'map'];
  tabs.forEach(name => {
    document.querySelector(`[onclick="switchTab('${name}')"]`)
      .classList.toggle('active', name === tabName);
    document.getElementById('tab-' + name)
      .classList.toggle('active', name === tabName);
  });

  /* On-demand render when switching to these tabs */
  if (tabName === 'compare') renderCompare();
  if (tabName === 'map')     renderMap();
}


/* ==========================================================================
   SEARCH — AUTOCOMPLETE
   ========================================================================== */

const searchInput   = document.getElementById('search-input');
const suggestionsEl = document.getElementById('suggestions');

/* Debounced input handler: waits 350 ms after the user stops typing */
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounceTimer);
  const query = searchInput.value.trim();
  if (query.length < 2) { suggestionsEl.style.display = 'none'; return; }
  searchDebounceTimer = setTimeout(() => showSuggestions(query), 350);
});

/* Keyboard shortcuts for the search field */
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter')  doSearch();
  if (e.key === 'Escape') suggestionsEl.style.display = 'none';
});

/* Close suggestion dropdown when clicking outside the search wrapper */
document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrapper')) suggestionsEl.style.display = 'none';
});

/**
 * Fetches city suggestions from the geocoding API and populates the dropdown.
 * @param {string} query
 */
async function showSuggestions(query) {
  try {
    const results = await searchCity(query, 5);
    if (!results.length) { suggestionsEl.style.display = 'none'; return; }

    suggestionsEl.innerHTML = results
      .map(loc => {
        /* Build a readable label: City, Region, Country */
        const label = [loc.name, loc.admin1, loc.country].filter(Boolean).join(', ');
        /* The city name passed to loadWeather: City, Country */
        const cityName = loc.name + (loc.country ? ', ' + loc.country : '');
        return `<div class="suggestion-item"
                     onclick="selectLocation(${loc.latitude}, ${loc.longitude},
                              '${esc(cityName)}')">
                  ${label}
                </div>`;
      })
      .join('');

    suggestionsEl.style.display = 'block';
  } catch (err) {
    console.error('Autocomplete error:', err);
    suggestionsEl.style.display = 'none';
  }
}

/** Searches for the city typed in the input and loads its weather */
async function doSearch() {
  const query = searchInput.value.trim();
  if (!query) return;
  suggestionsEl.style.display = 'none';

  showLoadingState();
  try {
    const results = await searchCity(query, 1);
    if (!results.length) { showErrorState(t('error_not_found')); return; }
    const loc = results[0];
    loadWeather(loc.latitude, loc.longitude, loc.name + (loc.country ? ', ' + loc.country : ''));
  } catch (err) {
    showErrorState(t('error_network'));
  }
}

/**
 * Selects a city from the dropdown and loads its weather.
 * @param {number} lat
 * @param {number} lon
 * @param {string} cityName — pre-built "City, Country" string
 */
function selectLocation(lat, lon, cityName) {
  searchInput.value = cityName;
  suggestionsEl.style.display = 'none';
  loadWeather(lat, lon, cityName);
}


/* ==========================================================================
   GEOLOCATION
   ========================================================================== */

/** Uses the browser Geolocation API to load weather for the current position */
function geoLocate() {
  if (!navigator.geolocation) {
    showErrorState(t('error_geo_support'));
    return;
  }
  showLoadingState();
  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      const { latitude: lat, longitude: lon } = coords;
      try {
        const { city, countryCode } = await reverseGeocode(lat, lon);
        const name = city + (countryCode ? ', ' + countryCode : '');
        loadWeather(lat, lon, name);
      } catch {
        /* Fallback: still load weather even if city name lookup fails */
        loadWeather(lat, lon, t('current_location'));
      }
    },
    () => showErrorState(t('error_geo'))
  );
}


/* ==========================================================================
   WEATHER DATA LOADING
   ========================================================================== */

/**
 * Fetches the full weather forecast and renders the Weather tab.
 * @param {number} lat
 * @param {number} lon
 * @param {string} cityName
 */
async function loadWeather(lat, lon, cityName) {
  showLoadingState();
  try {
    const data = await fetchWeather(lat, lon);
    currentCity = { lat, lon, name: cityName, data };
    renderWeather(data, cityName);
    updateSaveButton();
  } catch (err) {
    console.error('loadWeather:', err);
    showErrorState(t('error_weather'));
  }
}

/**
 * Fetches current-only data for a saved city and caches it in compareData.
 * Triggers a re-render of the Compare/Map panels if they are visible.
 * @param {string} name
 * @param {number} lat
 * @param {number} lon
 */
async function loadCompareData(name, lat, lon) {
  try {
    const data = await fetchWeatherCurrent(lat, lon);
    const c = data.current;
    compareData[name] = {
      tempC:   c.temperature_2m,
      feelsC:  c.apparent_temperature,
      wcode:   c.weathercode,
      windKmh: c.windspeed_10m,
      hum:     c.relativehumidity_2m,
      uv:      Math.round(c.uv_index || 0),
    };
    /* Refresh visible panels */
    if (document.getElementById('tab-compare').classList.contains('active')) renderCompare();
    if (document.getElementById('tab-map').classList.contains('active'))     renderMapList();
  } catch (err) {
    console.error('loadCompareData:', err);
  }
}


/* ==========================================================================
   ALERTS AND CLOTHING ADVICE
   ========================================================================== */

/**
 * Analyses current weather data and returns alerts and clothing suggestions.
 * All strings are retrieved via t() so they respect the active language.
 * @param {object} data — full Open-Meteo response
 * @returns {{ alerts: string[], advice: string[] }}
 */
function getAlerts(data) {
  const c      = data.current;
  const daily  = data.daily;
  const alerts = [];
  const advice = [];

  const wind    = c.windspeed_10m;
  const temp    = c.temperature_2m;
  const wcode   = c.weathercode;
  const uv      = c.uv_index || 0;
  const maxRain = Math.max(...(daily.precipitation_probability_max || [0]));

  /* ── Alerts ── */
  if (wind >= ALERT_THRESHOLDS.windStrong)
    alerts.push(t('alert_wind', { v: Math.round(wind) }));

  if (wcode >= 95)
    alerts.push(t('alert_storm'));
  else if (wcode >= 60 && wcode <= 82)
    alerts.push(t('alert_rain'));

  if (temp < ALERT_THRESHOLDS.coldFreezing)
    alerts.push(t('alert_freeze'));

  if (uv >= ALERT_THRESHOLDS.uvHigh)
    alerts.push(t('alert_uv', { v: Math.round(uv) }));

  if (temp >= ALERT_THRESHOLDS.heatExtreme)
    alerts.push(t('alert_heat'));

  /* ── Clothing advice — base layer by temperature ── */
  if      (temp < ALERT_THRESHOLDS.coldFreezing) advice.push(t('advice_heavy_coat'));
  else if (temp < ALERT_THRESHOLDS.coldChilly)   advice.push(t('advice_coat'));
  else if (temp < ALERT_THRESHOLDS.coldCool)     advice.push(t('advice_jacket'));
  else if (temp < ALERT_THRESHOLDS.coldMild)     advice.push(t('advice_sweater'));
  else                                            advice.push(t('advice_tshirt'));

  /* ── Clothing advice — accessories ── */
  if (wcode >= 51 && wcode <= 82)                advice.push(t('advice_umbrella'));
  if (wcode >= 71 && wcode <= 77)                advice.push(t('advice_snow_boots'));
  if (uv >= ALERT_THRESHOLDS.uvModerate)         advice.push(t('advice_sunglasses'));
  if (uv >= ALERT_THRESHOLDS.uvHigh)             advice.push(t('advice_sunscreen'));
  if (wind >= ALERT_THRESHOLDS.windGusty)        advice.push(t('advice_scarf'));
  if (maxRain >= ALERT_THRESHOLDS.rainChance)    advice.push(t('advice_umbrella_fc'));

  return { alerts, advice };
}


/* ==========================================================================
   WEATHER TAB RENDERING
   ========================================================================== */

/**
 * Builds and injects the full Weather tab HTML, then initialises the chart.
 * @param {object} data     — Open-Meteo full response
 * @param {string} cityName
 */
function renderWeather(data, cityName) {
  const c      = data.current;
  const daily  = data.daily;
  const hourly = data.hourly;
  const wcode  = c.weathercode;

  /* Apply dynamic background to the entire app wrapper */
  document.getElementById('app').className = getBgClass(wcode);

  /* Localised date string */
  const now     = new Date();
  const locale  = currentLang === 'it' ? 'it-IT' : 'en-GB';
  const dateStr = now.toLocaleDateString(locale, {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  /* ── Main temperature block ── */
  const mainHTML = `
    <div class="main-weather">
      <div class="city-name">${cityName}</div>
      <div class="date-time">${cap(dateStr)}</div>
      <div class="temp-row">
        <div class="temp-big">${toTemp(c.temperature_2m)}°</div>
        <div class="weather-icon-big">${WMO_ICONS[wcode] || '🌡'}</div>
      </div>
      <div class="weather-desc">${wmoDesc(wcode)}</div>
      <div class="feels-like">${t('feels_like')} ${toTemp(c.apparent_temperature)}${unitLabel()}</div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label"><i class="ti ti-wind" aria-hidden="true"></i>${t('stat_wind')}</div>
          <div class="stat-value stat-value--sm">${toWind(c.windspeed_10m)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label"><i class="ti ti-droplet" aria-hidden="true"></i>${t('stat_humidity')}</div>
          <div class="stat-value">${c.relativehumidity_2m}<span class="stat-unit">%</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label"><i class="ti ti-sun" aria-hidden="true"></i>${t('stat_uv')}</div>
          <div class="stat-value">${Math.round(c.uv_index || 0)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label"><i class="ti ti-cloud-rain" aria-hidden="true"></i>${t('stat_precip')}</div>
          <div class="stat-value">${(c.precipitation || 0).toFixed(1)}<span class="stat-unit">mm</span></div>
        </div>
      </div>
    </div>`;

  /* ── Alert and advice blocks ── */
  const { alerts, advice } = getAlerts(data);
  const alertHTML = alerts.length
    ? `<div class="alert-box">
         <div class="alert-title"><i class="ti ti-alert-triangle" aria-hidden="true"></i>${t('alert_title')}</div>
         ${alerts.map(a => `<div class="alert-item">${a}</div>`).join('')}
       </div>`
    : '';
  const adviceHTML = `
    <div class="advice-box">
      <div class="advice-title"><i class="ti ti-shirt" aria-hidden="true"></i>${t('advice_title')}</div>
      <div class="advice-chips">
        ${advice.map(a => `<span class="advice-chip">${a}</span>`).join('')}
      </div>
    </div>`;

  /* ── 7-day temperature chart ── */
  const chartLabels = daily.time.map((t_, i) => {
    if (i === 0) return t('today');
    return tDay(new Date(t_ + 'T12:00:00'));
  });
  const chartMax = daily.temperature_2m_max.map(v => toTemp(v));
  const chartMin = daily.temperature_2m_min.map(v => toTemp(v));
  const chartHTML = `
    <div class="section-block">
      <div class="section-title">${t('section_chart')}</div>
      <div class="chart-wrap"><canvas id="tempChart"></canvas></div>
    </div>`;

  /* ── Hourly forecast strip ── */
  const hourlyHTML = buildHourlyHTML(hourly, now);

  /* ── 7-day list ── */
  const dailyHTML = buildDailyHTML(daily);

  /* Inject everything */
  document.getElementById('weather-content').innerHTML =
    mainHTML + alertHTML + adviceHTML + chartHTML + hourlyHTML + dailyHTML;

  /* Initialise Chart.js after the canvas is in the DOM */
  initChart('tempChart', chartLabels, chartMax, chartMin);
}

/* --------------------------------------------------------------------------
   buildHourlyHTML — horizontal scrollable hourly cards
   -------------------------------------------------------------------------- */
function buildHourlyHTML(hourly, now) {
  const nowH = now.getHours();
  let startIdx = 0;

  /* Find the slot matching the current hour */
  for (let i = 0; i < hourly.time.length; i++) {
    const d = new Date(hourly.time[i]);
    if (d.getHours() === nowH && d.toDateString() === now.toDateString()) {
      startIdx = i; break;
    }
  }

  const slots = Array.from({ length: 24 }, (_, i) => startIdx + i)
    .filter(i => i < hourly.time.length);

  const cards = slots.map(i => {
    const dt    = new Date(hourly.time[i]);
    const label = i === startIdx
      ? t('hour_now')
      : dt.getHours().toString().padStart(2, '0') + ':00';
    return `<div class="hour-card">
      <div class="hour-time">${label}</div>
      <div class="hour-icon">${WMO_ICONS[hourly.weathercode[i]] || '🌡'}</div>
      <div class="hour-temp">${toTemp(hourly.temperature_2m[i])}°</div>
    </div>`;
  }).join('');

  return `<div class="section-block">
    <div class="section-title">${t('section_hourly')}</div>
    <div class="hourly-scroll">${cards}</div>
  </div>`;
}

/* --------------------------------------------------------------------------
   buildDailyHTML — 7-day forecast list
   -------------------------------------------------------------------------- */
function buildDailyHTML(daily) {
  const rows = daily.time.map((time, i) => {
    const dt    = new Date(time + 'T12:00:00');
    const label = i === 0 ? t('today') : tDay(dt);
    return `<div class="day-row">
      <div class="day-name">${label}</div>
      <div class="day-icon">${WMO_ICONS[daily.weathercode[i]] || '🌡'}</div>
      <div class="day-desc">${wmoDesc(daily.weathercode[i])}</div>
      <div class="day-temps">
        <span class="day-max">${toTemp(daily.temperature_2m_max[i])}°</span>
        <span class="day-min">${toTemp(daily.temperature_2m_min[i])}°</span>
      </div>
    </div>`;
  }).join('');

  return `<div class="section-block">
    <div class="section-title">${t('section_daily')}</div>
    <div class="daily-list">${rows}</div>
  </div>`;
}

/* --------------------------------------------------------------------------
   initChart — creates or recreates the Chart.js temperature graph
   -------------------------------------------------------------------------- */
function initChart(canvasId, labels, maxData, minData) {
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;

  chartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Max',
          data:  maxData,
          borderColor:          '#fbbf24',
          backgroundColor:      'rgba(251,191,36,0.08)',
          borderWidth:          2,
          pointRadius:          4,
          pointBackgroundColor: '#fbbf24',
          tension:              0.4,
          fill:                 false,
        },
        {
          label: 'Min',
          data:  minData,
          borderColor:          '#93c5fd',
          backgroundColor:      'rgba(147,197,253,0.08)',
          borderWidth:          2,
          pointRadius:          4,
          pointBackgroundColor: '#93c5fd',
          tension:              0.4,
          fill:                 false,
        },
      ],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: 'rgba(255,255,255,0.6)', font: { size: 11 }, boxWidth: 12, padding: 10 },
        },
        tooltip: {
          callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}°` },
        },
      },
      scales: {
        x: { ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.06)' } },
        y: { ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 10 }, callback: v => v + '°' }, grid: { color: 'rgba(255,255,255,0.06)' } },
      },
    },
  });
}


/* ==========================================================================
   SAVED CITIES MANAGEMENT
   ========================================================================== */

/** Returns true if a city with the given name is already in the saved list */
function isSaved(name) {
  return savedCities.some(c => c.name === name);
}

/** Updates the Save button label and style to reflect current saved state */
function updateSaveButton() {
  const btn = document.getElementById('save-btn');
  if (!currentCity) { btn.style.display = 'none'; return; }
  const saved = isSaved(currentCity.name);
  btn.style.display = 'flex';
  btn.classList.toggle('saved', saved);
  btn.innerHTML = saved
    ? `<i class="ti ti-bookmark-filled" aria-hidden="true"></i> ${t('saved_btn')}`
    : `<i class="ti ti-bookmark" aria-hidden="true"></i> ${t('save_btn')}`;
}

/** Toggles the current city in/out of the saved list */
function toggleSave() {
  if (!currentCity) return;
  if (isSaved(currentCity.name)) {
    savedCities = savedCities.filter(c => c.name !== currentCity.name);
    delete compareData[currentCity.name];
  } else {
    savedCities.push({ lat: currentCity.lat, lon: currentCity.lon, name: currentCity.name });
    loadCompareData(currentCity.name, currentCity.lat, currentCity.lon);
  }
  updateSaveButton();
  updateBadges();
}

/**
 * Removes a saved city. Called from the × button in the Compare and Map panels.
 * @param {string} name
 */
function removeSaved(name) {
  savedCities = savedCities.filter(c => c.name !== name);
  delete compareData[name];
  updateBadges();
  if (currentCity && currentCity.name === name) updateSaveButton();
  renderCompare();
  renderMap();
  renderMapList();
}

/** Updates the numeric badges on the Compare and Map tab buttons */
function updateBadges() {
  ['compare', 'map'].forEach(id => {
    const badge = document.getElementById('badge-' + id);
    badge.textContent   = savedCities.length;
    badge.style.display = savedCities.length > 0 ? 'inline' : 'none';
  });
}

/** Clears the compare data cache and reloads all saved cities */
async function refreshAll() {
  compareData = {};
  savedCities.forEach(c => loadCompareData(c.name, c.lat, c.lon));
  renderCompare();
}


/* ==========================================================================
   WELCOME / LOADING / ERROR STATES
   ========================================================================== */

function showWelcome() {
  document.getElementById('weather-content').innerHTML = `
    <div class="state-box">
      <div class="state-icon">🌤</div>
      <div class="state-title">${t('welcome_title')}</div>
      <div class="state-sub">${t('welcome_sub')}</div>
    </div>`;
}

function showLoadingState() {
  document.getElementById('weather-content').innerHTML = `
    <div class="state-box">
      <div class="loading-spinner"></div>
      <div class="state-sub">${t('loading')}</div>
    </div>`;
}

function showErrorState(message) {
  document.getElementById('weather-content').innerHTML = `
    <div class="state-box">
      <div class="state-icon">⚠️</div>
      <div class="state-title">${message}</div>
    </div>`;
}


/* ==========================================================================
   UTILITIES
   ========================================================================== */

/** Capitalises the first letter of a string */
function cap(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Escapes single quotes and double quotes for safe use in inline HTML attributes.
 * Example: onclick="selectLocation('Côte d\'Ivoire')"
 */
function esc(str) {
  return (str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
