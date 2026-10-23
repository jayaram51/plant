// ================================================================
// SmartPlant Cloud — Authentication Module
// ================================================================

import {
    auth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from './firebase-config.js';

// ----------------------------------------------------------------
// Auth State
// ----------------------------------------------------------------
let _currentUser = null;
let _authReady = false;
const _authListeners = [];

// Initialize auth state observer
onAuthStateChanged(auth, (user) => {
    _currentUser = user;
    _authReady = true;

    if (user) {
        sessionStorage.setItem('sp_user_email', user.email || '');
        sessionStorage.setItem('sp_user_name', user.displayName || user.email?.split('@')[0] || 'User');
        sessionStorage.setItem('sp_user_uid', user.uid);
    }

    _authListeners.forEach(cb => {
        try { cb(user); } catch (e) { console.error('Auth listener error:', e); }
    });
});

// ----------------------------------------------------------------
// Login
// ----------------------------------------------------------------
export async function login(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        const message = getAuthErrorMessage(error.code);
        return { success: false, error: message, code: error.code };
    }
}

// ----------------------------------------------------------------
// Register
// ----------------------------------------------------------------
export async function register(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        const message = getAuthErrorMessage(error.code);
        return { success: false, error: message, code: error.code };
    }
}

// ----------------------------------------------------------------
// Logout
// ----------------------------------------------------------------
export async function logout() {
    try {
        await signOut(auth);
        sessionStorage.clear();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ----------------------------------------------------------------
// Auth State Helpers
// ----------------------------------------------------------------
export function getCurrentUser() {
    return _currentUser;
}

export function isAuthenticated() {
    return !!_currentUser;
}

export function onAuthChange(callback) {
    _authListeners.push(callback);
    // If auth is already resolved, immediately fire
    if (_authReady) {
        callback(_currentUser);
    }
    return () => {
        const idx = _authListeners.indexOf(callback);
        if (idx > -1) _authListeners.splice(idx, 1);
    };
}

/**
 * Require authentication — redirects to login if not authenticated.
 * Returns a promise that resolves with the user once auth is ready.
 */
export function requireAuth() {
    return new Promise((resolve) => {
        // Check if demo mode is active
        const demoMode = sessionStorage.getItem('sp_demo_mode');
        if (demoMode) {
            resolve(null);
            return;
        }

        if (_authReady) {
            if (!_currentUser) {
                window.location.href = 'index.html';
            } else {
                resolve(_currentUser);
            }
            return;
        }

        // Wait for auth to initialize
        const unsubscribe = onAuthChange((user) => {
            if (!demoMode && !user) {
                window.location.href = 'index.html';
            } else {
                resolve(user);
            }
            // Remove this specific listener after first fire
            const idx = _authListeners.indexOf(arguments.callee);
            if (idx > -1) _authListeners.splice(idx, 1);
        });
    });
}

// ----------------------------------------------------------------
// Error Messages
// ----------------------------------------------------------------
function getAuthErrorMessage(code) {
    const messages = {
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Check your connection.',
        'auth/operation-not-allowed': 'Email/password sign-in is not enabled.',
        'auth/requires-recent-login': 'Please sign in again to continue.',
    };
    return messages[code] || 'Authentication failed. Please try again.';
}
