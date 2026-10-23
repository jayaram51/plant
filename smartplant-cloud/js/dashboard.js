// ================================================================
// SmartPlant Cloud — Dashboard Module
// ================================================================

import { db, DB_PATHS, ref, onValue, off, get } from './firebase-config.js';
import {
    initPage, isDemoMode, getDemoType, showToast,
    formatRelativeTime, formatDateTime, formatTime,
    getMoistureStatus, getTemperatureStatus, getHumidityStatus, getPumpStatus,
    getDataFreshness, isValidReading, sanitizeReading, calcStats,
    filterHistoryByRange, historyToSortedArray, onDateRangeChange, getCurrentDateRange
} from './utils.js';
import { localDemo } from './demo-data.js';
import {
    applyChartDefaults, createMoistureChart, createTemperatureChart,
    createHumidityChart, createPumpTimelineChart, createMiniChart,
    destroyChart, setupThemeWatcher
} from './charts.js';

// ----------------------------------------------------------------
// State
// ----------------------------------------------------------------
let latestData = null;
let historyData = [];
let charts = {};
let unsubscribers = [];
let previousReading = null;

// ----------------------------------------------------------------
// Initialize
// ----------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
    initPage('overview', 'Overview', [{ label: 'Dashboard' }]);
    applyChartDefaults();

    const demoType = getDemoType();

    if (isDemoMode() && demoType === 'local') {
        initLocalDemo();
    } else {
        initFirebaseListeners();
    }

    // Date range changes
    onDateRangeChange((range) => {
        updateChartsForRange(range);
    });

    // Theme change updates
    setupThemeWatcher(charts);
});

// ----------------------------------------------------------------
// Firebase Real-Time Listeners
// ----------------------------------------------------------------
function initFirebaseListeners() {
    const demoType = getDemoType();
    const latestPath = demoType === 'firebase' ? DB_PATHS.DEMO_LATEST : DB_PATHS.LATEST;
    const historyPath = demoType === 'firebase' ? DB_PATHS.DEMO_HISTORY : DB_PATHS.HISTORY;

    // Listen to latest readings
    const latestRef = ref(db, latestPath);
    onValue(latestRef, (snapshot) => {
        const data = snapshot.val();
        if (data && isValidReading(data)) {
            previousReading = latestData;
            latestData = sanitizeReading(data);
            updateKPICards(latestData);
            updateDeviceStatus(latestData);
        } else {
            showEmptyState();
        }
    }, (error) => {
        console.error('Latest data error:', error);
        showToast('Failed to load sensor data', 'danger');
        showEmptyState();
    });

    // Listen to history
    const historyRef = ref(db, historyPath);
    onValue(historyRef, (snapshot) => {
        const raw = snapshot.val();
        if (raw) {
            historyData = historyToSortedArray(raw);
            updateChartsForRange(getCurrentDateRange());
            updateRecentReadingsTable();
        }
    }, (error) => {
        console.error('History data error:', error);
    });

    // Store unsubscribers
    unsubscribers.push(() => off(latestRef));
    unsubscribers.push(() => off(historyRef));
}

// ----------------------------------------------------------------
// Local Demo Mode
// ----------------------------------------------------------------
function initLocalDemo() {
    localDemo.start();

    unsubscribers.push(
        localDemo.onData('latest', (data) => {
            previousReading = latestData;
            latestData = data;
            updateKPICards(data);
            updateDeviceStatus(data);
        }),
        localDemo.onData('history', (data) => {
            historyData = data;
            updateChartsForRange(getCurrentDateRange());
            updateRecentReadingsTable();
        })
    );
}

// ----------------------------------------------------------------
// Update KPI Cards
// ----------------------------------------------------------------
function updateKPICards(data) {
    if (!data) return;

    // Soil Moisture
    updateKPICard('moisture', {
        value: data.soil_moisture,
        unit: '%',
        status: getMoistureStatus(data.soil_moisture),
        trend: previousReading ? getTrend(data.soil_moisture, previousReading.soil_moisture) : null,
        miniData: historyData.slice(-20).map(r => r.soil_moisture)
    });

    // Temperature
    updateKPICard('temperature', {
        value: data.temperature_c,
        unit: '°C',
        status: getTemperatureStatus(data.temperature_c),
        trend: previousReading ? getTrend(data.temperature_c, previousReading.temperature_c) : null,
        miniData: historyData.slice(-20).map(r => r.temperature_c),
        stats: calcStats(historyData.slice(-100).map(r => r.temperature_c))
    });

    // Humidity
    updateKPICard('humidity', {
        value: data.air_humidity,
        unit: '%',
        status: getHumidityStatus(data.air_humidity),
        trend: previousReading ? getTrend(data.air_humidity, previousReading.air_humidity) : null,
        miniData: historyData.slice(-20).map(r => r.air_humidity)
    });

    // Pump
    updateKPICard('pump', {
        value: null,
        pumpStatus: getPumpStatus(data.pump_on),
        activationCount: historyData.filter(r => r.pump_on === true).length
    });
}

function updateKPICard(type, info) {
    const card = document.querySelector(`[data-kpi="${type}"]`);
    if (!card) return;

    const valueEl = card.querySelector('.kpi-value');
    const statusEl = card.querySelector('.kpi-status');
    const trendEl = card.querySelector('.kpi-trend');
    const miniCanvas = card.querySelector('.kpi-mini-canvas');
    const subtextEl = card.querySelector('.kpi-subtext');

    if (type === 'pump') {
        if (valueEl) {
            valueEl.innerHTML = `<span class="sp-badge ${info.pumpStatus.class === 'status-normal' ? 'sp-badge-success' : 'sp-badge-neutral'}" style="font-size: 1rem; padding: 6px 14px;">
                <i class="bi bi-circle-fill" style="font-size: 0.5rem;"></i> ${info.pumpStatus.label}
            </span>`;
        }
        if (subtextEl) {
            subtextEl.textContent = `${info.activationCount} activations in period`;
        }
        return;
    }

    if (valueEl && info.value !== null && info.value !== undefined) {
        valueEl.innerHTML = `${info.value}<span class="kpi-unit">${info.unit}</span>`;
    } else if (valueEl) {
        valueEl.textContent = '—';
    }

    if (statusEl && info.status) {
        statusEl.className = `kpi-status ${info.status.class}`;
        statusEl.textContent = info.status.label;
    }

    if (trendEl && info.trend) {
        trendEl.innerHTML = `
            <i class="bi ${info.trend.icon} ${info.trend.class}"></i>
            <span class="${info.trend.class}">${info.trend.text}</span> vs previous
        `;
    }

    // Mini sparkline
    if (miniCanvas && info.miniData && info.miniData.length > 2) {
        const existing = charts[`mini_${type}`];
        if (existing) {
            existing.data.datasets[0].data = info.miniData;
            existing.data.labels = info.miniData.map((_, i) => i);
            existing.update('none');
        } else {
            const colors = { moisture: '#3b82f6', temperature: '#ef4444', humidity: '#a855f7' };
            charts[`mini_${type}`] = createMiniChart(miniCanvas, info.miniData, colors[type]);
        }
    }

    // Stats subtext for temperature
    if (subtextEl && info.stats) {
        subtextEl.textContent = `Min: ${info.stats.min}°C · Max: ${info.stats.max}°C · Avg: ${info.stats.avg}°C`;
    }
}

function getTrend(current, previous) {
    if (current === null || previous === null || current === undefined || previous === undefined) return null;
    const diff = current - previous;
    if (Math.abs(diff) < 0.1) return { icon: 'bi-dash', class: 'text-secondary', text: 'No change' };
    if (diff > 0) return { icon: 'bi-arrow-up', class: 'trend-up', text: `+${diff.toFixed(1)}` };
    return { icon: 'bi-arrow-down', class: 'trend-down', text: `${diff.toFixed(1)}` };
}

// ----------------------------------------------------------------
// Update Device Status Panel
// ----------------------------------------------------------------
function updateDeviceStatus(data) {
    const panel = document.getElementById('device-status-panel');
    if (!panel) return;

    const freshness = getDataFreshness(data.timestamp);
    const uptimeText = data.uptime_ms ? formatDurationShort(data.uptime_ms) : '—';

    panel.innerHTML = `
        <div class="device-status-item">
            <span class="status-indicator ${freshness.class === 'fresh' ? 'online' : freshness.class === 'stale' ? 'stale' : 'offline'}"></span>
            <span>ESP32 Device</span>
        </div>
        <div class="device-status-item">
            <i class="bi bi-clock" style="font-size: 0.7rem;"></i>
            <span>Last Update: <strong class="data-freshness ${freshness.class}">${freshness.label}</strong></span>
        </div>
        <div class="device-status-item">
            <i class="bi bi-hdd" style="font-size: 0.7rem;"></i>
            <span>Uptime: ${uptimeText}</span>
        </div>
        <div class="device-status-item">
            <i class="bi bi-database" style="font-size: 0.7rem;"></i>
            <span>${historyData.length} records</span>
        </div>
    `;
}

function formatDurationShort(ms) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

// ----------------------------------------------------------------
// Charts
// ----------------------------------------------------------------
function updateChartsForRange(range) {
    const filtered = filterHistoryByRange(historyData, range);
    if (filtered.length < 2) {
        showChartsEmptyState();
        return;
    }

    // Moisture Chart
    const moistureCtx = document.getElementById('dashboard-moisture-chart');
    if (moistureCtx) {
        charts.moisture = destroyChart(charts.moisture);
        charts.moisture = createMoistureChart(moistureCtx.getContext('2d'), filtered);
    }

    // Temperature Chart
    const tempCtx = document.getElementById('dashboard-temp-chart');
    if (tempCtx) {
        charts.temperature = destroyChart(charts.temperature);
        charts.temperature = createTemperatureChart(tempCtx.getContext('2d'), filtered);
    }

    // Humidity Chart
    const humCtx = document.getElementById('dashboard-humidity-chart');
    if (humCtx) {
        charts.humidity = destroyChart(charts.humidity);
        charts.humidity = createHumidityChart(humCtx.getContext('2d'), filtered);
    }

    // Pump Timeline
    const pumpCtx = document.getElementById('dashboard-pump-chart');
    if (pumpCtx) {
        charts.pump = destroyChart(charts.pump);
        charts.pump = createPumpTimelineChart(pumpCtx.getContext('2d'), filtered);
    }
}

function showChartsEmptyState() {
    ['dashboard-moisture-chart', 'dashboard-temp-chart', 'dashboard-humidity-chart', 'dashboard-pump-chart'].forEach(id => {
        const canvas = document.getElementById(id);
        if (canvas) {
            const wrapper = canvas.closest('.chart-wrapper');
            if (wrapper) {
                wrapper.innerHTML = `
                    <div class="chart-no-data">
                        <i class="bi bi-bar-chart-line"></i>
                        <p>No data available for selected period</p>
                    </div>
                `;
            }
        }
    });
}

// ----------------------------------------------------------------
// Recent Readings Table
// ----------------------------------------------------------------
function updateRecentReadingsTable() {
    const tbody = document.getElementById('recent-readings-tbody');
    if (!tbody) return;

    const recent = historyData.slice(-10).reverse();

    if (recent.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-secondary" style="padding: 24px;">No readings available</td></tr>`;
        return;
    }

    tbody.innerHTML = recent.map(r => {
        const moistureStatus = getMoistureStatus(r.soil_moisture);
        return `
            <tr>
                <td>${r.timestamp ? formatDateTime(r.timestamp) : '—'}</td>
                <td>
                    <span class="font-semibold">${r.soil_moisture ?? '—'}%</span>
                    <span class="sp-badge ${moistureStatus.class === 'status-normal' ? 'sp-badge-success' : moistureStatus.class === 'status-danger' ? 'sp-badge-danger' : 'sp-badge-warning'}" style="margin-left: 6px;">${moistureStatus.label}</span>
                </td>
                <td>${r.temperature_c ?? '—'}°C</td>
                <td>${r.air_humidity ?? '—'}%</td>
                <td>
                    <span class="sp-badge ${r.pump_on ? 'sp-badge-success' : 'sp-badge-neutral'}">${r.pump_on ? 'ON' : 'OFF'}</span>
                </td>
                <td class="text-secondary text-xs">${r._isDemo ? '<i class="bi bi-info-circle"></i> Demo' : 'Live'}</td>
            </tr>
        `;
    }).join('');
}

// ----------------------------------------------------------------
// Empty State
// ----------------------------------------------------------------
function showEmptyState() {
    const kpiCards = document.querySelectorAll('.kpi-card');
    kpiCards.forEach(card => {
        const valueEl = card.querySelector('.kpi-value');
        if (valueEl) valueEl.textContent = '—';
        const statusEl = card.querySelector('.kpi-status');
        if (statusEl) {
            statusEl.className = 'kpi-status status-info';
            statusEl.textContent = 'No data';
        }
    });
}

// ----------------------------------------------------------------
// Cleanup on unload
// ----------------------------------------------------------------
window.addEventListener('beforeunload', () => {
    unsubscribers.forEach(unsub => unsub());
    Object.values(charts).forEach(c => destroyChart(c));
    if (isDemoMode() && getDemoType() === 'local') {
        localDemo.stop();
    }
});
