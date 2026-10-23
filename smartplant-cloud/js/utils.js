// ================================================================
// SmartPlant Cloud — Shared Utilities
// ================================================================

import { onConnectionChange } from './firebase-config.js';

// ----------------------------------------------------------------
// App State
// ----------------------------------------------------------------
let _isDemoMode = false;
let _demoType = null; // 'local' or 'firebase'
let _sidebarCollapsed = localStorage.getItem('sp_sidebar_collapsed') === 'true';
let _currentTheme = localStorage.getItem('sp_theme') || 'light';

// ----------------------------------------------------------------
// Theme Management
// ----------------------------------------------------------------
export function initTheme() {
    const saved = localStorage.getItem('sp_theme');
    _currentTheme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', _currentTheme);
}

export function toggleTheme() {
    _currentTheme = _currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', _currentTheme);
    localStorage.setItem('sp_theme', _currentTheme);
    // Dispatch event for charts to update
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: _currentTheme } }));
}

export function getTheme() {
    return _currentTheme;
}

// ----------------------------------------------------------------
// Demo Mode
// ----------------------------------------------------------------
export function setDemoMode(active, type = 'local') {
    _isDemoMode = active;
    _demoType = active ? type : null;
    const banner = document.getElementById('demo-banner');
    if (banner) {
        banner.style.display = active ? 'flex' : 'none';
    }
    sessionStorage.setItem('sp_demo_mode', active ? type : '');
}

export function isDemoMode() {
    return _isDemoMode;
}

export function getDemoType() {
    return _demoType;
}

export function checkDemoSession() {
    const saved = sessionStorage.getItem('sp_demo_mode');
    if (saved) {
        setDemoMode(true, saved);
        return saved;
    }
    return null;
}

// ----------------------------------------------------------------
// Sidebar Rendering
// ----------------------------------------------------------------
const SIDEBAR_ITEMS = [
    { id: 'overview', label: 'Overview', icon: 'bi-grid-1x2', href: 'dashboard.html' },
    { id: 'monitoring', label: 'Live Monitoring', icon: 'bi-activity', href: 'dashboard.html#live' },
    { id: 'analytics', label: 'Sensor Analytics', icon: 'bi-graph-up', href: 'analytics.html' },
    { id: 'irrigation', label: 'Irrigation History', icon: 'bi-droplet-half', href: 'irrigation.html' },
    { id: 'devices', label: 'Plants & Devices', icon: 'bi-cpu', href: 'devices.html' },
    { id: 'reports', label: 'Reports & Export', icon: 'bi-file-earmark-bar-graph', href: 'reports.html' },
    { id: 'notifications', label: 'Notifications', icon: 'bi-bell', href: 'reports.html#notifications', badge: null },
    { id: 'settings', label: 'Settings', icon: 'bi-gear', href: 'settings.html' },
    { id: 'help', label: 'Help & Docs', icon: 'bi-question-circle', href: '#help' },
];

export function renderSidebar(activeId) {
    const container = document.getElementById('sidebar');
    if (!container) return;

    const userEmail = sessionStorage.getItem('sp_user_email') || 'user@example.com';
    const userName = sessionStorage.getItem('sp_user_name') || userEmail.split('@')[0];
    const userInitials = userName.substring(0, 2).toUpperCase();

    const mainItems = SIDEBAR_ITEMS.filter(item => !['settings', 'help'].includes(item.id));
    const bottomItems = SIDEBAR_ITEMS.filter(item => ['settings', 'help'].includes(item.id));

    container.innerHTML = `
        <div class="sidebar-brand">
            <div class="sidebar-brand-icon">
                <i class="bi bi-flower2"></i>
            </div>
            <div class="sidebar-brand-text">
                <span class="brand-name">SmartPlant</span>
                <span class="brand-tagline">Cloud Platform</span>
            </div>
        </div>
        <button class="sidebar-toggle" id="sidebar-toggle-btn" title="Toggle sidebar">
            <i class="bi bi-chevron-left"></i>
        </button>
        <nav class="sidebar-nav">
            <span class="sidebar-section-label">Main Menu</span>
            ${mainItems.map(item => `
                <a href="${item.href}" class="sidebar-item ${item.id === activeId ? 'active' : ''}" data-page="${item.id}">
                    <i class="bi ${item.icon}"></i>
                    <span class="item-label">${item.label}</span>
                    ${item.badge ? `<span class="sidebar-badge">${item.badge}</span>` : ''}
                </a>
            `).join('')}
            <span class="sidebar-section-label" style="margin-top: 8px;">System</span>
            ${bottomItems.map(item => `
                <a href="${item.href}" class="sidebar-item ${item.id === activeId ? 'active' : ''}" data-page="${item.id}">
                    <i class="bi ${item.icon}"></i>
                    <span class="item-label">${item.label}</span>
                </a>
            `).join('')}
        </nav>
        <div class="sidebar-footer">
            <div class="sidebar-user" id="sidebar-user-menu">
                <div class="sidebar-user-avatar">${userInitials}</div>
                <div class="sidebar-user-info">
                    <div class="sidebar-user-name">${userName}</div>
                    <div class="sidebar-user-email">${userEmail}</div>
                </div>
            </div>
        </div>
    `;

    // Apply collapsed state
    const layout = document.querySelector('.app-layout');
    if (_sidebarCollapsed && layout) {
        layout.classList.add('sidebar-collapsed');
    }

    // Toggle button
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            _sidebarCollapsed = !_sidebarCollapsed;
            layout?.classList.toggle('sidebar-collapsed', _sidebarCollapsed);
            localStorage.setItem('sp_sidebar_collapsed', _sidebarCollapsed);
            const icon = toggleBtn.querySelector('i');
            icon.className = _sidebarCollapsed ? 'bi bi-chevron-right' : 'bi bi-chevron-left';
        });
    }

    // Help link handler
    const helpLink = container.querySelector('[data-page="help"]');
    if (helpLink) {
        helpLink.addEventListener('click', (e) => {
            e.preventDefault();
            showHelpModal();
        });
    }
}

// ----------------------------------------------------------------
// Top Navigation Rendering
// ----------------------------------------------------------------
export function renderTopnav(pageTitle, breadcrumbs = []) {
    const container = document.getElementById('topnav');
    if (!container) return;

    const breadcrumbHtml = breadcrumbs.length > 0 ?
        `<div class="topnav-breadcrumbs">
            <a href="dashboard.html">Home</a>
            ${breadcrumbs.map((b, i) =>
                `<span class="separator"><i class="bi bi-chevron-right"></i></span>
                 ${i === breadcrumbs.length - 1
                    ? `<span class="current">${b.label}</span>`
                    : `<a href="${b.href || '#'}">${b.label}</a>`
                }`
            ).join('')}
        </div>` : '';

    container.innerHTML = `
        <div class="topnav-left">
            <button class="topnav-hamburger" id="mobile-menu-btn" aria-label="Toggle menu">
                <i class="bi bi-list"></i>
            </button>
            <div>
                <div class="topnav-title">${pageTitle}</div>
                ${breadcrumbHtml}
            </div>
        </div>
        <div class="topnav-right">
            <div class="date-range-picker" id="global-date-filter">
                <button class="drp-btn active" data-range="1h">1H</button>
                <button class="drp-btn" data-range="24h">24H</button>
                <button class="drp-btn" data-range="7d">7D</button>
                <button class="drp-btn" data-range="30d">30D</button>
            </div>
            <div class="firebase-status connecting" id="firebase-status-chip">
                <span class="status-dot"></span>
                <span class="status-label">Connecting</span>
            </div>
            <button class="topnav-btn" id="theme-toggle-btn" title="Toggle theme">
                <i class="bi bi-moon"></i>
            </button>
            <button class="topnav-btn" id="notification-btn" title="Notifications">
                <i class="bi bi-bell"></i>
            </button>
            <button class="topnav-btn" id="logout-btn" title="Sign Out">
                <i class="bi bi-box-arrow-right"></i>
            </button>
        </div>
    `;

    // Mobile menu toggle
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (mobileBtn && sidebar) {
        mobileBtn.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
            overlay?.classList.toggle('active');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar?.classList.remove('mobile-open');
            overlay.classList.remove('active');
        });
    }

    // Theme toggle
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
        updateThemeIcon(themeBtn);
        themeBtn.addEventListener('click', () => {
            toggleTheme();
            updateThemeIcon(themeBtn);
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                const { signOut, auth } = await import('./firebase-config.js');
                await signOut(auth);
            } catch (e) { /* ignore */ }
            sessionStorage.clear();
            setDemoMode(false);
            window.location.href = 'index.html';
        });
    }

    // Firebase connection status
    onConnectionChange((connected) => {
        updateFirebaseStatus(connected);
    });

    // Date range filter
    initDateRangeFilter();

    // Notification button
    const notifBtn = document.getElementById('notification-btn');
    if (notifBtn) {
        notifBtn.addEventListener('click', () => {
            window.location.href = 'reports.html#notifications';
        });
    }
}

function updateThemeIcon(btn) {
    const icon = btn.querySelector('i');
    icon.className = _currentTheme === 'dark' ? 'bi bi-sun' : 'bi bi-moon';
}

function updateFirebaseStatus(connected) {
    const chip = document.getElementById('firebase-status-chip');
    if (!chip) return;

    if (_isDemoMode && _demoType === 'local') {
        chip.className = 'firebase-status';
        chip.innerHTML = `<span class="status-dot" style="background: var(--color-warning)"></span><span class="status-label">Demo</span>`;
        return;
    }

    chip.className = `firebase-status ${connected ? 'online' : 'offline'}`;
    chip.innerHTML = `
        <span class="status-dot"></span>
        <span class="status-label">${connected ? 'Connected' : 'Offline'}</span>
    `;
}

// ----------------------------------------------------------------
// Date Range Filter
// ----------------------------------------------------------------
let _currentDateRange = '24h';
const _dateRangeListeners = [];

function initDateRangeFilter() {
    const container = document.getElementById('global-date-filter');
    if (!container) return;

    container.querySelectorAll('.drp-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.drp-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            _currentDateRange = btn.dataset.range;
            _dateRangeListeners.forEach(cb => cb(_currentDateRange));
        });
    });
}

export function onDateRangeChange(callback) {
    _dateRangeListeners.push(callback);
    return () => {
        const idx = _dateRangeListeners.indexOf(callback);
        if (idx > -1) _dateRangeListeners.splice(idx, 1);
    };
}

export function getCurrentDateRange() {
    return _currentDateRange;
}

export function getDateRangeMs(range) {
    const ranges = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
    };
    return ranges[range] || ranges['24h'];
}

// ----------------------------------------------------------------
// Formatting Utilities
// ----------------------------------------------------------------
export function formatDate(timestamp) {
    if (!timestamp || isNaN(timestamp)) return '—';
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

export function formatTime(timestamp) {
    if (!timestamp || isNaN(timestamp)) return '—';
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}

export function formatDateTime(timestamp) {
    if (!timestamp || isNaN(timestamp)) return '—';
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

export function formatRelativeTime(timestamp) {
    if (!timestamp || isNaN(timestamp)) return 'Unknown';
    const diff = Date.now() - timestamp;
    if (diff < 0) return 'Just now';

    const seconds = Math.floor(diff / 1000);
    if (seconds < 5) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export function formatDuration(ms) {
    if (!ms || isNaN(ms)) return '—';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
}

// ----------------------------------------------------------------
// Data Validation & Status
// ----------------------------------------------------------------
export function getMoistureStatus(value) {
    if (value === null || value === undefined) return { label: 'Unknown', class: 'status-info', color: '#94a3b8' };
    if (value < 30) return { label: 'Dry', class: 'status-danger', color: '#ef4444' };
    if (value < 60) return { label: 'Normal', class: 'status-normal', color: '#10b981' };
    return { label: 'Wet', class: 'status-warning', color: '#f59e0b' };
}

export function getTemperatureStatus(value) {
    if (value === null || value === undefined) return { label: 'Unknown', class: 'status-info', color: '#94a3b8' };
    if (value < 10) return { label: 'Cold', class: 'status-info', color: '#3b82f6' };
    if (value < 20) return { label: 'Cool', class: 'status-info', color: '#06b6d4' };
    if (value < 30) return { label: 'Normal', class: 'status-normal', color: '#10b981' };
    if (value < 35) return { label: 'Warm', class: 'status-warning', color: '#f59e0b' };
    return { label: 'Hot', class: 'status-danger', color: '#ef4444' };
}

export function getHumidityStatus(value) {
    if (value === null || value === undefined) return { label: 'Unknown', class: 'status-info', color: '#94a3b8' };
    if (value < 30) return { label: 'Low', class: 'status-warning', color: '#f59e0b' };
    if (value < 60) return { label: 'Normal', class: 'status-normal', color: '#10b981' };
    return { label: 'High', class: 'status-info', color: '#3b82f6' };
}

export function getPumpStatus(value) {
    if (value === true || value === 1) return { label: 'ON', class: 'status-normal', color: '#10b981' };
    if (value === false || value === 0) return { label: 'OFF', class: 'status-info', color: '#94a3b8' };
    return { label: 'Unknown', class: 'status-warning', color: '#f59e0b' };
}

export function getDataFreshness(timestamp) {
    if (!timestamp) return { status: 'unknown', label: 'No data', class: 'unknown' };
    const age = Date.now() - timestamp;
    if (age < 60000) return { status: 'fresh', label: 'Live', class: 'fresh' };
    if (age < 300000) return { status: 'recent', label: formatRelativeTime(timestamp), class: 'fresh' };
    if (age < 3600000) return { status: 'stale', label: formatRelativeTime(timestamp), class: 'stale' };
    return { status: 'old', label: formatRelativeTime(timestamp), class: 'old' };
}

export function isValidReading(data) {
    if (!data || typeof data !== 'object') return false;
    return data.hasOwnProperty('soil_moisture') ||
           data.hasOwnProperty('temperature_c') ||
           data.hasOwnProperty('air_humidity');
}

export function sanitizeReading(data) {
    if (!data) return null;
    return {
        soil_moisture: typeof data.soil_moisture === 'number' ? data.soil_moisture : null,
        soil_raw: typeof data.soil_raw === 'number' ? data.soil_raw : null,
        temperature_c: typeof data.temperature_c === 'number' ? data.temperature_c : null,
        air_humidity: typeof data.air_humidity === 'number' ? data.air_humidity : null,
        pump_on: typeof data.pump_on === 'boolean' ? data.pump_on : null,
        timestamp: typeof data.timestamp === 'number' ? data.timestamp : null,
        uptime_ms: typeof data.uptime_ms === 'number' ? data.uptime_ms : null,
        _isDemo: data._isDemo || false
    };
}

// ----------------------------------------------------------------
// CSV Export
// ----------------------------------------------------------------
export function exportToCsv(data, filename = 'smartplant_export.csv') {
    if (!data || data.length === 0) {
        showToast('No data to export', 'warning');
        return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    data.forEach(row => {
        const values = headers.map(h => {
            let val = row[h];
            if (val === null || val === undefined) val = '';
            if (typeof val === 'string' && val.includes(',')) val = `"${val}"`;
            if (h === 'timestamp' && typeof val === 'number') {
                val = new Date(val).toISOString();
            }
            return val;
        });
        csvRows.push(values.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Exported ${data.length} records to ${filename}`, 'success');
}

// ----------------------------------------------------------------
// Toast Notifications
// ----------------------------------------------------------------
let _toastContainer = null;

export function showToast(message, type = 'info', duration = 4000) {
    if (!_toastContainer) {
        _toastContainer = document.getElementById('toast-container');
        if (!_toastContainer) {
            _toastContainer = document.createElement('div');
            _toastContainer.id = 'toast-container';
            _toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
            _toastContainer.style.zIndex = 'var(--z-toast, 200)';
            document.body.appendChild(_toastContainer);
        }
    }

    const icons = {
        success: 'bi-check-circle-fill',
        danger: 'bi-exclamation-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        info: 'bi-info-circle-fill'
    };

    const toast = document.createElement('div');
    toast.className = `sp-toast sp-toast-${type}`;
    toast.innerHTML = `
        <i class="sp-toast-icon bi ${icons[type] || icons.info}"></i>
        <span class="sp-toast-message">${message}</span>
        <button class="sp-toast-close" aria-label="Close">
            <i class="bi bi-x"></i>
        </button>
    `;

    _toastContainer.appendChild(toast);

    const closeBtn = toast.querySelector('.sp-toast-close');
    closeBtn.addEventListener('click', () => removeToast(toast));

    if (duration > 0) {
        setTimeout(() => removeToast(toast), duration);
    }

    return toast;
}

function removeToast(toast) {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 250);
}

// ----------------------------------------------------------------
// Help Modal
// ----------------------------------------------------------------
function showHelpModal() {
    const existing = document.getElementById('help-modal-backdrop');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'help-modal-backdrop';
    backdrop.className = 'sp-modal-backdrop';
    backdrop.innerHTML = `
        <div class="sp-modal" style="max-width: 560px;">
            <div class="sp-modal-header">
                <span class="sp-modal-title"><i class="bi bi-question-circle me-2"></i>Help & Documentation</span>
                <button class="sp-modal-close" id="close-help-modal"><i class="bi bi-x-lg"></i></button>
            </div>
            <div class="sp-modal-body">
                <h4 class="mb-12">Getting Started</h4>
                <div class="sp-alert sp-alert-info mb-16">
                    <i class="bi bi-lightbulb"></i>
                    <span>SmartPlant Cloud connects to your ESP32 IoT device to monitor plant health in real-time.</span>
                </div>
                <h5 class="mb-8">Features</h5>
                <ul style="padding-left: 20px; margin-bottom: 16px; color: var(--color-text-secondary); font-size: 0.8125rem; line-height: 1.8;">
                    <li>Real-time soil moisture, temperature, and humidity monitoring</li>
                    <li>Interactive charts and analytics</li>
                    <li>Pump activation history and irrigation tracking</li>
                    <li>CSV data export</li>
                    <li>Configurable alerts and thresholds</li>
                    <li>Demo mode for testing without hardware</li>
                </ul>
                <h5 class="mb-8">ESP32 Setup</h5>
                <p class="text-sm text-secondary">Upload the Arduino sketch to your ESP32 with configured WiFi and Firebase credentials. The device will write sensor data to <code>/plant/latest</code> and <code>/plant/history</code> paths.</p>
                <h5 class="mb-8 mt-16">Demo Mode</h5>
                <p class="text-sm text-secondary">Use the demo mode from the login page to explore the dashboard with simulated data. Local demo uses in-browser data; Firebase demo writes to a separate <code>/demo/</code> path.</p>
            </div>
            <div class="sp-modal-footer">
                <button class="sp-btn sp-btn-secondary" id="close-help-btn">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(backdrop);

    backdrop.querySelector('#close-help-modal').addEventListener('click', () => backdrop.remove());
    backdrop.querySelector('#close-help-btn').addEventListener('click', () => backdrop.remove());
    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.remove();
    });
}

// ----------------------------------------------------------------
// Math / Statistics Utilities
// ----------------------------------------------------------------
export function calcStats(values) {
    const valid = values.filter(v => v !== null && v !== undefined && !isNaN(v));
    if (valid.length === 0) return { min: null, max: null, avg: null, count: 0 };
    return {
        min: Math.min(...valid),
        max: Math.max(...valid),
        avg: parseFloat((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1)),
        count: valid.length
    };
}

export function debounce(fn, ms) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), ms);
    };
}

// ----------------------------------------------------------------
// History Data Processing
// ----------------------------------------------------------------
export function filterHistoryByRange(history, range) {
    const ms = getDateRangeMs(range);
    const cutoff = Date.now() - ms;
    return history.filter(r => r.timestamp && r.timestamp >= cutoff);
}

export function historyToSortedArray(snapshot) {
    if (!snapshot) return [];
    const records = [];

    if (Array.isArray(snapshot)) {
        return snapshot.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    }

    // Firebase snapshot object
    if (typeof snapshot === 'object') {
        Object.keys(snapshot).forEach(key => {
            const record = snapshot[key];
            if (record && typeof record === 'object') {
                records.push(sanitizeReading({ ...record, _key: key }));
            }
        });
    }

    return records.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
}

export function groupByDay(records) {
    const groups = {};
    records.forEach(r => {
        if (!r.timestamp) return;
        const day = new Date(r.timestamp).toISOString().split('T')[0];
        if (!groups[day]) groups[day] = [];
        groups[day].push(r);
    });
    return groups;
}

export function getDailyAverages(records) {
    const groups = groupByDay(records);
    return Object.entries(groups).map(([day, recs]) => ({
        day,
        moisture: calcStats(recs.map(r => r.soil_moisture)),
        temperature: calcStats(recs.map(r => r.temperature_c)),
        humidity: calcStats(recs.map(r => r.air_humidity)),
        pumpActivations: recs.filter(r => r.pump_on === true).length,
        recordCount: recs.length
    })).sort((a, b) => a.day.localeCompare(b.day));
}

// ----------------------------------------------------------------
// Page Initialization
// ----------------------------------------------------------------
export function initPage(pageId, pageTitle, breadcrumbs) {
    initTheme();
    renderSidebar(pageId);
    renderTopnav(pageTitle, breadcrumbs);

    // Show demo banner if in demo mode
    const demoType = checkDemoSession();
    if (demoType) {
        setDemoMode(true, demoType);
    }

    // Demo banner close button
    const exitBtn = document.getElementById('exit-demo-btn');
    if (exitBtn) {
        exitBtn.addEventListener('click', () => {
            setDemoMode(false);
            sessionStorage.removeItem('sp_demo_mode');
            window.location.reload();
        });
    }
}
