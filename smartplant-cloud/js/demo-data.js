// ================================================================
// SmartPlant Cloud — Demo Data Generator
// ================================================================

import { db, DB_PATHS, ref, set, push, remove, get } from './firebase-config.js';

// ----------------------------------------------------------------
// Local Demo Mode — In-memory sample data, no Firebase writes
// ----------------------------------------------------------------

function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

function generateDemoLatest() {
    const moisture = Math.round(randomBetween(30, 75));
    const temperature = parseFloat(randomBetween(20, 35).toFixed(1));
    const humidity = Math.round(randomBetween(40, 85));
    const pumpOn = moisture < 35;

    return {
        soil_moisture: moisture,
        soil_raw: Math.round(randomBetween(400, 900)),
        temperature_c: temperature,
        air_humidity: humidity,
        pump_on: pumpOn,
        timestamp: Date.now(),
        uptime_ms: Math.round(randomBetween(60000, 86400000)),
        _isDemo: true
    };
}

function generateDemoHistory(hoursBack = 24, intervalMinutes = 15) {
    const records = [];
    const now = Date.now();
    const totalPoints = Math.floor((hoursBack * 60) / intervalMinutes);

    // Base values with slight drift
    let baseMoisture = randomBetween(40, 60);
    let baseTemp = randomBetween(22, 28);
    let baseHumidity = randomBetween(50, 70);

    for (let i = totalPoints; i >= 0; i--) {
        const ts = now - (i * intervalMinutes * 60 * 1000);
        const hour = new Date(ts).getHours();

        // Simulate daily temperature cycle (cooler at night, warmer midday)
        const tempCycle = Math.sin((hour - 6) * Math.PI / 12) * 5;
        // Simulate humidity inversely
        const humCycle = -Math.sin((hour - 6) * Math.PI / 12) * 10;

        // Random walk for moisture
        baseMoisture += randomBetween(-2, 2);
        baseMoisture = Math.max(15, Math.min(90, baseMoisture));

        // Simulate pump activations when moisture is low
        const pumpOn = baseMoisture < 30;
        if (pumpOn) baseMoisture += randomBetween(5, 15);

        const moisture = Math.round(baseMoisture);
        const temperature = parseFloat((baseTemp + tempCycle + randomBetween(-0.5, 0.5)).toFixed(1));
        const humidity = Math.round(baseHumidity + humCycle + randomBetween(-3, 3));

        records.push({
            soil_moisture: Math.max(0, Math.min(100, moisture)),
            soil_raw: Math.round(randomBetween(300, 1000)),
            temperature_c: Math.max(-10, Math.min(50, temperature)),
            air_humidity: Math.max(0, Math.min(100, humidity)),
            pump_on: pumpOn,
            timestamp: ts,
            uptime_ms: Math.round(randomBetween(60000, 86400000)),
            _isDemo: true
        });
    }

    return records;
}

function generatePumpEvents(hoursBack = 168) {
    const events = [];
    const now = Date.now();
    const totalHours = hoursBack;
    let currentTime = now - (totalHours * 60 * 60 * 1000);

    while (currentTime < now) {
        // Random interval between pump events (2-12 hours)
        currentTime += randomBetween(2, 12) * 60 * 60 * 1000;
        if (currentTime >= now) break;

        const duration = Math.round(randomBetween(30, 300)); // 30s to 5min
        const moistureBefore = Math.round(randomBetween(15, 35));
        const moistureAfter = Math.round(moistureBefore + randomBetween(15, 35));

        events.push({
            timestamp: Math.round(currentTime),
            duration_seconds: duration,
            moisture_before: moistureBefore,
            moisture_after: Math.min(100, moistureAfter),
            trigger: moistureBefore < 25 ? 'auto' : 'manual',
            _isDemo: true
        });
    }

    return events;
}

// ----------------------------------------------------------------
// Local Demo Manager — manages in-memory demo state
// ----------------------------------------------------------------

class LocalDemoManager {
    constructor() {
        this.active = false;
        this.latest = null;
        this.history = [];
        this.pumpEvents = [];
        this._updateInterval = null;
        this._listeners = new Map();
    }

    start() {
        this.active = true;
        this.latest = generateDemoLatest();
        this.history = generateDemoHistory(48, 10);
        this.pumpEvents = generatePumpEvents(168);

        // Simulate real-time updates every 5 seconds
        this._updateInterval = setInterval(() => {
            this._simulateUpdate();
        }, 5000);

        this._notifyListeners('latest', this.latest);
        this._notifyListeners('history', this.history);
        this._notifyListeners('pumpEvents', this.pumpEvents);

        return this;
    }

    stop() {
        this.active = false;
        if (this._updateInterval) {
            clearInterval(this._updateInterval);
            this._updateInterval = null;
        }
        this.latest = null;
        this.history = [];
        this.pumpEvents = [];
        this._listeners.clear();
    }

    _simulateUpdate() {
        if (!this.active) return;

        const prev = this.latest;
        this.latest = {
            soil_moisture: Math.round(Math.max(0, Math.min(100, prev.soil_moisture + randomBetween(-3, 3)))),
            soil_raw: Math.round(randomBetween(300, 1000)),
            temperature_c: parseFloat((prev.temperature_c + randomBetween(-0.3, 0.3)).toFixed(1)),
            air_humidity: Math.round(Math.max(0, Math.min(100, prev.air_humidity + randomBetween(-2, 2)))),
            pump_on: prev.soil_moisture < 30,
            timestamp: Date.now(),
            uptime_ms: prev.uptime_ms + 5000,
            _isDemo: true
        };

        // Add to history
        this.history.push({ ...this.latest });

        // Keep only last 1000 records
        if (this.history.length > 1000) {
            this.history = this.history.slice(-1000);
        }

        this._notifyListeners('latest', this.latest);
        this._notifyListeners('history', this.history);
    }

    onData(type, callback) {
        if (!this._listeners.has(type)) {
            this._listeners.set(type, []);
        }
        this._listeners.get(type).push(callback);

        // Immediately fire with current data
        if (type === 'latest' && this.latest) callback(this.latest);
        if (type === 'history' && this.history.length) callback(this.history);
        if (type === 'pumpEvents' && this.pumpEvents.length) callback(this.pumpEvents);

        return () => {
            const listeners = this._listeners.get(type);
            if (listeners) {
                const idx = listeners.indexOf(callback);
                if (idx > -1) listeners.splice(idx, 1);
            }
        };
    }

    _notifyListeners(type, data) {
        const listeners = this._listeners.get(type) || [];
        listeners.forEach(cb => {
            try { cb(data); } catch (e) { console.error('Demo listener error:', e); }
        });
    }

    getHistory(filterHours = null) {
        if (!filterHours) return this.history;
        const cutoff = Date.now() - (filterHours * 60 * 60 * 1000);
        return this.history.filter(r => r.timestamp >= cutoff);
    }

    getPumpEvents(filterHours = null) {
        if (!filterHours) return this.pumpEvents;
        const cutoff = Date.now() - (filterHours * 60 * 60 * 1000);
        return this.pumpEvents.filter(e => e.timestamp >= cutoff);
    }
}

// ----------------------------------------------------------------
// Firebase Demo Mode — writes to separate /demo/ paths
// ----------------------------------------------------------------

class FirebaseDemoManager {
    constructor() {
        this.active = false;
    }

    async seedDemoData() {
        try {
            const latest = generateDemoLatest();
            const history = generateDemoHistory(24, 15);

            // Write latest to demo path
            await set(ref(db, DB_PATHS.DEMO_LATEST), latest);

            // Write history to demo path
            const historyRef = ref(db, DB_PATHS.DEMO_HISTORY);
            await remove(historyRef); // Clear existing demo data

            const promises = history.map(record => {
                const newRef = push(historyRef);
                return set(newRef, record);
            });

            await Promise.all(promises);
            this.active = true;

            return { success: true, recordCount: history.length };
        } catch (error) {
            console.error('Failed to seed demo data:', error);
            return { success: false, error: error.message };
        }
    }

    async clearDemoData() {
        try {
            await remove(ref(db, 'demo'));
            this.active = false;
            return { success: true };
        } catch (error) {
            console.error('Failed to clear demo data:', error);
            return { success: false, error: error.message };
        }
    }

    async hasDemoData() {
        try {
            const snap = await get(ref(db, DB_PATHS.DEMO_LATEST));
            return snap.exists();
        } catch {
            return false;
        }
    }
}

// Singleton instances
const localDemo = new LocalDemoManager();
const firebaseDemo = new FirebaseDemoManager();

export {
    localDemo,
    firebaseDemo,
    generateDemoLatest,
    generateDemoHistory,
    generatePumpEvents,
    LocalDemoManager,
    FirebaseDemoManager
};
