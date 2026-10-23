// ================================================================
// SmartPlant Cloud — Firebase Configuration
// ================================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, onValue, off, get, set, push, remove, query, orderByChild, limitToLast, startAt, endAt, onDisconnect } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const firebaseConfig = {
    apiKey: "AIzaSyChA-oxmAt5zTVv_XpsOXzmwcNRpKWUw1Y",
    authDomain: "virushka-d2b72.firebaseapp.com",
    databaseURL: "https://virushka-d2b72-default-rtdb.firebaseio.com/",
    projectId: "virushka-d2b72",
    storageBucket: "virushka-d2b72.firebasestorage.app",
    messagingSenderId: "636226459349",
    appId: "1:636226459349:web:57cc6a204d71ddad3c745c",
    measurementId: "G-ZYXGF89YY6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Connection state tracking
let _isConnected = false;
const _connectionListeners = [];

function initConnectionMonitor() {
    const connRef = ref(db, '.info/connected');
    onValue(connRef, (snap) => {
        _isConnected = snap.val() === true;
        _connectionListeners.forEach(cb => {
            try { cb(_isConnected); } catch (e) { console.error('Connection listener error:', e); }
        });
    });
}

function onConnectionChange(callback) {
    _connectionListeners.push(callback);
    // Immediately notify with current state
    callback(_isConnected);
    return () => {
        const idx = _connectionListeners.indexOf(callback);
        if (idx > -1) _connectionListeners.splice(idx, 1);
    };
}

function isConnected() {
    return _isConnected;
}

// Initialize connection monitoring
initConnectionMonitor();

// Database path helpers
const DB_PATHS = {
    LATEST: 'plant/latest',
    HISTORY: 'plant/history',
    DEMO_LATEST: 'demo/plant/latest',
    DEMO_HISTORY: 'demo/plant/history',
    USER_SETTINGS: (uid) => `users/${uid}/settings`,
    USER_PLANTS: (uid) => `users/${uid}/plants`,
    USER_ALERTS: (uid) => `users/${uid}/alerts`,
};

// Export everything
export {
    app,
    db,
    auth,
    firebaseConfig,
    DB_PATHS,
    isConnected,
    onConnectionChange,
    // Re-export Firebase functions for convenience
    ref, onValue, off, get, set, push, remove,
    query, orderByChild, limitToLast, startAt, endAt,
    signInWithEmailAndPassword, createUserWithEmailAndPassword,
    signOut, onAuthStateChanged
};
