// ================================================================
// Smart Plant Monitoring — Interactive Chart.js Module
// Renders responsive, smooth environmental graphs with time filters
// ================================================================

import { filterHistoryByRange } from './sensor-service.js';

let moistureChart = null;
let temperatureChart = null;
let humidityChart = null;
let combinedChart = null;

let _activeRange = '24h';
let _cachedHistory = [];

/**
 * Common Chart.js styling options for clean, premium aesthetics
 */
function getChartThemeOptions() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        interaction: {
            intersect: false,
            mode: 'index'
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                titleColor: isDark ? '#f8fafc' : '#0f172a',
                bodyColor: isDark ? '#cbd5e1' : '#334155',
                borderColor: isDark ? '#334155' : '#e2e8f0',
                borderWidth: 1,
                padding: 10,
                boxPadding: 4,
                usePointStyle: true,
                callbacks: {
                    title: function(items) {
                        if (!items.length) return '';
                        return items[0].label;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: {
                    color: gridColor,
                    drawBorder: false
                },
                ticks: {
                    color: textColor,
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 7,
                    font: { size: 11, family: 'Inter, system-ui, sans-serif' }
                }
            },
            y: {
                grid: {
                    color: gridColor,
                    drawBorder: false
                },
                ticks: {
                    color: textColor,
                    font: { size: 11, family: 'Inter, system-ui, sans-serif' }
                }
            }
        }
    };
}

/**
 * Formats timestamps for chart X-axis labels based on time range
 */
function formatLabelForRange(timestamp, range) {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return '';

    if (range === '24h') {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (range === '7d') {
        return `${d.toLocaleDateString([], { weekday: 'short' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

/**
 * Initializes or updates the Soil Moisture Chart
 */
export function renderMoistureChart(canvasId, records, range = _activeRange) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const filtered = filterHistoryByRange(records, range);
    const labels = filtered.map(r => formatLabelForRange(r.timestamp, range));
    const dataPoints = filtered.map(r => r.soil_moisture);

    const baseOpts = getChartThemeOptions();
    baseOpts.scales.y.min = 0;
    baseOpts.scales.y.max = 100;
    baseOpts.scales.y.ticks.callback = val => `${val}%`;

    if (moistureChart) {
        moistureChart.data.labels = labels;
        moistureChart.data.datasets[0].data = dataPoints;
        moistureChart.options = baseOpts;
        moistureChart.update();
        return moistureChart;
    }

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.01)');

    moistureChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Soil Moisture (%)',
                data: dataPoints,
                borderColor: '#10b981',
                backgroundColor: gradient,
                borderWidth: 2.5,
                fill: true,
                tension: 0.35,
                pointRadius: filtered.length > 50 ? 0 : 3,
                pointHoverRadius: 6,
                pointBackgroundColor: '#10b981'
            }]
        },
        options: baseOpts
    });

    return moistureChart;
}

/**
 * Initializes or updates the Temperature Chart
 */
export function renderTemperatureChart(canvasId, records, range = _activeRange) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const filtered = filterHistoryByRange(records, range);
    const labels = filtered.map(r => formatLabelForRange(r.timestamp, range));
    const dataPoints = filtered.map(r => r.temperature_c);

    const baseOpts = getChartThemeOptions();
    baseOpts.scales.y.ticks.callback = val => `${val}°C`;

    if (temperatureChart) {
        temperatureChart.data.labels = labels;
        temperatureChart.data.datasets[0].data = dataPoints;
        temperatureChart.options = baseOpts;
        temperatureChart.update();
        return temperatureChart;
    }

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
    gradient.addColorStop(1, 'rgba(239, 68, 68, 0.01)');

    temperatureChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Temperature (°C)',
                data: dataPoints,
                borderColor: '#ef4444',
                backgroundColor: gradient,
                borderWidth: 2.5,
                fill: true,
                tension: 0.35,
                pointRadius: filtered.length > 50 ? 0 : 3,
                pointHoverRadius: 6,
                pointBackgroundColor: '#ef4444'
            }]
        },
        options: baseOpts
    });

    return temperatureChart;
}

/**
 * Initializes or updates the Humidity Chart
 */
export function renderHumidityChart(canvasId, records, range = _activeRange) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const filtered = filterHistoryByRange(records, range);
    const labels = filtered.map(r => formatLabelForRange(r.timestamp, range));
    const dataPoints = filtered.map(r => r.air_humidity);

    const baseOpts = getChartThemeOptions();
    baseOpts.scales.y.min = 0;
    baseOpts.scales.y.max = 100;
    baseOpts.scales.y.ticks.callback = val => `${val}%`;

    if (humidityChart) {
        humidityChart.data.labels = labels;
        humidityChart.data.datasets[0].data = dataPoints;
        humidityChart.options = baseOpts;
        humidityChart.update();
        return humidityChart;
    }

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.01)');

    humidityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Air Humidity (%)',
                data: dataPoints,
                borderColor: '#3b82f6',
                backgroundColor: gradient,
                borderWidth: 2.5,
                fill: true,
                tension: 0.35,
                pointRadius: filtered.length > 50 ? 0 : 3,
                pointHoverRadius: 6,
                pointBackgroundColor: '#3b82f6'
            }]
        },
        options: baseOpts
    });

    return humidityChart;
}

/**
 * Initializes or updates a Combined Sensor Chart
 */
export function renderCombinedChart(canvasId, records, range = _activeRange) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const filtered = filterHistoryByRange(records, range);
    const labels = filtered.map(r => formatLabelForRange(r.timestamp, range));

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    const opts = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        interaction: { intersect: false, mode: 'index' },
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    color: textColor,
                    boxWidth: 12,
                    usePointStyle: true,
                    font: { size: 12, family: 'Inter, system-ui, sans-serif' }
                }
            },
            tooltip: {
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                titleColor: isDark ? '#f8fafc' : '#0f172a',
                bodyColor: isDark ? '#cbd5e1' : '#334155',
                borderColor: isDark ? '#334155' : '#e2e8f0',
                borderWidth: 1,
                padding: 10
            }
        },
        scales: {
            x: {
                grid: { color: gridColor, drawBorder: false },
                ticks: { color: textColor, maxTicksLimit: 8, font: { size: 11 } }
            },
            y: {
                type: 'linear',
                position: 'left',
                min: 0,
                max: 100,
                grid: { color: gridColor, drawBorder: false },
                ticks: {
                    color: textColor,
                    callback: v => `${v}%`,
                    font: { size: 11 }
                },
                title: { display: true, text: 'Moisture & Humidity (%)', color: textColor, font: { size: 11 } }
            },
            y1: {
                type: 'linear',
                position: 'right',
                grid: { drawOnChartArea: false },
                ticks: {
                    color: textColor,
                    callback: v => `${v}°C`,
                    font: { size: 11 }
                },
                title: { display: true, text: 'Temperature (°C)', color: textColor, font: { size: 11 } }
            }
        }
    };

    if (combinedChart) {
        combinedChart.data.labels = labels;
        combinedChart.data.datasets[0].data = filtered.map(r => r.soil_moisture);
        combinedChart.data.datasets[1].data = filtered.map(r => r.temperature_c);
        combinedChart.data.datasets[2].data = filtered.map(r => r.air_humidity);
        combinedChart.options = opts;
        combinedChart.update();
        return combinedChart;
    }

    const ctx = canvas.getContext('2d');
    combinedChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Soil Moisture',
                    data: filtered.map(r => r.soil_moisture),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    yAxisID: 'y',
                    borderWidth: 2,
                    tension: 0.35,
                    pointRadius: 0
                },
                {
                    label: 'Temperature',
                    data: filtered.map(r => r.temperature_c),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    yAxisID: 'y1',
                    borderWidth: 2,
                    tension: 0.35,
                    pointRadius: 0
                },
                {
                    label: 'Air Humidity',
                    data: filtered.map(r => r.air_humidity),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    yAxisID: 'y',
                    borderWidth: 2,
                    tension: 0.35,
                    pointRadius: 0
                }
            ]
        },
        options: opts
    });

    return combinedChart;
}

/**
 * Updates all charts when date range changes
 */
export function updateAllChartsForRange(range, records = _cachedHistory) {
    _activeRange = range;
    _cachedHistory = records;

    if (document.getElementById('chart-moisture')) {
        renderMoistureChart('chart-moisture', records, range);
    }
    if (document.getElementById('chart-temperature')) {
        renderTemperatureChart('chart-temperature', records, range);
    }
    if (document.getElementById('chart-humidity')) {
        renderHumidityChart('chart-humidity', records, range);
    }
    if (document.getElementById('chart-combined')) {
        renderCombinedChart('chart-combined', records, range);
    }
}

/**
 * Re-render theme changes for all active charts
 */
export function refreshChartThemes() {
    updateAllChartsForRange(_activeRange, _cachedHistory);
}

export function getActiveRange() {
    return _activeRange;
}
