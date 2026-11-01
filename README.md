# 🌾 Smart Agriculture — IoT Monitoring Dashboard & Web Application

A modern, production-grade Smart Agriculture & IoT Plant Monitoring Web Application built with **HTML5, CSS3, Vanilla JavaScript (ES6+), Chart.js, and Firebase Realtime Database**. Designed to run as a 100% static frontend web application hosted directly on **GitHub Pages**.

---

## 🚀 Live Demo & Deployment

- **Repository**: [https://github.com/jayaram51/plant](https://github.com/jayaram51/plant)
- **Live GitHub Pages URL**: `https://jayaram51.github.io/plant/`

---

## 🌿 Features Overview

### 1. Main Telemetry Dashboard (`index.html`)
- **Three Primary Sensor Cards**:
  - **Soil Moisture**: Real-time percentage display with an animated circular SVG gauge, status categorization (`Dry`, `Normal`, `Wet`), calibrated thresholds (30% – 65%), and relative update timestamps.
  - **Temperature**: Current ambient temperature in °C, visual thermal comfort meter, status classification (`Low`, `Normal`, `High`), and ideal bounds (18°C – 28°C).
  - **Air Humidity**: Relative atmospheric humidity %, color-coded status bar (`Low`, `Normal`, `High`), and tropical comfort target (40% – 70%).
  - **Irrigation Pump Relay**: Real-time relay state indicator (`ACTIVE` / `IDLE`), visual pulse glow when pump is energized.
- **Plant Health Assessment Engine**:
  - Multi-sensor diagnostic algorithm evaluating soil moisture, temperature, and humidity concurrently.
  - Overall health score (0–100%) and status badges: `Healthy`, `Needs Attention`, `Critical`, or `Insufficient Data`.
  - Contextual care recommendations distinguishing measured data from calculated advice.
- **Environmental Threshold Alerts**:
  - Live alerts for critical hydration, extreme heat, cold stress, and dry atmospheric conditions.
- **Interactive Multi-Sensor Chart**:
  - Unified timeline correlating soil moisture, temperature, and humidity with time range filters (`24 Hours`, `7 Days`, `30 Days`, `All Data`).
- **Recent Telemetry Table**:
  - Fast-loading summary of the most recent sensor packets.

### 2. Live Sensor Telemetry Console (`pages/monitoring.html`)
- Continuous WebSocket subscription to `/plant/latest`.
- Dedicated radial gauges and progress bars for all environmental sensors.
- Raw ESP32 ADC values (`soil_raw`), device uptime (`uptime_ms`), and execution timings.
- Raw JSON packet inspector with 1-click clipboard copy for hardware debugging.

### 3. Historical Telemetry & Analytics (`pages/history.html`)
- Three dedicated Chart.js line graphs:
  1. **Soil Moisture History (%)**
  2. **Temperature History (°C)**
  3. **Air Humidity History (%)**
- Summary statistics cards: Period Average, Minimum, and Maximum for each parameter.
- Full paginated historical records table with live search and filtering.
- **CSV Data Export** for offline agricultural research.

---

## 🔒 Firebase Backend Architecture & Preservation

All original Firebase credentials, database paths, and field structures have been **100% preserved**:

- **Firebase Project ID**: `virushka-d2b72`
- **Database URL**: `https://virushka-d2b72-default-rtdb.firebaseio.com/`
- **Auth Domain**: `virushka-d2b72.firebaseapp.com`
- **Realtime Database Paths**:
  - Latest Sensor Reading: `plant/latest`
  - Historical Sensor Records: `plant/history`
- **Sensor Field Mappings**:
  - `soil_moisture` (Numeric percentage, 0–100%)
  - `soil_raw` (Analog ADC reading from capacitive sensor)
  - `temperature_c` (Ambient degrees Celsius)
  - `air_humidity` (Relative humidity percentage)
  - `pump_on` (Boolean relay state, `true`/`false`)
  - `timestamp` (Unix epoch seconds or milliseconds)
  - `uptime_ms` (Microcontroller uptime in milliseconds)

### Firebase Security Rules & Authentication
The database rules enforce `auth != null`:
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```
The application includes a built-in authentication modal with 1-click verified credentials (`jayaram93915@gmail.com`) to establish immediate authenticated read access.

---

## 📁 Repository Structure

```
hey/
├── index.html                   # Main Dashboard (Repository Root for GitHub Pages)
├── manifest.json                # Progressive Web App manifest
├── sw.js                        # PWA Service Worker for offline capability
├── database.rules.json          # Firebase Realtime Database rules reference
├── .nojekyll                    # Disables Jekyll processing on GitHub Pages
├── README.md                    # Project documentation & deployment guide
├── start-server.bat             # Local testing launcher (Windows)
├── server.ps1                   # Local lightweight static HTTP server
│
├── pages/
│   ├── monitoring.html          # Dedicated Live Telemetry Stream page
│   └── history.html             # Dedicated Historical Graphs & Records Table page
│
├── css/
│   ├── style.css                # Design system tokens, sidebar, topbar, modal
│   ├── dashboard.css            # Primary sensor cards, gauges, charts, alerts
│   └── responsive.css           # Mobile & tablet responsive breakpoints
│
├── js/
│   ├── firebase-config.js       # Preserved Firebase SDK v10.7.1 config & DB refs
│   ├── firebase-service.js      # Authentication, user session & connection observer
│   ├── sensor-service.js        # Real-time listeners, thresholds & data sanitization
│   ├── plant-service.js         # Plant profile & multi-sensor health diagnosis
│   ├── charts.js                # Chart.js instances, curves, & range filters
│   ├── dashboard.js             # Main dashboard controller
│   ├── history.js               # History table, search, pagination & CSV export
│   └── app.js                   # Navigation shell, mobile drawer & theme switcher
│
└── assets/
    └── icons/                   # App icons & PWA assets (icon-192.png, icon-512.png)
```

---

## 🌐 GitHub Pages Deployment Instructions

1. **Commit and Push to GitHub**:
   ```bash
   git add .
   git commit -m "Rebuild Smart Plant Monitoring application into static GitHub Pages web app"
   git push origin main
   ```

2. **Configure GitHub Pages in Repository Settings**:
   - Navigate to your repository on GitHub: `https://github.com/jayaram51/hey`
   - Click on **Settings** (top navigation tab).
   - In the left sidebar, click on **Pages**.
   - Under **Build and deployment**:
     - **Source**: Select `Deploy from a branch`.
     - **Branch**: Select `main`.
     - **Folder**: Select `/(root)`.
   - Click **Save**.

3. **Add Authorized Domain to Firebase Console**:
   - Go to the [Firebase Console](https://console.firebase.google.com/).
   - Select your project: **`virushka-d2b72`**.
   - Navigate to **Authentication** > **Settings** > **Authorized domains**.
   - Click **Add domain**.
   - Enter your GitHub Pages domain: `jayaram51.github.io`.
   - Click **Save**. *(Do not delete existing domains like `localhost` or `virushka-d2b72.firebaseapp.com`).*

4. **Verify Live Site**:
   - Open `https://jayaram51.github.io/hey/` in your browser.

---

## 💻 Local Development & Testing

To test the application locally:
1. Double-click `start-server.bat` in the project root directory.
2. The local server will start at `http://localhost:8080/index.html` and automatically open your default browser.
3. Or use any static file server:
   ```bash
   npx serve .
   # or
   python -m http.server 8080
   ```