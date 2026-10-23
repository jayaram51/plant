// ================================================================
// SmartPlant Cloud — Chart.js Configurations
// ================================================================

import { getTheme } from './utils.js';

// ----------------------------------------------------------------
// Chart.js Global Defaults
// ----------------------------------------------------------------
export function applyChartDefaults() {
    const isDark = getTheme() === 'dark';
    
    Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.color = isDark ? '#94a3b8' : '#64748b';
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.pointStyle = 'circle';
    Chart.defaults.plugins.legend.labels.padding = 16;
    Chart.defaults.plugins.tooltip.backgroundColor = isDark ? '#1e293b' : '#0f172a';
    Chart.defaults.plugins.tooltip.titleFont = { size: 12, weight: '600' };
    Chart.defaults.plugins.tooltip.bodyFont = { size: 11 };
    Chart.defaults.plugins.tooltip.padding = { x: 12, y: 8 };
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.displayColors = true;
    Chart.defaults.plugins.tooltip.boxPadding = 4;
    Chart.defaults.elements.point.radius = 2;
    Chart.defaults.elements.point.hoverRadius = 5;
    Chart.defaults.elements.line.tension = 0.3;
    Chart.defaults.responsive = true;
    Chart.defaults.maintainAspectRatio = false;
}

function getGridColor() {
    return getTheme() === 'dark' ? 'rgba(45, 58, 74, 0.6)' : 'rgba(226, 232, 240, 0.8)';
}

function getTextColor() {
    return getTheme() === 'dark' ? '#94a3b8' : '#64748b';
}

// ----------------------------------------------------------------
// Common Axis/Scale Config
// ----------------------------------------------------------------
function timeScaleConfig(unit = 'hour') {
    return {
        type: 'time',
        time: {
            unit: unit,
            displayFormats: {
                minute: 'HH:mm',
                hour: 'HH:mm',
                day: 'MMM d',
                week: 'MMM d'
            },
            tooltipFormat: 'MMM d, yyyy HH:mm'
        },
        grid: { color: getGridColor(), drawBorder: false },
        ticks: { color: getTextColor(), maxTicksLimit: 12, maxRotation: 0 }
    };
}

function linearScaleConfig(label, min, max, suffix = '') {
    return {
        type: 'linear',
        display: true,
        title: { display: true, text: label, color: getTextColor(), font: { size: 11, weight: '500' } },
        grid: { color: getGridColor(), drawBorder: false },
        ticks: {
            color: getTextColor(),
            callback: (value) => `${value}${suffix}`
        },
        min: min,
        max: max
    };
}

// ----------------------------------------------------------------
// Time Labels Helper
// ----------------------------------------------------------------
function extractTimeLabels(records) {
    return records.map(r => r.timestamp ? new Date(r.timestamp) : null).filter(Boolean);
}

// ----------------------------------------------------------------
// 1. Soil Moisture Line Chart
// ----------------------------------------------------------------
export function createMoistureChart(ctx, records, options = {}) {
    const labels = extractTimeLabels(records);
    const data = records.map(r => r.soil_moisture);

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Soil Moisture (%)',
                    data: data,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    fill: true,
                    borderWidth: 2,
                    pointRadius: 1,
                    pointHoverRadius: 5
                },
                // Dry threshold reference line
                {
                    label: 'Dry Threshold',
                    data: Array(labels.length).fill(options.dryThreshold || 30),
                    borderColor: 'rgba(239, 68, 68, 0.5)',
                    borderDash: [6, 4],
                    borderWidth: 1.5,
                    pointRadius: 0,
                    fill: false
                },
                // Target moisture reference line
                {
                    label: 'Target Moisture',
                    data: Array(labels.length).fill(options.targetMoisture || 55),
                    borderColor: 'rgba(16, 185, 129, 0.5)',
                    borderDash: [6, 4],
                    borderWidth: 1.5,
                    pointRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            scales: {
                x: timeScaleConfig(getTimeUnit(records)),
                y: linearScaleConfig('Moisture (%)', 0, 100, '%')
            },
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}%`
                    }
                }
            }
        }
    });
}

// ----------------------------------------------------------------
// 2. Temperature Line/Area Chart
// ----------------------------------------------------------------
export function createTemperatureChart(ctx, records) {
    const labels = extractTimeLabels(records);
    const data = records.map(r => r.temperature_c);

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Temperature (°C)',
                data: data,
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.06)',
                fill: true,
                borderWidth: 2,
                pointRadius: 1,
                pointHoverRadius: 5
            }]
        },
        options: {
            scales: {
                x: timeScaleConfig(getTimeUnit(records)),
                y: linearScaleConfig('Temperature (°C)', undefined, undefined, '°C')
            },
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `Temperature: ${ctx.parsed.y}°C`
                    }
                }
            }
        }
    });
}

// ----------------------------------------------------------------
// 3. Air Humidity Trend Chart
// ----------------------------------------------------------------
export function createHumidityChart(ctx, records) {
    const labels = extractTimeLabels(records);
    const data = records.map(r => r.air_humidity);

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Air Humidity (%)',
                data: data,
                borderColor: '#a855f7',
                backgroundColor: 'rgba(168, 85, 247, 0.06)',
                fill: true,
                borderWidth: 2,
                pointRadius: 1,
                pointHoverRadius: 5
            }]
        },
        options: {
            scales: {
                x: timeScaleConfig(getTimeUnit(records)),
                y: linearScaleConfig('Humidity (%)', 0, 100, '%')
            },
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `Humidity: ${ctx.parsed.y}%`
                    }
                }
            }
        }
    });
}

// ----------------------------------------------------------------
// 4. Combined Sensor Comparison Chart
// ----------------------------------------------------------------
export function createCombinedChart(ctx, records) {
    const labels = extractTimeLabels(records);

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Soil Moisture (%)',
                    data: records.map(r => r.soil_moisture),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    fill: false,
                    borderWidth: 2,
                    pointRadius: 0,
                    yAxisID: 'y'
                },
                {
                    label: 'Temperature (°C)',
                    data: records.map(r => r.temperature_c),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.05)',
                    fill: false,
                    borderWidth: 2,
                    pointRadius: 0,
                    yAxisID: 'y1'
                },
                {
                    label: 'Humidity (%)',
                    data: records.map(r => r.air_humidity),
                    borderColor: '#a855f7',
                    backgroundColor: 'rgba(168, 85, 247, 0.05)',
                    fill: false,
                    borderWidth: 2,
                    pointRadius: 0,
                    yAxisID: 'y'
                }
            ]
        },
        options: {
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: timeScaleConfig(getTimeUnit(records)),
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Moisture / Humidity (%)', color: getTextColor(), font: { size: 11 } },
                    grid: { color: getGridColor(), drawBorder: false },
                    ticks: { color: getTextColor(), callback: v => `${v}%` },
                    min: 0,
                    max: 100
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'Temperature (°C)', color: getTextColor(), font: { size: 11 } },
                    grid: { drawOnChartArea: false },
                    ticks: { color: getTextColor(), callback: v => `${v}°C` }
                }
            },
            plugins: {
                legend: { display: true, position: 'top' }
            }
        }
    });
}

// ----------------------------------------------------------------
// 5. Daily Averages Bar Chart
// ----------------------------------------------------------------
export function createDailyAveragesChart(ctx, dailyData) {
    const labels = dailyData.map(d => d.day);

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Avg Moisture (%)',
                    data: dailyData.map(d => d.moisture.avg),
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Avg Temp (°C)',
                    data: dailyData.map(d => d.temperature.avg),
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderColor: '#ef4444',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Avg Humidity (%)',
                    data: dailyData.map(d => d.humidity.avg),
                    backgroundColor: 'rgba(168, 85, 247, 0.7)',
                    borderColor: '#a855f7',
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            scales: {
                x: {
                    grid: { color: getGridColor(), drawBorder: false },
                    ticks: { color: getTextColor(), maxRotation: 45 }
                },
                y: {
                    grid: { color: getGridColor(), drawBorder: false },
                    ticks: { color: getTextColor() },
                    beginAtZero: true
                }
            },
            plugins: {
                legend: { display: true, position: 'top' }
            }
        }
    });
}

// ----------------------------------------------------------------
// 6. Moisture Distribution Doughnut Chart
// ----------------------------------------------------------------
export function createMoistureDistributionChart(ctx, records) {
    let dry = 0, normal = 0, wet = 0;
    records.forEach(r => {
        if (r.soil_moisture === null || r.soil_moisture === undefined) return;
        if (r.soil_moisture < 30) dry++;
        else if (r.soil_moisture < 60) normal++;
        else wet++;
    });

    const total = dry + normal + wet;

    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Dry (< 30%)', 'Normal (30–60%)', 'Wet (> 60%)'],
            datasets: [{
                data: [dry, normal, wet],
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(59, 130, 246, 0.8)'
                ],
                borderColor: [
                    '#ef4444',
                    '#10b981',
                    '#3b82f6'
                ],
                borderWidth: 2,
                hoverOffset: 6
            }]
        },
        options: {
            cutout: '65%',
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: { padding: 16 }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                            return `${ctx.label}: ${ctx.parsed} readings (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ----------------------------------------------------------------
// 7. Pump ON/OFF Duration Chart
// ----------------------------------------------------------------
export function createPumpDurationChart(ctx, pumpEvents) {
    if (!pumpEvents || pumpEvents.length === 0) return null;

    const labels = pumpEvents.map(e => new Date(e.timestamp));
    const durations = pumpEvents.map(e => e.duration_seconds || 0);

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Pump Duration (seconds)',
                data: durations,
                backgroundColor: 'rgba(16, 185, 129, 0.7)',
                borderColor: '#10b981',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            scales: {
                x: timeScaleConfig('day'),
                y: {
                    grid: { color: getGridColor(), drawBorder: false },
                    ticks: { color: getTextColor(), callback: v => `${v}s` },
                    title: { display: true, text: 'Duration (s)', color: getTextColor(), font: { size: 11 } },
                    beginAtZero: true
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `Duration: ${ctx.parsed.y}s`
                    }
                }
            }
        }
    });
}

// ----------------------------------------------------------------
// 8. Pump Activation Timeline
// ----------------------------------------------------------------
export function createPumpTimelineChart(ctx, records) {
    const labels = extractTimeLabels(records);
    const pumpData = records.map(r => r.pump_on ? 1 : 0);

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Pump State',
                data: pumpData,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                fill: true,
                stepped: 'before',
                borderWidth: 2,
                pointRadius: 0
            }]
        },
        options: {
            scales: {
                x: timeScaleConfig(getTimeUnit(records)),
                y: {
                    min: -0.1,
                    max: 1.1,
                    grid: { color: getGridColor(), drawBorder: false },
                    ticks: {
                        color: getTextColor(),
                        stepSize: 1,
                        callback: (value) => value === 1 ? 'ON' : value === 0 ? 'OFF' : ''
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `Pump: ${ctx.parsed.y === 1 ? 'ON' : 'OFF'}`
                    }
                }
            }
        }
    });
}

// ----------------------------------------------------------------
// 9. Sensor Reading Frequency Chart
// ----------------------------------------------------------------
export function createFrequencyChart(ctx, records) {
    // Group readings by hour to show data density
    const hourCounts = {};
    records.forEach(r => {
        if (!r.timestamp) return;
        const d = new Date(r.timestamp);
        const hourKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:00`;
        hourCounts[hourKey] = (hourCounts[hourKey] || 0) + 1;
    });

    const labels = Object.keys(hourCounts).sort();
    const data = labels.map(k => hourCounts[k]);

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.map(l => new Date(l)),
            datasets: [{
                label: 'Readings per Hour',
                data: data,
                backgroundColor: 'rgba(99, 102, 241, 0.6)',
                borderColor: '#6366f1',
                borderWidth: 1,
                borderRadius: 3
            }]
        },
        options: {
            scales: {
                x: timeScaleConfig('hour'),
                y: {
                    grid: { color: getGridColor(), drawBorder: false },
                    ticks: { color: getTextColor(), stepSize: 1 },
                    title: { display: true, text: 'Count', color: getTextColor(), font: { size: 11 } },
                    beginAtZero: true
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.parsed.y} readings`
                    }
                }
            }
        }
    });
}

// ----------------------------------------------------------------
// Mini Sparkline for KPI Cards
// ----------------------------------------------------------------
export function createMiniChart(ctx, data, color = '#059669') {
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map((_, i) => i),
            datasets: [{
                data: data,
                borderColor: color,
                backgroundColor: `${color}15`,
                fill: true,
                borderWidth: 1.5,
                pointRadius: 0,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { display: false },
                y: { display: false }
            },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            },
            elements: {
                line: { tension: 0.4 }
            }
        }
    });
}

// ----------------------------------------------------------------
// Helper: Determine time unit based on data range
// ----------------------------------------------------------------
function getTimeUnit(records) {
    if (!records || records.length < 2) return 'hour';
    const first = records[0]?.timestamp;
    const last = records[records.length - 1]?.timestamp;
    if (!first || !last) return 'hour';
    
    const rangeHours = (last - first) / (1000 * 60 * 60);
    if (rangeHours <= 2) return 'minute';
    if (rangeHours <= 48) return 'hour';
    return 'day';
}

// ----------------------------------------------------------------
// Update chart data in-place
// ----------------------------------------------------------------
export function updateChartData(chart, records, datasetIndex = 0) {
    if (!chart || !records) return;

    const labels = extractTimeLabels(records);
    chart.data.labels = labels;

    if (chart.data.datasets[datasetIndex]) {
        chart.data.datasets[datasetIndex].data = records.map(r => {
            // Determine which field based on dataset label
            const label = chart.data.datasets[datasetIndex].label?.toLowerCase() || '';
            if (label.includes('moisture')) return r.soil_moisture;
            if (label.includes('temperature') || label.includes('temp')) return r.temperature_c;
            if (label.includes('humidity')) return r.air_humidity;
            if (label.includes('pump')) return r.pump_on ? 1 : 0;
            return r.soil_moisture; // fallback
        });
    }

    chart.update('none');
}

// ----------------------------------------------------------------
// Destroy chart safely
// ----------------------------------------------------------------
export function destroyChart(chart) {
    if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
    }
    return null;
}

// ----------------------------------------------------------------
// Update charts on theme change
// ----------------------------------------------------------------
export function setupThemeWatcher(charts) {
    window.addEventListener('themechange', () => {
        applyChartDefaults();
        Object.values(charts).forEach(chart => {
            if (chart && chart.options) {
                // Update grid and text colors
                const scales = chart.options.scales || {};
                Object.values(scales).forEach(scale => {
                    if (scale.grid) scale.grid.color = getGridColor();
                    if (scale.ticks) scale.ticks.color = getTextColor();
                    if (scale.title) scale.title.color = getTextColor();
                });
                chart.update();
            }
        });
    });
}
