// ================================================================
// Smart Plant Monitoring — Firebase Authentication & Service Layer
// ================================================================

import { 
    auth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
    isConnected, onConnectionChange 
} from './firebase-config.js';

let _currentUser = null;
let _authInitialized = false;
const _authListeners = [];

// Initialize Auth Observer
onAuthStateChanged(auth, (user) => {
    _currentUser = user;
    _authInitialized = true;

    if (user) {
        sessionStorage.setItem('sp_user_email', user.email || '');
        sessionStorage.setItem('sp_user_name', user.displayName || user.email?.split('@')[0] || 'User');
        sessionStorage.setItem('sp_user_uid', user.uid);
    } else {
        sessionStorage.removeItem('sp_user_email');
        sessionStorage.removeItem('sp_user_name');
        sessionStorage.removeItem('sp_user_uid');
    }

    _authListeners.forEach(cb => {
        try { cb(_currentUser); } catch (e) { console.error('Auth listener error:', e); }
    });
});

export function getCurrentUser() {
    return _currentUser;
}

export function isAuthenticated() {
    return !!_currentUser;
}

export function isAuthInitialized() {
    return _authInitialized;
}

export function onAuthChange(callback) {
    _authListeners.push(callback);
    if (_authInitialized) {
        callback(_currentUser);
    }
    return () => {
        const idx = _authListeners.indexOf(callback);
        if (idx > -1) _authListeners.splice(idx, 1);
    };
}

export async function login(email, password) {
    try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: cred.user };
    } catch (err) {
        console.error('Login error:', err);
        return { 
            success: false, 
            code: err.code, 
            message: getAuthErrorMessage(err.code) || err.message 
        };
    }
}

export async function logout() {
    try {
        await signOut(auth);
        sessionStorage.clear();
        return { success: true };
    } catch (err) {
        console.error('Logout error:', err);
        return { success: false, error: err.message };
    }
}

// Map Firebase Auth error codes to user-friendly messages
function getAuthErrorMessage(code) {
    const errorMap = {
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/user-disabled': 'This user account has been disabled.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/invalid-credential': 'Invalid credentials. Please verify your email and password.',
        'auth/network-request-failed': 'Network connection error. Check your internet connectivity.',
        'auth/too-many-requests': 'Too many attempts. Please try again in a moment.'
    };
    return errorMap[code] || 'Authentication failed. Please verify credentials.';
}

export { isConnected, onConnectionChange };
