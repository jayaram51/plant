// ================================================================
// Smart Plant Monitoring — Sensor Service Layer
// Handles Firebase Realtime Database reads, listeners, & processing
// ================================================================

import { db, DB_PATHS, ref, onValue, off, get, query, limitToLast } from './firebase-config.js';

// Active listeners and caches
let _latestData = null;
let _historyData = [];
const _latestListeners = [];
const _historyListeners = [];
let _latestRefUnsubscribe = null;
let _historyRefUnsubscribe = null;

// Threshold configuration for sensors
export const SENSOR_THRESHOLDS = {
    soil_moisture: {
        minOptimal: 30,
        maxOptimal: 65,
        unit: '%',
        getStatus(val) {
            if (val == null || isNaN(val)) return { label: 'No Data', class: 'neutral', color: '#94a3b8' };
            if (val < 30) return { label: 'Dry', class: 'danger', color: '#ef4444', desc: 'Soil requires hydration' };
            if (val <= 65) return { label: 'Normal', class: 'success', color: '#10b981', desc: 'Moisture level optimal' };
            return { label: 'Wet', class: 'warning', color: '#f59e0b', desc: 'Soil saturation high' };
        }
    },
    temperature_c: {
        minOptimal: 18,
        maxOptimal: 28,
        unit: '°C',
        getStatus(val) {
            if (val == null || isNaN(val)) return { label: 'No Data', class: 'neutral', color: '#94a3b8' };
            if (val < 18) return { label: 'Low', class: 'info', color: '#3b82f6', desc: 'Cooler than optimal' };
            if (val <= 28) return { label: 'Normal', class: 'success', color: '#10b981', desc: 'Optimal growing temperature' };
            return { label: 'High', class: 'danger', color: '#ef4444', desc: 'Heat stress warning' };
        }
    },
    air_humidity: {
        minOptimal: 40,
        maxOptimal: 70,
        unit: '%',
        getStatus(val) {
            if (val == null || isNaN(val)) return { label: 'No Data', class: 'neutral', color: '#94a3b8' };
            if (val < 40) return { label: 'Low', class: 'warning', color: '#f59e0b', desc: 'Air is dry' };
            if (val <= 70) return { label: 'Normal', class: 'success', color: '#10b981', desc: 'Balanced humidity' };
            return { label: 'High', class: 'info', color: '#3b82f6', desc: 'Elevated ambient humidity' };
        }
    },
    pump: {
        getStatus(val) {
            if (val === true) return { label: 'Active', class: 'success', color: '#10b981', state: 'ON' };
            if (val === false) return { label: 'Idle', class: 'neutral', color: '#64748b', state: 'OFF' };
            return { label: 'Unknown', class: 'neutral', color: '#94a3b8', state: '--' };
        }
    }
};

/**
 * Normalizes timestamps to JavaScript epoch milliseconds.
 * Sensors might write timestamps in seconds (10 digits) or milliseconds (13 digits).
 */
export function normalizeTimestamp(raw) {
    if (!raw) return null;
    const num = Number(raw);
    if (isNaN(num)) return null;
    // If timestamp is in seconds (< 10^11), multiply by 1000
    if (num < 100000000000) {
        return num * 1000;
    }
    return num;
}

/**
 * Validates and sanitizes a sensor record
 */
export function sanitizeRecord(raw, key = null) {
    if (!raw || typeof raw !== 'object') return null;

    const moisture = raw.soil_moisture != null ? Number(raw.soil_moisture) : null;
    const temp = raw.temperature_c != null ? Number(Number(raw.temperature_c).toFixed(1)) : null;
    const humidity = raw.air_humidity != null ? Number(Number(raw.air_humidity).toFixed(1)) : null;
    const pump = typeof raw.pump_on === 'boolean' ? raw.pump_on : (raw.pump_on === 1 ? true : (raw.pump_on === 0 ? false : null));
    const timestamp = normalizeTimestamp(raw.timestamp);
    const uptime = raw.uptime_ms != null ? Number(raw.uptime_ms) : null;

    return {
        id: key || raw.id || (timestamp ? String(timestamp) : Math.random().toString(36).substring(2, 9)),
        soil_moisture: moisture,
        soil_raw: raw.soil_raw != null ? Number(raw.soil_raw) : null,
        temperature_c: temp,
        air_humidity: humidity,
        pump_on: pump,
        timestamp: timestamp,
        uptime_ms: uptime
    };
}

/**
 * Subscribes to real-time updates from /plant/latest
 */
export function subscribeToLatest(callback) {
    _latestListeners.push(callback);
    // Immediately emit cached if exists
    if (_latestData) {
        callback(_latestData);
    }

    if (!_latestRefUnsubscribe) {
        const latestRef = ref(db, DB_PATHS.LATEST);
        const unsubscribe = onValue(latestRef, (snapshot) => {
            const val = snapshot.val();
            _latestData = sanitizeRecord(val);
            _latestListeners.forEach(cb => {
                try { cb(_latestData); } catch (e) { console.error('Latest listener error:', e); }
            });
        }, (err) => {
            console.error('Firebase error on /plant/latest:', err);
            _latestListeners.forEach(cb => {
                try { cb(null, err); } catch (e) { console.error(e); }
            });
        });

        _latestRefUnsubscribe = () => off(latestRef);
    }

    return () => {
        const idx = _latestListeners.indexOf(callback);
        if (idx > -1) _latestListeners.splice(idx, 1);
        if (_latestListeners.length === 0 && _latestRefUnsubscribe) {
            _latestRefUnsubscribe();
            _latestRefUnsubscribe = null;
        }
    };
}

/**
 * Subscribes to /plant/history records
 */
export function subscribeToHistory(callback) {
    _historyListeners.push(callback);
    if (_historyData.length > 0) {
        callback(_historyData);
    }

    if (!_historyRefUnsubscribe) {
        const historyRef = ref(db, DB_PATHS.HISTORY);
        const unsubscribe = onValue(historyRef, (snapshot) => {
            const val = snapshot.val();
            const list = [];
            if (val && typeof val === 'object') {
                Object.entries(val).forEach(([key, rec]) => {
                    const cleaned = sanitizeRecord(rec, key);
                    if (cleaned) list.push(cleaned);
                });
            }
            // Sort ascending by timestamp
            list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            _historyData = list;
            _historyListeners.forEach(cb => {
                try { cb(_historyData); } catch (e) { console.error('History listener error:', e); }
            });
        }, (err) => {
            console.error('Firebase error on /plant/history:', err);
            _historyListeners.forEach(cb => {
                try { cb([], err); } catch (e) { console.error(e); }
            });
        });

        _historyRefUnsubscribe = () => off(historyRef);
    }

    return () => {
        const idx = _historyListeners.indexOf(callback);
        if (idx > -1) _historyListeners.splice(idx, 1);
        if (_historyListeners.length === 0 && _historyRefUnsubscribe) {
            _historyRefUnsubscribe();
            _historyRefUnsubscribe = null;
        }
    };
}

/**
 * One-time fetch of historical records
 */
export async function fetchHistory() {
    try {
        const historyRef = ref(db, DB_PATHS.HISTORY);
        const snap = await get(historyRef);
        const val = snap.val();
        const list = [];
        if (val && typeof val === 'object') {
            Object.entries(val).forEach(([key, rec]) => {
                const cleaned = sanitizeRecord(rec, key);
                if (cleaned) list.push(cleaned);
            });
        }
        list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        _historyData = list;
        return list;
    } catch (err) {
        console.error('Fetch history failed:', err);
        return [];
    }
}

/**
 * Filters history records by time duration
 * range: '24h' | '7d' | '30d' | 'all'
 */
export function filterHistoryByRange(records, range = '24h') {
    if (!records || records.length === 0) return [];
    if (range === 'all') return records;

    const rangeMs = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
    }[range] || (24 * 60 * 60 * 1000);

    const now = Date.now();
    const cutoff = now - rangeMs;
    const filtered = records.filter(r => r.timestamp && r.timestamp >= cutoff);
    
    // If timestamp filter returned no records because records are older than now,
    // fallback gracefully to the most recent N records corresponding to range
    if (filtered.length === 0 && records.length > 0) {
        const sliceCount = range === '24h' ? 24 : (range === '7d' ? 50 : 100);
        return records.slice(-sliceCount);
    }

    return filtered;
}

/**
 * Calculates summary statistics for numeric array
 */
export function calculateStats(values) {
    const valid = values.filter(v => v != null && !isNaN(v));
    if (valid.length === 0) {
        return { min: null, max: null, avg: null, count: 0 };
    }
    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const sum = valid.reduce((acc, curr) => acc + curr, 0);
    const avg = Number((sum / valid.length).toFixed(1));
    return { min, max, avg, count: valid.length };
}

/**
 * Evaluates active alerts based on latest sensor data
 */
export function evaluateAlerts(data) {
    if (!data) return [];
    const alerts = [];

    // Soil Moisture check
    if (data.soil_moisture != null) {
        if (data.soil_moisture < 25) {
            alerts.push({
                type: 'critical',
                title: 'Critically Dry Soil',
                message: `Soil moisture dropped to ${data.soil_moisture}%. Urgent irrigation recommended.`,
                timestamp: data.timestamp || Date.now(),
                parameter: 'soil_moisture'
            });
        } else if (data.soil_moisture < 30) {
            alerts.push({
                type: 'warning',
                title: 'Low Soil Moisture',
                message: `Soil moisture is at ${data.soil_moisture}%, below the 30% optimal threshold.`,
                timestamp: data.timestamp || Date.now(),
                parameter: 'soil_moisture'
            });
        } else if (data.soil_moisture > 75) {
            alerts.push({
                type: 'warning',
                title: 'Excessive Soil Moisture',
                message: `Moisture level is high (${data.soil_moisture}%). Risk of root oversaturation.`,
                timestamp: data.timestamp || Date.now(),
                parameter: 'soil_moisture'
            });
        }
    }

    // Temperature check
    if (data.temperature_c != null) {
        if (data.temperature_c > 33) {
            alerts.push({
                type: 'critical',
                title: 'High Ambient Temperature',
                message: `Temperature reached ${data.temperature_c}°C. Risk of heat stress and rapid drying.`,
                timestamp: data.timestamp || Date.now(),
                parameter: 'temperature_c'
            });
        } else if (data.temperature_c < 14) {
            alerts.push({
                type: 'warning',
                title: 'Cold Temperature Warning',
                message: `Temperature is ${data.temperature_c}°C. Plant growth rates may decelerate.`,
                timestamp: data.timestamp || Date.now(),
                parameter: 'temperature_c'
            });
        }
    }

    // Humidity check
    if (data.air_humidity != null) {
        if (data.air_humidity < 35) {
            alerts.push({
                type: 'info',
                title: 'Low Ambient Humidity',
                message: `Air humidity is dry at ${data.air_humidity}%. Consider misting foliage.`,
                timestamp: data.timestamp || Date.now(),
                parameter: 'air_humidity'
            });
        }
    }

    return alerts;
}

/**
 * Formats relative time (e.g., "12s ago", "3m ago", "2h ago")
 */
export function formatRelativeTime(timestamp) {
    if (!timestamp) return 'No timestamp';
    const now = Date.now();
    const diff = Math.max(0, now - timestamp);
    const secs = Math.floor(diff / 1000);
    if (secs < 10) return 'Just now';
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}
