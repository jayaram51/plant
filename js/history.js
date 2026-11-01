// ================================================================
// Smart Plant Monitoring — Plant History Controller
// Interactive historical table, pagination, search, & CSV export
// ================================================================

import { 
    subscribeToHistory, filterHistoryByRange, calculateStats, 
    SENSOR_THRESHOLDS, formatRelativeTime 
} from './sensor-service.js';
import { 
    renderMoistureChart, renderTemperatureChart, 
    renderHumidityChart, updateAllChartsForRange 
} from './charts.js';
import { DEFAULT_PLANT_PROFILE, assessPlantHealth } from './plant-service.js';

let _allRecords = [];
let _filteredRecords = [];
let _activeRange = '24h';
let _searchQuery = '';
let _currentPage = 1;
const _pageSize = 15;

/**
 * Initializes the Plant History Page
 */
export function initHistoryPage() {
    setupRangeButtons();
    setupSearchInput();
    setupExportButton();

    subscribeToHistory((records, error) => {
        if (error) {
            console.error('History subscribe error:', error);
            return;
        }
        _allRecords = records;
        applyFiltersAndRender();
    });
}

function setupRangeButtons() {
    const buttons = document.querySelectorAll('.history-range-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            _activeRange = btn.dataset.range || '24h';
            _currentPage = 1;
            applyFiltersAndRender();
        });
    });
}

function setupSearchInput() {
    const searchInput = document.getElementById('history-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            _searchQuery = e.target.value.toLowerCase().trim();
            _currentPage = 1;
            applyFiltersAndRender(false); // Don't re-render charts on simple text filter
        });
    }
}

function setupExportButton() {
    const exportBtn = document.getElementById('export-history-csv-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToCsv);
    }
}

function applyFiltersAndRender(updateCharts = true) {
    // 1. Filter by time range
    let rangeFiltered = filterHistoryByRange(_allRecords, _activeRange);

    // 2. Filter by search query if any (e.g. date string or status)
    if (_searchQuery) {
        rangeFiltered = rangeFiltered.filter(r => {
            const timeStr = r.timestamp ? new Date(r.timestamp).toLocaleString().toLowerCase() : '';
            return timeStr.includes(_searchQuery) ||
                   (r.soil_moisture && String(r.soil_moisture).includes(_searchQuery)) ||
                   (r.temperature_c && String(r.temperature_c).includes(_searchQuery)) ||
                   (r.air_humidity && String(r.air_humidity).includes(_searchQuery));
        });
    }

    _filteredRecords = rangeFiltered;

    // 3. Update summary statistics cards
    updateSummaryStats(rangeFiltered);

    // 4. Update the 3 interactive charts
    if (updateCharts) {
        renderMoistureChart('chart-moisture', _allRecords, _activeRange);
        renderTemperatureChart('chart-temperature', _allRecords, _activeRange);
        renderHumidityChart('chart-humidity', _allRecords, _activeRange);
    }

    // 5. Update table with pagination
    renderHistoryTable();
}

function updateSummaryStats(records) {
    const moistureStats = calculateStats(records.map(r => r.soil_moisture));
    const tempStats = calculateStats(records.map(r => r.temperature_c));
    const humStats = calculateStats(records.map(r => r.air_humidity));

    updateStatDisplay('moisture', moistureStats, '%');
    updateStatDisplay('temp', tempStats, '°C');
    updateStatDisplay('hum', humStats, '%');

    const countEl = document.getElementById('total-records-count');
    if (countEl) countEl.textContent = `${records.length} records in selected period`;
}

function updateStatDisplay(prefix, stats, unit) {
    const avgEl = document.getElementById(`stat-${prefix}-avg`);
    const minEl = document.getElementById(`stat-${prefix}-min`);
    const maxEl = document.getElementById(`stat-${prefix}-max`);

    if (avgEl) avgEl.textContent = stats.avg != null ? `${stats.avg}${unit}` : '—';
    if (minEl) minEl.textContent = stats.min != null ? `${stats.min}${unit}` : '—';
    if (maxEl) maxEl.textContent = stats.max != null ? `${stats.max}${unit}` : '—';
}

function renderHistoryTable() {
    const tbody = document.getElementById('history-table-tbody');
    const paginationContainer = document.getElementById('history-pagination');
    if (!tbody) return;

    if (_filteredRecords.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-5">No records match the selected time filter or search query.</td></tr>`;
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    // Newest records first in history table
    const reversed = [..._filteredRecords].reverse();
    const totalPages = Math.ceil(reversed.length / _pageSize);
    if (_currentPage > totalPages) _currentPage = totalPages;

    const startIdx = (_currentPage - 1) * _pageSize;
    const pageItems = reversed.slice(startIdx, startIdx + _pageSize);

    tbody.innerHTML = pageItems.map(r => {
        const d = r.timestamp ? new Date(r.timestamp) : null;
        const dateStr = d ? d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
        const timeStr = d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
        const mStatus = SENSOR_THRESHOLDS.soil_moisture.getStatus(r.soil_moisture);
        const tStatus = SENSOR_THRESHOLDS.temperature_c.getStatus(r.temperature_c);
        const hStatus = SENSOR_THRESHOLDS.air_humidity.getStatus(r.air_humidity);
        const health = assessPlantHealth(r, DEFAULT_PLANT_PROFILE);

        return `
            <tr>
                <td>
                    <div class="table-datetime">
                        <span class="font-medium">${timeStr}</span>
                        <span class="text-xs text-muted">${dateStr}</span>
                    </div>
                </td>
                <td>
                    <span class="metric-badge status-bg-${mStatus.class}">
                        ${r.soil_moisture != null ? `${r.soil_moisture}%` : '—'}
                    </span>
                    <span class="text-xs text-muted ms-1">(${mStatus.label})</span>
                </td>
                <td>
                    <span class="metric-badge status-bg-${tStatus.class}">
                        ${r.temperature_c != null ? `${r.temperature_c}°C` : '—'}
                    </span>
                    <span class="text-xs text-muted ms-1">(${tStatus.label})</span>
                </td>
                <td>
                    <span class="metric-badge status-bg-${hStatus.class}">
                        ${r.air_humidity != null ? `${r.air_humidity}%` : '—'}
                    </span>
                    <span class="text-xs text-muted ms-1">(${hStatus.label})</span>
                </td>
                <td>
                    <span class="status-pill status-${r.pump_on ? 'success' : 'neutral'} text-xs">
                        ${r.pump_on ? 'ACTIVE' : 'IDLE'}
                    </span>
                </td>
                <td>
                    <span class="status-pill status-${health.statusClass} text-xs">
                        ${health.status}
                    </span>
                </td>
            </tr>
        `;
    }).join('');

    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const container = document.getElementById('history-pagination');
    if (!container) return;
    if (totalPages <= 1) {
        container.innerHTML = `<span class="text-xs text-muted">Showing all ${_filteredRecords.length} records</span>`;
        return;
    }

    container.innerHTML = `
        <div class="pagination-info text-xs text-muted">
            Page ${_currentPage} of ${totalPages} (${_filteredRecords.length} total records)
        </div>
        <div class="pagination-buttons">
            <button class="sp-btn sp-btn-secondary sp-btn-sm" id="prev-page-btn" ${_currentPage === 1 ? 'disabled' : ''}>
                <i data-lucide="chevron-left" class="icon-sm"></i> Prev
            </button>
            <button class="sp-btn sp-btn-secondary sp-btn-sm" id="next-page-btn" ${_currentPage === totalPages ? 'disabled' : ''}>
                Next <i data-lucide="chevron-right" class="icon-sm"></i>
            </button>
        </div>
    `;

    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (_currentPage > 1) {
                _currentPage--;
                renderHistoryTable();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (_currentPage < totalPages) {
                _currentPage++;
                renderHistoryTable();
            }
        });
    }

    if (window.lucide) window.lucide.createIcons();
}

function exportToCsv() {
    if (_filteredRecords.length === 0) {
        alert('No records available to export.');
        return;
    }

    const headers = ['Timestamp', 'ISO Date', 'Soil Moisture (%)', 'Temperature (°C)', 'Air Humidity (%)', 'Water Pump Active'];
    const rows = _filteredRecords.map(r => {
        const iso = r.timestamp ? new Date(r.timestamp).toISOString() : '';
        const timeStr = r.timestamp ? `"${new Date(r.timestamp).toLocaleString()}"` : '';
        return [
            r.timestamp || '',
            iso,
            r.soil_moisture != null ? r.soil_moisture : '',
            r.temperature_c != null ? r.temperature_c : '',
            r.air_humidity != null ? r.air_humidity : '',
            r.pump_on ? 'TRUE' : 'FALSE'
        ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `plant_monitoring_history_${_activeRange}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
