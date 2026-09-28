/**
 * SpendWise AI - Authentication & API Key Utility
 * Group 18: Shivani Anil (51), Sreerag C Madhu (52), Sreya N V (53)
 */

const TOKEN_KEY = 'spendwise_token';
const USER_KEY = 'spendwise_user';

const Auth = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  },

  setAuth(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.renderHeaderUser();
  },

  clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  isAuthenticated() {
    return Boolean(this.getToken());
  },

  checkAuth(requireAuth = true) {
    const isAuth = this.isAuthenticated();
    const currentPath = window.location.pathname.toLowerCase();

    if (requireAuth && !isAuth) {
      if (!currentPath.includes('login.html') && !currentPath.includes('register.html')) {
        window.location.href = 'login.html';
      }
    } else if (!requireAuth && isAuth) {
      if (currentPath.includes('login.html') || currentPath.includes('register.html')) {
        window.location.href = 'index.html';
      }
    }
  },

  async authFetch(url, options = {}) {
    const token = this.getToken();
    const headers = options.headers || {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      this.clearAuth();
      window.location.href = 'login.html';
      throw new Error('Session expired');
    }

    return res;
  },

  async login(email, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.success) {
      this.setAuth(data.token, data.user);
    }
    return data;
  },

  async register(name, email, password, currency = 'USD') {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, currency }),
    });
    const data = await res.json();
    if (data.success) {
      this.setAuth(data.token, data.user);
    }
    return data;
  },

  async demoLogin() {
    const res = await fetch('/api/auth/demo', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      this.setAuth(data.token, data.user);
    }
    return data;
  },

  logout() {
    this.clearAuth();
    window.location.href = 'login.html';
  },

  renderHeaderUser() {
    const authContainer = document.getElementById('headerAuthCapsule');
    if (!authContainer) return;

    const user = this.getUser();

    if (user && this.isAuthenticated()) {
      const initials = (user.name || 'User')
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      authContainer.innerHTML = `
        <div class="user-profile-capsule">
          <div class="user-avatar">${initials}</div>
          <span>${user.name.split(' ')[0]}</span>
          <button id="logoutBtn" class="btn-logout" title="Sign Out">
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
          </button>
        </div>
      `;

      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => this.logout());
      }
    } else {
      authContainer.innerHTML = `
        <a href="login.html" class="capsule-btn btn-auth">
          <span>Sign In</span>
          <i class="fa-solid fa-arrow-right-long"></i>
        </a>
      `;
    }
  },
};

function showToast(message, type = 'success') {
  let toast = document.getElementById('neoToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'neoToast';
    toast.className = 'neo-toast';
    toast.innerHTML = `<div class="toast-dot"></div><span id="neoToastMsg"></span>`;
    document.body.appendChild(toast);
  }

  const msgEl = document.getElementById('neoToastMsg');
  if (msgEl) msgEl.textContent = message;
  toast.className = `neo-toast ${type} show`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

document.addEventListener('DOMContentLoaded', () => {
  Auth.renderHeaderUser();
});
