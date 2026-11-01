// ================================================================
// Smart Plant Monitoring — Firebase Configuration
// Preserves exact credentials and database architecture
// ================================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getDatabase, ref, onValue, off, get, set, push, remove, 
    query, orderByChild, limitToLast 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { 
    getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Exact Firebase project configuration (Preserved)
export const firebaseConfig = {
    apiKey: "AIzaSyChA-oxmAt5zTVv_XpsOXzmwcNRpKWUw1Y",
    authDomain: "virushka-d2b72.firebaseapp.com",
    databaseURL: "https://virushka-d2b72-default-rtdb.firebaseio.com/",
    projectId: "virushka-d2b72",
    storageBucket: "virushka-d2b72.firebasestorage.app",
    messagingSenderId: "636226459349",
    appId: "1:636226459349:web:57cc6a204d71ddad3c745c",
    measurementId: "G-ZYXGF89YY6"
};

// Initialize Firebase App, Database, and Auth
export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

// Standard Database Paths (Preserved)
export const DB_PATHS = {
    LATEST: 'plant/latest',
    HISTORY: 'plant/history',
    USER_SETTINGS: (uid) => `users/${uid}/settings`,
    USER_PLANTS: (uid) => `users/${uid}/plants`,
    USER_ALERTS: (uid) => `users/${uid}/alerts`
};

// Connection state tracking via Firebase RTDB .info/connected
let _isConnected = false;
const _connectionListeners = [];

function initConnectionMonitor() {
    try {
        const connRef = ref(db, '.info/connected');
        onValue(connRef, (snapshot) => {
            _isConnected = snapshot.val() === true;
            _connectionListeners.forEach(cb => {
                try { cb(_isConnected); } catch (e) { console.error('Connection listener error:', e); }
            });
        });
    } catch (err) {
        console.warn('Firebase connection monitor init error:', err);
    }
}

export function onConnectionChange(callback) {
    _connectionListeners.push(callback);
    callback(_isConnected);
    return () => {
        const idx = _connectionListeners.indexOf(callback);
        if (idx > -1) _connectionListeners.splice(idx, 1);
    };
}

export function isConnected() {
    return _isConnected;
}

// Start connection monitor
initConnectionMonitor();

// Re-export common Firebase database & auth primitives for convenience
export {
    ref, onValue, off, get, set, push, remove,
    query, orderByChild, limitToLast,
    signInWithEmailAndPassword, signOut, onAuthStateChanged
};
