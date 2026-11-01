// ================================================================
// Smart Plant Monitoring — Main Dashboard Controller
// ================================================================

import { 
    subscribeToLatest, subscribeToHistory, 
    SENSOR_THRESHOLDS, formatRelativeTime, evaluateAlerts 
} from './sensor-service.js';
import { assessPlantHealth, DEFAULT_PLANT_PROFILE } from './plant-service.js';
import { renderCombinedChart, updateAllChartsForRange } from './charts.js';

let _currentData = null;
let _historyRecords = [];

/**
 * Initializes the Main Dashboard
 */
export function initDashboard() {
    updateDateTimeDisplay();
    setInterval(updateDateTimeDisplay, 30000);
    setInterval(updateRelativeTimestamps, 5000);

    // Subscribe to latest sensor reading
    subscribeToLatest((data, error) => {
        if (error) {
            handleSensorError(error);
            return;
        }
        _currentData = data;
        updatePrimaryCards(data);
        updateHealthOverview(data);
        updateAlertsFeed(data);
        updateLiveTimestamp(data?.timestamp);
    });

    // Subscribe to history for dashboard mini-analytics
    subscribeToHistory((records, error) => {
        if (error) return;
        _historyRecords = records;
        if (document.getElementById('chart-combined')) {
            renderCombinedChart('chart-combined', records, '24h');
        }
        updateRecentActivityTable(records.slice(-8).reverse());
    });

    // Date range filter for dashboard overview chart
    const rangeButtons = document.querySelectorAll('.chart-filter-btn');
    rangeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            rangeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const range = btn.dataset.range || '24h';
            renderCombinedChart('chart-combined', _historyRecords, range);
        });
    });
}

function updateDateTimeDisplay() {
    const el = document.getElementById('current-date-display');
    if (el) {
        const now = new Date();
        el.textContent = now.toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
        });
    }
}

function updateLiveTimestamp(timestamp) {
    const el = document.getElementById('last-sync-timestamp');
    const relativeEl = document.getElementById('last-sync-relative');
    if (!timestamp) {
        if (el) el.textContent = 'Awaiting data';
        if (relativeEl) relativeEl.textContent = 'Never';
        return;
    }
    const d = new Date(timestamp);
    if (el) el.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (relativeEl) relativeEl.textContent = formatRelativeTime(timestamp);
}

function updateRelativeTimestamps() {
    if (_currentData?.timestamp) {
        const relativeEl = document.getElementById('last-sync-relative');
        if (relativeEl) relativeEl.textContent = formatRelativeTime(_currentData.timestamp);
        
        ['moisture', 'temperature', 'humidity', 'pump'].forEach(param => {
            const timeEl = document.getElementById(`${param}-card-time`);
            if (timeEl) timeEl.textContent = formatRelativeTime(_currentData.timestamp);
        });
    }
}

/**
 * Updates 3 Primary Sensor Cards & Relay Card
 */
function updatePrimaryCards(data) {
    if (!data) {
        setEmptyCardState('moisture', 'Soil Moisture', '%');
        setEmptyCardState('temperature', 'Temperature', '°C');
        setEmptyCardState('humidity', 'Air Humidity', '%');
        setEmptyCardState('pump', 'Water Pump', '');
        return;
    }

    // 1. Soil Moisture Card
    const moisture = data.soil_moisture;
    const moistureStatus = SENSOR_THRESHOLDS.soil_moisture.getStatus(moisture);
    const moistureValEl = document.getElementById('moisture-val');
    const moistureStatusEl = document.getElementById('moisture-status');
    const moistureProgressEl = document.getElementById('moisture-circle-progress');
    const moistureTimeEl = document.getElementById('moisture-card-time');

    if (moistureValEl) moistureValEl.textContent = moisture != null ? moisture : '--';
    if (moistureStatusEl) {
        moistureStatusEl.textContent = moistureStatus.label;
        moistureStatusEl.className = `status-pill status-${moistureStatus.class}`;
    }
    if (moistureProgressEl && moisture != null) {
        // SVG circle radius 36, circumference 2 * PI * 36 ≈ 226.2
        const circumference = 226.2;
        const offset = circumference - (Math.min(100, Math.max(0, moisture)) / 100) * circumference;
        moistureProgressEl.style.strokeDashoffset = offset;
        moistureProgressEl.style.stroke = moistureStatus.color;
    }
    if (moistureTimeEl) moistureTimeEl.textContent = formatRelativeTime(data.timestamp);

    // 2. Temperature Card
    const temp = data.temperature_c;
    const tempStatus = SENSOR_THRESHOLDS.temperature_c.getStatus(temp);
    const tempValEl = document.getElementById('temp-val');
    const tempStatusEl = document.getElementById('temp-status');
    const tempBarEl = document.getElementById('temp-bar-fill');
    const tempTimeEl = document.getElementById('temperature-card-time');

    if (tempValEl) tempValEl.textContent = temp != null ? Number(temp).toFixed(1) : '--';
    if (tempStatusEl) {
        tempStatusEl.textContent = tempStatus.label;
        tempStatusEl.className = `status-pill status-${tempStatus.class}`;
    }
    if (tempBarEl && temp != null) {
        // Scale temperature 0°C to 50°C
        const tempPct = Math.min(100, Math.max(0, (temp / 45) * 100));
        tempBarEl.style.width = `${tempPct}%`;
        tempBarEl.style.backgroundColor = tempStatus.color;
    }
    if (tempTimeEl) tempTimeEl.textContent = formatRelativeTime(data.timestamp);

    // 3. Humidity Card
    const humidity = data.air_humidity;
    const humidityStatus = SENSOR_THRESHOLDS.air_humidity.getStatus(humidity);
    const humidityValEl = document.getElementById('humidity-val');
    const humidityStatusEl = document.getElementById('humidity-status');
    const humidityBarEl = document.getElementById('humidity-bar-fill');
    const humidityTimeEl = document.getElementById('humidity-card-time');

    if (humidityValEl) humidityValEl.textContent = humidity != null ? Number(humidity).toFixed(1) : '--';
    if (humidityStatusEl) {
        humidityStatusEl.textContent = humidityStatus.label;
        humidityStatusEl.className = `status-pill status-${humidityStatus.class}`;
    }
    if (humidityBarEl && humidity != null) {
        const humPct = Math.min(100, Math.max(0, humidity));
        humidityBarEl.style.width = `${humPct}%`;
        humidityBarEl.style.backgroundColor = humidityStatus.color;
    }
    if (humidityTimeEl) humidityTimeEl.textContent = formatRelativeTime(data.timestamp);

    // 4. Relay / Pump Card
    const pumpStatus = SENSOR_THRESHOLDS.pump.getStatus(data.pump_on);
    const pumpValEl = document.getElementById('pump-val');
    const pumpStatusEl = document.getElementById('pump-status');
    const pumpIconEl = document.getElementById('pump-icon-container');
    const pumpTimeEl = document.getElementById('pump-card-time');

    if (pumpValEl) pumpValEl.textContent = pumpStatus.state;
    if (pumpStatusEl) {
        pumpStatusEl.textContent = pumpStatus.label;
        pumpStatusEl.className = `status-pill status-${pumpStatus.class}`;
    }
    if (pumpIconEl) {
        if (data.pump_on) {
            pumpIconEl.classList.add('pump-active-pulse');
        } else {
            pumpIconEl.classList.remove('pump-active-pulse');
        }
    }
    if (pumpTimeEl) pumpTimeEl.textContent = formatRelativeTime(data.timestamp);
}

function setEmptyCardState(cardPrefix, label, unit) {
    const valEl = document.getElementById(`${cardPrefix}-val`);
    const statusEl = document.getElementById(`${cardPrefix}-status`);
    if (valEl) valEl.textContent = 'No data available';
    if (statusEl) {
        statusEl.textContent = 'Awaiting data';
        statusEl.className = 'status-pill status-neutral';
    }
}

/**
 * Updates Plant Health Overview Widget
 */
function updateHealthOverview(data) {
    const assessment = assessPlantHealth(data, DEFAULT_PLANT_PROFILE);
    
    const statusBadge = document.getElementById('plant-health-status');
    const scoreVal = document.getElementById('plant-health-score');
    const summaryText = document.getElementById('plant-health-summary');
    const recsList = document.getElementById('plant-care-recommendations');
    const topHealthPill = document.getElementById('header-health-pill');

    if (statusBadge) {
        statusBadge.textContent = assessment.status;
        statusBadge.className = `status-pill status-${assessment.statusClass}`;
    }

    if (topHealthPill) {
        topHealthPill.textContent = assessment.status;
        topHealthPill.className = `status-pill status-${assessment.statusClass}`;
    }

    if (scoreVal) {
        scoreVal.textContent = assessment.score != null ? `${assessment.score}%` : '--';
        scoreVal.style.color = assessment.color;
    }

    if (summaryText) {
        summaryText.textContent = assessment.summary;
    }

    if (recsList) {
        recsList.innerHTML = assessment.recommendations.map(rec => `
            <li class="recommendation-item">
                <i data-lucide="check-circle-2" class="rec-icon"></i>
                <span>${rec}</span>
            </li>
        `).join('');
        if (window.lucide) window.lucide.createIcons();
    }
}

/**
 * Updates Alerts Feed
 */
function updateAlertsFeed(data) {
    const feed = document.getElementById('alerts-feed-container');
    const countBadge = document.getElementById('alerts-count-badge');
    if (!feed) return;

    const alerts = evaluateAlerts(data);

    if (countBadge) {
        countBadge.textContent = alerts.length;
        countBadge.style.display = alerts.length > 0 ? 'inline-flex' : 'none';
    }

    if (alerts.length === 0) {
        feed.innerHTML = `
            <div class="empty-feed-card">
                <i data-lucide="shield-check" class="empty-icon text-success"></i>
                <div class="empty-text">
                    <strong>All environmental parameters are within safe bounds</strong>
                    <span>No active threshold alerts or environmental hazards detected.</span>
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    feed.innerHTML = alerts.map(alert => `
        <div class="alert-card alert-${alert.type}">
            <div class="alert-header">
                <div class="alert-title-row">
                    <i data-lucide="${alert.type === 'critical' ? 'alert-octagon' : 'alert-triangle'}" class="alert-icon"></i>
                    <strong>${alert.title}</strong>
                </div>
                <span class="alert-time">${formatRelativeTime(alert.timestamp)}</span>
            </div>
            <p class="alert-msg">${alert.message}</p>
        </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
}

/**
 * Updates Recent Activity & Readings Table
 */
function updateRecentActivityTable(recentRecords) {
    const tbody = document.getElementById('recent-readings-tbody');
    if (!tbody) return;

    if (!recentRecords || recentRecords.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No recent records received yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = recentRecords.map(r => {
        const timeStr = r.timestamp ? new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
        const dateStr = r.timestamp ? new Date(r.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
        const mStatus = SENSOR_THRESHOLDS.soil_moisture.getStatus(r.soil_moisture);
        const tStatus = SENSOR_THRESHOLDS.temperature_c.getStatus(r.temperature_c);
        const hStatus = SENSOR_THRESHOLDS.air_humidity.getStatus(r.air_humidity);

        return `
            <tr>
                <td>
                    <div class="table-time-cell">
                        <strong>${timeStr}</strong>
                        <span class="text-muted text-xs">${dateStr}</span>
                    </div>
                </td>
                <td>
                    <div class="table-metric-cell">
                        <span>${r.soil_moisture != null ? `${r.soil_moisture}%` : '—'}</span>
                        <span class="status-dot status-${mStatus.class}" title="${mStatus.label}"></span>
                    </div>
                </td>
                <td>
                    <div class="table-metric-cell">
                        <span>${r.temperature_c != null ? `${r.temperature_c}°C` : '—'}</span>
                        <span class="status-dot status-${tStatus.class}" title="${tStatus.label}"></span>
                    </div>
                </td>
                <td>
                    <div class="table-metric-cell">
                        <span>${r.air_humidity != null ? `${r.air_humidity}%` : '—'}</span>
                        <span class="status-dot status-${hStatus.class}" title="${hStatus.label}"></span>
                    </div>
                </td>
                <td>
                    <span class="status-pill status-${r.pump_on ? 'success' : 'neutral'} text-xs">
                        ${r.pump_on ? 'PUMP ACTIVE' : 'IDLE'}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

function handleSensorError(error) {
    console.warn('Dashboard sensor error:', error);
    const chip = document.getElementById('firebase-status-chip');
    const isPermissionError = error?.code === 'PERMISSION_DENIED' || error?.message?.toLowerCase().includes('permission');

    if (chip) {
        if (isPermissionError) {
            chip.className = 'status-pill status-warning connection-chip';
            chip.innerHTML = '<span class="status-dot"></span><span>Sign In Required</span>';
        } else {
            chip.className = 'status-pill status-danger connection-chip';
            chip.innerHTML = '<span class="status-dot"></span><span>Connection Offline</span>';
        }
    }

    if (isPermissionError) {
        const tbody = document.getElementById('recent-readings-tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">🔒 Firebase Realtime Database requires authentication. Click <strong>Sign In</strong> in the topbar to connect.</td></tr>`;
        }

        const feed = document.getElementById('alerts-feed-container');
        if (feed) {
            feed.innerHTML = `
                <div class="empty-feed-card">
                    <i data-lucide="shield-alert" class="empty-icon text-warning"></i>
                    <div class="empty-text">
                        <strong>Authentication Required</strong>
                        <span>Database security rules require an authenticated session. Click <strong>Sign In</strong> (top-right) to connect.</span>
                    </div>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
        }
    }
}
