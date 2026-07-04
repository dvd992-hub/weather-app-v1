# 🌤 Weather App

A full-page, responsive weather application built in vanilla HTML, CSS, and JavaScript. No framework, no build step, no API key required.

---

## Features

| Feature | Details |
|---|---|
| **Real-time weather** | Temperature, feels-like, wind, humidity, UV index, precipitation |
| **Hourly forecast** | Horizontal scrollable strip for the next 24 hours |
| **7-day forecast** | Icon, description, daily high and low |
| **Temperature chart** | 7-day max/min curve powered by Chart.js |
| **Weather alerts** | Automatic warnings for strong wind, storms, frost, high UV, extreme heat |
| **Clothing advice** | Outfit suggestions based on temperature, rain, UV, and wind |
| **Dynamic background** | App gradient shifts to match current conditions |
| **°C / °F + km/h / mph** | Unit conversion applied everywhere in real time |
| **Save cities** | Bookmark any city to the favourites list |
| **Compare cities** | Side-by-side cards with warmest/coldest highlighting |
| **Interactive map** | Leaflet map with temperature markers for every saved city |
| **Autocomplete search** | Live city suggestions while typing |
| **Geolocation** | One-tap detection of the user's current position |
| **Internationalisation** | English / Italian — auto-detected from browser, manually overridable, saved to `localStorage` |

---

## Project structure

```
weather-app/
├── index.html              # HTML shell, script imports, boot snippet
├── assets/
│   └── favicon/
│       ├── favicon.svg     # Scalable favicon (modern browsers)
│       └── favicon.ico     # Multi-size favicon: 16×16, 32×32, 48×48
├── css/
│   └── style.css           # All styles — 15 sections, fully commented
├── js/
│   ├── i18n.js             # Translations (EN/IT), language detection, setLang()
│   ├── api.js              # All external API calls (Open-Meteo, Nominatim)
│   ├── constants.js        # WMO codes, weather descriptions, alert thresholds
│   ├── weather.js          # Core logic: search, render, alerts, saved cities
│   └── compare-map.js      # Compare tab and Map tab (Leaflet)
└── README.md
```

### Script load order

Each file depends on the one(s) loaded before it:

```
i18n.js → api.js → constants.js → weather.js → compare-map.js
```

> **Local file protocol note:** the separate `.js` files require a web server to work correctly — browsers block local script loading over `file://`. Use VS Code Live Server, `python3 -m http.server`, or deploy to any static host (GitHub Pages, Netlify, etc.).

---

## APIs used

All services are **free and require no API key**.

| Service | Purpose | Endpoint |
|---|---|---|
| [Open-Meteo](https://open-meteo.com) | Current weather + forecasts | `api.open-meteo.com/v1/forecast` |
| [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api) | City search by name | `geocoding-api.open-meteo.com/v1/search` |
| [Nominatim (OSM)](https://nominatim.org) | Reverse geocoding (coordinates → city) | `nominatim.openstreetmap.org/reverse` |

All fetch calls are centralised in `js/api.js`. To point the app at a proxy or a different API version, edit the `BASE_URLS` object at the top of that file.

---

## External libraries (CDN)

| Library | Version | Purpose |
|---|---|---|
| [Tabler Icons](https://tabler.io/icons) | latest | Outline icon set |
| [Leaflet](https://leafletjs.com) | 1.9.4 | Interactive map |
| [Chart.js](https://www.chartjs.org) | 4.4.1 | Temperature chart |

All libraries are loaded from CDN — nothing to install.

---

## Internationalisation (i18n)

The app ships with **English** and **Italian** translations defined in `js/i18n.js`.

### How language detection works

1. **On first load** — the browser language (`navigator.language`) is checked. If it starts with `"it"`, Italian is used; otherwise English is the default.
2. **Manual override** — the `EN / IT` toggle in the top-right corner of the navigation bar lets the user switch at any time.
3. **Persistence** — the chosen language is saved to `localStorage` under the key `weatherapp_lang` and restored on every subsequent visit.

### Adding a new language

1. Open `js/i18n.js`.
2. Add a new language code (e.g. `'fr'`) to every entry in the `TRANSLATIONS` object.
3. Add the same code to `WMO_DESC_*` objects in `js/constants.js`.
4. Add a toggle button in `index.html` and update the `setLang()` / `detectInitialLang()` functions in `i18n.js`.

---

## How to run

### With a local server (recommended)

```bash
# Python — built into macOS and most Linux distros
python3 -m http.server 8080

# Node.js
npx serve .

# VS Code — install the Live Server extension, then click "Go Live"
```

Then open `http://localhost:8080` in your browser.

### Deploy to GitHub Pages

1. Push the project to a GitHub repository.
2. Go to **Settings → Pages → Source** and select the `main` branch.
3. The app will be live at `https://<username>.github.io/<repo>/`.

---

## Customisation

### Alert thresholds

In `js/constants.js`, edit the `ALERT_THRESHOLDS` object to tune when alerts fire:

```js
const ALERT_THRESHOLDS = {
  windStrong:   50,   // km/h — strong wind alert
  uvHigh:        8,   // UV index — very high
  heatExtreme:  35,   // °C — extreme heat
  coldFreezing:  0,   // °C — sub-zero
  rainChance:   60,   // % — umbrella suggestion threshold
  // ...
};
```

### API endpoints

In `js/api.js`, edit the `BASE_URLS` object:

```js
const BASE_URLS = {
  weather:   'https://api.open-meteo.com/v1/forecast',
  geocoding: 'https://geocoding-api.open-meteo.com/v1/search',
  reverse:   'https://nominatim.openstreetmap.org/reverse',
};
```

---

## Browser compatibility

| Browser | Support |
|---|---|
| Chrome / Edge | ✅ Full |
| Firefox | ✅ Full |
| Safari | ✅ Full |
| Chrome for Android | ✅ Full |
| Safari for iOS | ✅ Full |

Requires: `fetch`, `async/await`, CSS Grid, Geolocation API — all supported by every modern browser.

---

## Changelog

### v2.0.0
- Full rewrite in English (code, comments, UI strings)
- Added internationalisation system (`js/i18n.js`): EN/IT, auto-detect, localStorage persistence
- Restructured into subdirectories: `assets/`, `css/`, `js/`
- Added SVG favicon and multi-size ICO favicon
- Language toggle in the navigation bar

### v1.0.0
- Initial release: real-time weather, hourly + 7-day forecast, Chart.js graph
- Weather alerts and clothing advice
- Save cities, Compare tab, interactive Map tab (Leaflet)
- Dynamic background, °C/°F + km/h/mph toggle
- Full-page responsive layout

---

## License

Open source — free to modify and distribute.
