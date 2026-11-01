// ================================================================
// Smart Plant Monitoring — Core Application Shell & Navigation
// ================================================================

import { onConnectionChange, isConnected } from './firebase-config.js';
import { onAuthChange, login, logout, getCurrentUser } from './firebase-service.js';
import { refreshChartThemes } from './charts.js';

// Global App Initialization
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMobileNav();
    initFirebaseConnectionWatcher();
    initAuthUI();
    initPWA();
    initIcons();
});

export function initIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

/**
 * PWA Service Worker Registration & Installation Prompt
 */
let _deferredInstallPrompt = null;

function initPWA() {
    // 1. Register Service Worker
    if ('serviceWorker' in navigator) {
        const swPath = window.location.pathname.includes('/pages/') ? '../sw.js' : './sw.js';
        navigator.serviceWorker.register(swPath).then((reg) => {
            console.log('SmartPlant PWA Service Worker registered:', reg.scope);
        }).catch((err) => {
            console.warn('Service Worker registration skipped:', err);
        });
    }

    // 2. Handle PWA Install Prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        _deferredInstallPrompt = e;
        const installBtns = document.querySelectorAll('.pwa-install-btn');
        installBtns.forEach(btn => {
            btn.style.display = 'inline-flex';
            btn.onclick = async () => {
                if (_deferredInstallPrompt) {
                    _deferredInstallPrompt.prompt();
                    const { outcome } = await _deferredInstallPrompt.userChoice;
                    if (outcome === 'accepted') {
                        showToast('SmartPlant Web App installed successfully!', 'success');
                    }
                    _deferredInstallPrompt = null;
                    installBtns.forEach(b => b.style.display = 'none');
                }
            };
        });
    });

    window.addEventListener('appinstalled', () => {
        showToast('SmartPlant Web App installed on your device!', 'success');
        _deferredInstallPrompt = null;
        document.querySelectorAll('.pwa-install-btn').forEach(b => b.style.display = 'none');
    });
}


/**
 * Theme Management
 */
function initTheme() {
    const savedTheme = localStorage.getItem('sp_theme') || 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(savedTheme);

    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'light';
            const next = current === 'dark' ? 'light' : 'dark';
            setTheme(next);
            refreshChartThemes();
        });
    }
}

export function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sp_theme', theme);
    const icon = document.getElementById('theme-toggle-icon');
    if (icon) {
        icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
        initIcons();
    }
}

/**
 * Mobile Navigation Drawer
 */
function initMobileNav() {
    const hamburger = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const closeBtn = document.getElementById('sidebar-close-btn');

    const closeSidebar = () => {
        if (sidebar) sidebar.classList.remove('mobile-open');
        if (overlay) overlay.classList.remove('active');
    };

    if (hamburger && sidebar) {
        hamburger.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
            if (overlay) overlay.classList.toggle('active');
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeSidebar);
    }

    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    // Auto-close drawer when clicking any nav item on mobile
    if (sidebar) {
        sidebar.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 992) {
                    closeSidebar();
                }
            });
        });
    }
}

/**
 * Real-time Firebase Connection Indicator in Topbar
 */
function initFirebaseConnectionWatcher() {
    const chip = document.getElementById('firebase-status-chip');
    if (!chip) return;

    onConnectionChange((connected) => {
        if (connected) {
            chip.className = 'status-pill status-success connection-chip';
            chip.innerHTML = '<span class="status-dot status-dot-pulse"></span><span>Firebase Online</span>';
        } else {
            chip.className = 'status-pill status-danger connection-chip';
            chip.innerHTML = '<span class="status-dot"></span><span>Connecting...</span>';
        }
    });
}

/**
 * Firebase Authentication Modal & Topbar Profile UI
 */
function initAuthUI() {
    const authTriggerBtn = document.getElementById('auth-action-btn');
    const authModal = document.getElementById('auth-modal');
    const authModalBackdrop = document.getElementById('auth-modal-backdrop');
    const authCloseBtn = document.getElementById('auth-modal-close');
    const authForm = document.getElementById('auth-login-form');
    const authErrorAlert = document.getElementById('auth-error-alert');
    const quickLoginBtn = document.getElementById('quick-login-verified-btn');

    onAuthChange((user) => {
        const userEmailSpan = document.getElementById('current-user-email');
        const userStatusSpan = document.getElementById('current-user-name');
        const userAvatar = document.getElementById('user-avatar-initials');

        if (user) {
            const email = user.email || 'User';
            const name = email.split('@')[0];
            if (userEmailSpan) userEmailSpan.textContent = email;
            if (userStatusSpan) userStatusSpan.textContent = name;
            if (userAvatar) userAvatar.textContent = name.substring(0, 2).toUpperCase();
            if (authTriggerBtn) {
                authTriggerBtn.innerHTML = '<i data-lucide="log-out" class="icon-sm"></i><span class="d-none d-sm-inline">Sign Out</span>';
                authTriggerBtn.onclick = handleSignOut;
            }
            closeAuthModal();
        } else {
            if (userEmailSpan) userEmailSpan.textContent = 'Not Authenticated';
            if (userStatusSpan) userStatusSpan.textContent = 'Guest';
            if (userAvatar) userAvatar.textContent = 'G';
            if (authTriggerBtn) {
                authTriggerBtn.innerHTML = '<i data-lucide="log-in" class="icon-sm"></i><span class="d-none d-sm-inline">Sign In</span>';
                authTriggerBtn.onclick = openAuthModal;
            }
        }
        initIcons();
    });

    function openAuthModal() {
        if (authModal && authModalBackdrop) {
            authModal.classList.add('active');
            authModalBackdrop.classList.add('active');
            if (authErrorAlert) authErrorAlert.style.display = 'none';
        }
    }

    function closeAuthModal() {
        if (authModal && authModalBackdrop) {
            authModal.classList.remove('active');
            authModalBackdrop.classList.remove('active');
        }
    }

    if (authCloseBtn) authCloseBtn.addEventListener('click', closeAuthModal);
    if (authModalBackdrop) authModalBackdrop.addEventListener('click', closeAuthModal);

    if (quickLoginBtn) {
        quickLoginBtn.addEventListener('click', async () => {
            const emailInput = document.getElementById('login-email-input');
            const passInput = document.getElementById('login-password-input');
            if (emailInput) emailInput.value = 'jayaram93915@gmail.com';
            if (passInput) passInput.value = 'Abc&1234';
            await performLogin('jayaram93915@gmail.com', 'Abc&1234');
        });
    }

    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email-input')?.value.trim();
            const pass = document.getElementById('login-password-input')?.value;
            if (!email || !pass) return;
            await performLogin(email, pass);
        });
    }

    async function performLogin(email, pass) {
        const submitBtn = document.getElementById('login-submit-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Authenticating...';
        }
        if (authErrorAlert) authErrorAlert.style.display = 'none';

        const result = await login(email, pass);
        if (!result.success) {
            if (authErrorAlert) {
                authErrorAlert.textContent = result.message || 'Authentication failed.';
                authErrorAlert.style.display = 'block';
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Sign In & Connect Database';
            }
        } else {
            showToast('Signed in successfully. Real-time Firebase listeners connected.', 'success');
            closeAuthModal();
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Sign In & Connect Database';
            }
        }
    }

    async function handleSignOut() {
        if (confirm('Sign out from Firebase? Database reads will be restricted per security rules.')) {
            await logout();
            showToast('Signed out from Firebase.', 'info');
        }
    }
}

/**
 * Toast Notification System
 */
export function showToast(message, type = 'info') {
    let container = document.getElementById('app-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'app-toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `sp-toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i data-lucide="${type === 'success' ? 'check-circle' : (type === 'danger' ? 'alert-octagon' : 'info')}" class="toast-icon"></i>
            <span>${message}</span>
        </div>
        <button class="toast-close" aria-label="Close">&times;</button>
    `;

    container.appendChild(toast);
    initIcons();

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        toast.classList.add('toast-hiding');
        setTimeout(() => toast.remove(), 300);
    });

    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.add('toast-hiding');
            setTimeout(() => toast.remove(), 300);
        }
    }, 4500);
}
