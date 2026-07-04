/* ==========================================================================
   compare-map.js — Compare tab and Map tab
   ==========================================================================
   Dependencies (loaded before this file via index.html):
     • i18n.js       (t, tDay, currentLang)
     • constants.js  (WMO_ICONS, wmoDesc, getBgClass)
     • weather.js    (savedCities, compareData, toTemp, toWind, unitLabel,
                      loadCompareData, removeSaved, esc)
     • Leaflet       (global L object, loaded via CDN)
   ========================================================================== */


/* ==========================================================================
   MAP STATE
   ========================================================================== */

/** Leaflet map instance — null until the Map tab is opened for the first time */
let leafletMap = null;

/** Active Leaflet markers — kept so they can be removed before re-render */
let mapMarkers = [];


/* ==========================================================================
   COMPARE TAB
   ========================================================================== */

/**
 * Builds and injects the Compare tab HTML.
 * • Empty state  → shown when no cities are saved.
 * • Ready cards  → cities that already have data in compareData.
 * • Loading cards→ cities whose data is still being fetched.
 */
function renderCompare() {
  const container = document.getElementById('compare-content');
  if (!savedCities.length) {
    container.innerHTML = buildCompareEmptyHTML();
    return;
  }

  const ready   = savedCities.filter(c =>  compareData[c.name]);
  const pending = savedCities.filter(c => !compareData[c.name]);

  /* Kick off fetch for any city that does not have data yet */
  pending.forEach(c => loadCompareData(c.name, c.lat, c.lon));

  /* Find max/min temperatures for colour highlighting */
  const temps = ready.map(c => compareData[c.name].tempC);
  const maxT  = Math.max(...temps);
  const minT  = Math.min(...temps);

  const header  = buildCompareHeaderHTML(ready.length > 0);
  const legend  = ready.length > 1 ? buildLegendHTML() : '';
  const cards   = ready.map(c => buildCompareCardHTML(c, maxT, minT, ready.length)).join('');
  const loading = pending.map(c => buildLoadingCardHTML(c)).join('');

  container.innerHTML = `
    ${header}
    ${legend}
    <div class="compare-grid">${cards}${loading}</div>`;
}

/* --------------------------------------------------------------------------
   buildCompareEmptyHTML — empty state for the Compare tab
   -------------------------------------------------------------------------- */
function buildCompareEmptyHTML() {
  return `
    <div class="compare-empty">
      <div class="compare-empty-icon">🗂</div>
      <div class="compare-empty-title">${t('compare_empty_title')}</div>
      <div class="compare-empty-sub">${t('compare_empty_sub')}</div>
    </div>`;
}

/* --------------------------------------------------------------------------
   buildCompareHeaderHTML — city count and optional Refresh button
   -------------------------------------------------------------------------- */
function buildCompareHeaderHTML(showRefresh) {
  const count = savedCities.length;
  const label = count === 1
    ? t('compare_saved_one')
    : t('compare_saved_many', { n: count });

  const refreshBtn = showRefresh
    ? `<button class="icon-btn refresh-btn" onclick="refreshAll()">
         <i class="ti ti-refresh" aria-hidden="true"></i> ${t('compare_refresh')}
       </button>`
    : '';

  return `<div class="compare-header">
    <span class="compare-count">${label}</span>
    ${refreshBtn}
  </div>`;
}

/* --------------------------------------------------------------------------
   buildCompareCardHTML — single compare card for a city with data
   -------------------------------------------------------------------------- */
function buildCompareCardHTML(city, maxTemp, minTemp, totalCount) {
  const cd     = compareData[city.name];
  const isMax  = cd.tempC === maxTemp && totalCount > 1;
  const isMin  = cd.tempC === minTemp && totalCount > 1 && maxTemp !== minTemp;
  const cls    = isMax ? 'highlight-max' : isMin ? 'highlight-min' : '';

  return `
    <div class="compare-card">
      <button class="cc-remove-btn"
              onclick="removeSaved('${esc(city.name)}')"
              title="Remove ${city.name}">
        <i class="ti ti-x" aria-hidden="true"></i>
      </button>
      <div class="cc-city">${city.name}</div>
      <div class="cc-icon">${WMO_ICONS[cd.wcode] || '🌡'}</div>
      <div class="cc-temp ${cls}">${toTemp(cd.tempC)}°</div>
      <div class="cc-desc">${wmoDesc(cd.wcode)}</div>
      <div class="cc-stats">
        <div class="cc-stat-row">
          <span class="cc-stat-label">${t('compare_feels')}</span>
          <span class="cc-stat-val">${toTemp(cd.feelsC)}°</span>
        </div>
        <div class="cc-stat-row">
          <span class="cc-stat-label">${t('compare_wind')}</span>
          <span class="cc-stat-val">${toWind(cd.windKmh)}</span>
        </div>
        <div class="cc-stat-row">
          <span class="cc-stat-label">${t('compare_humidity')}</span>
          <span class="cc-stat-val">${cd.hum}%</span>
        </div>
        <div class="cc-stat-row">
          <span class="cc-stat-label">${t('compare_uv')}</span>
          <span class="cc-stat-val">${cd.uv}</span>
        </div>
      </div>
    </div>`;
}

/* --------------------------------------------------------------------------
   buildLoadingCardHTML — spinner placeholder while data is loading
   -------------------------------------------------------------------------- */
function buildLoadingCardHTML(city) {
  return `
    <div class="compare-card compare-card--loading">
      <div class="loading-spinner" style="width:22px;height:22px;border-width:2px"></div>
      <div class="cc-city">${city.name}</div>
    </div>`;
}

/* --------------------------------------------------------------------------
   buildLegendHTML — warm / cold colour legend shown when ≥ 2 cities
   -------------------------------------------------------------------------- */
function buildLegendHTML() {
  return `
    <div class="compare-legend">
      <span><span class="legend-dot" style="background:#fbbf24"></span>${t('legend_warmest')}</span>
      <span><span class="legend-dot" style="background:#93c5fd"></span>${t('legend_coldest')}</span>
    </div>`;
}


/* ==========================================================================
   MAP TAB
   ========================================================================== */

/**
 * Initialises or updates the Leaflet map with markers for all saved cities.
 * Handles the toggle between the map canvas and the empty state.
 */
function renderMap() {
  const mapEl   = document.getElementById('leaflet-map');
  const emptyEl = document.getElementById('map-empty');

  /* No saved cities → show empty state, destroy map if it exists */
  if (!savedCities.length) {
    mapEl.style.display   = 'none';
    emptyEl.style.display = 'flex';
    if (leafletMap) { leafletMap.remove(); leafletMap = null; }
    renderMapList();
    return;
  }

  emptyEl.style.display = 'none';
  mapEl.style.display   = 'block';

  /* First time opening the Map tab → initialise Leaflet */
  if (!leafletMap) {
    leafletMap = L.map('leaflet-map', {
      zoomControl:        true,
      attributionControl: false,
    });
    /* OpenStreetMap tiles */
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(leafletMap);
  }

  /* Remove previous markers before adding new ones */
  mapMarkers.forEach(m => m.remove());
  mapMarkers = [];
  const bounds = [];

  savedCities.forEach(city => {
    const cd = compareData[city.name];

    /* Popup content */
    const popupHTML = cd
      ? `<div class="map-popup">
           <div class="map-popup-name">${city.name}</div>
           <div class="map-popup-icon">${WMO_ICONS[cd.wcode] || '🌡'}</div>
           <div class="map-popup-temp">${toTemp(cd.tempC)}°</div>
           <div class="map-popup-desc">${wmoDesc(cd.wcode)}</div>
         </div>`
      : `<div class="map-popup"><div class="map-popup-name">${city.name}</div></div>`;

    /* Circular marker showing the temperature */
    const tempLabel = cd ? toTemp(cd.tempC) + '°' : '?';
    const icon = L.divIcon({
      html:       `<div class="map-marker-circle">${tempLabel}</div>`,
      className:  '',
      iconSize:   [36, 36],
      iconAnchor: [18, 18],
    });

    const marker = L.marker([city.lat, city.lon], { icon })
      .bindPopup(popupHTML)
      .addTo(leafletMap);

    mapMarkers.push(marker);
    bounds.push([city.lat, city.lon]);
  });

  /* Fit the viewport to all markers */
  if (bounds.length === 1)     leafletMap.setView(bounds[0], 7);
  else if (bounds.length > 1)  leafletMap.fitBounds(bounds, { padding: [30, 30] });

  /* Force a size recalculation — needed when the tab was hidden during init */
  setTimeout(() => leafletMap.invalidateSize(), 150);

  renderMapList();
}

/**
 * Renders the textual city list below the map.
 * Each row lets the user centre the map on that city or remove it.
 */
function renderMapList() {
  const listEl = document.getElementById('map-saved-list');
  if (!savedCities.length) { listEl.innerHTML = ''; return; }

  listEl.innerHTML = savedCities.map(city => {
    const cd = compareData[city.name];
    return `
      <div class="map-saved-row" onclick="flyToCity(${city.lat}, ${city.lon})">
        <div class="msr-icon">${cd ? WMO_ICONS[cd.wcode] || '🌡' : '🌡'}</div>
        <div class="msr-info">
          <div class="msr-name">${city.name}</div>
          <div class="msr-desc">${cd ? wmoDesc(cd.wcode) : t('loading_compare')}</div>
        </div>
        ${cd ? `<div class="msr-temp">${toTemp(cd.tempC)}°</div>` : ''}
        <button class="msr-remove"
                onclick="event.stopPropagation(); removeSaved('${esc(city.name)}')"
                title="Remove ${city.name}">
          <i class="ti ti-x" aria-hidden="true"></i>
        </button>
      </div>`;
  }).join('');
}

/**
 * Flies the map to a specific city when the user clicks a row in the list.
 * @param {number} lat
 * @param {number} lon
 */
function flyToCity(lat, lon) {
  if (leafletMap) leafletMap.setView([lat, lon], 9);
}
