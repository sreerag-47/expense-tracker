/**
 * SpendWise AI - Neo-Fintech Client Engine
 * Group 18: Shivani Anil (51), Sreerag C Madhu (52), Sreya N V (53)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Storage Keys
  const TOKEN_KEY = 'spendwise_token';
  const USER_KEY = 'spendwise_user';

  // Navigation & Views
  const navPills = document.querySelectorAll('.nav-pill');
  const appViews = document.querySelectorAll('.app-view');

  // Header Elements
  const authCapsule = document.getElementById('authCapsule');
  const openNewTxBtn = document.getElementById('openNewTxBtn');
  const dbLivePill = document.getElementById('dbLivePill');
  const dbModeText = document.getElementById('dbModeText');
  const aiLivePill = document.getElementById('aiLivePill');

  // Overview Elements
  const heroBalance = document.getElementById('heroBalance');
  const heroStatusText = document.getElementById('heroStatusText');
  const heroQuickAddBtn = document.getElementById('heroQuickAddBtn');
  const heroQuickAiBtn = document.getElementById('heroQuickAiBtn');
  const pillarIncome = document.getElementById('pillarIncome');
  const pillarExpense = document.getElementById('pillarExpense');
  const pillarSavingsRate = document.getElementById('pillarSavingsRate');
  const pillarSavingsBar = document.getElementById('pillarSavingsBar');
  const overviewRecentList = document.getElementById('overviewRecentList');
  const overviewAiSnippet = document.getElementById('overviewAiSnippet');

  // Transactions Ledger Elements
  const viewAddTxBtn = document.getElementById('viewAddTxBtn');
  const txSearchInput = document.getElementById('txSearchInput');
  const typePills = document.querySelectorAll('.type-pill');
  const txCategoryFilter = document.getElementById('txCategoryFilter');
  const txResetBtn = document.getElementById('txResetBtn');
  const txList = document.getElementById('txList');
  const txLoading = document.getElementById('txLoading');
  const txEmpty = document.getElementById('txEmpty');

  // AI Advisor Elements
  const runAiHealthAuditBtn = document.getElementById('runAiHealthAuditBtn');
  const aiReportOutput = document.getElementById('aiReportOutput');
  const aiLiveTag = document.getElementById('aiLiveTag');
  const chatHistory = document.getElementById('chatHistory');
  const chatQueryInput = document.getElementById('chatQueryInput');
  const sendChatQueryBtn = document.getElementById('sendChatQueryBtn');

  // Auth Modal Elements
  const authModal = document.getElementById('authModal');
  const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');
  const tabSignIn = document.getElementById('tabSignIn');
  const tabRegister = document.getElementById('tabRegister');
  const tabDemo = document.getElementById('tabDemo');
  const signInForm = document.getElementById('signInForm');
  const registerForm = document.getElementById('registerForm');
  const demoAuthPanel = document.getElementById('demoAuthPanel');
  const launchDemoBtn = document.getElementById('launchDemoBtn');
  const loginEmail = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');
  const regName = document.getElementById('regName');
  const regEmail = document.getElementById('regEmail');
  const regPassword = document.getElementById('regPassword');

  // Transaction Modal Elements
  const txModal = document.getElementById('txModal');
  const txModalHeading = document.getElementById('txModalHeading');
  const closeTxModalBtn = document.getElementById('closeTxModalBtn');
  const cancelTxBtn = document.getElementById('cancelTxBtn');
  const txEntryForm = document.getElementById('txEntryForm');
  const txIdField = document.getElementById('txIdField');
  const entryTitle = document.getElementById('entryTitle');
  const entryAmount = document.getElementById('entryAmount');
  const entryCategory = document.getElementById('entryCategory');
  const entryDate = document.getElementById('entryDate');
  const entryNotes = document.getElementById('entryNotes');

  // Toast Element
  const neoToast = document.getElementById('neoToast');
  const neoToastMsg = document.getElementById('neoToastMsg');

  // State Variables
  let currentFilterType = 'all';
  let categoryChartInstance = null;
  let monthlyTrendChartInstance = null;

  // Category Icon Mapping
  const catIcons = {
    Food: 'fa-utensils',
    Housing: 'fa-house',
    Utilities: 'fa-bolt',
    Transportation: 'fa-car',
    Health: 'fa-heart-pulse',
    Salary: 'fa-briefcase',
    Freelance: 'fa-laptop-code',
    Education: 'fa-graduation-cap',
    Investment: 'fa-chart-line',
    Entertainment: 'fa-gamepad',
    Shopping: 'fa-bag-shopping',
    Other: 'fa-receipt',
  };

  const chartThemeColors = [
    '#38bdf8', '#34d399', '#a855f7', '#f87171', '#fbbf24',
    '#67e8f9', '#ec4899', '#4ade80', '#f43f5e', '#818cf8',
  ];

  // ==========================================
  // INITIALIZE APPLICATION
  // ==========================================
  init();

  async function init() {
    setupNavigation();
    setupEventListeners();
    await checkSystemStatus();

    // Check Authentication
    const token = getAuthToken();
    if (!token) {
      // Auto-initialize demo account on first visit for zero-friction evaluation
      await autoLoginDemo();
    } else {
      renderAuthCapsule();
      refreshDashboard();
    }
  }

  // ==========================================
  // AUTHENTICATION MANAGEMENT
  // ==========================================
  function getAuthToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  }

  function setAuth(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    renderAuthCapsule();
  }

  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    renderAuthCapsule();
  }

  function renderAuthCapsule() {
    const user = getCurrentUser();

    if (user && getAuthToken()) {
      const initials = (user.name || 'User')
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      authCapsule.innerHTML = `
        <div class="user-profile-capsule">
          <div class="user-avatar">${initials}</div>
          <span>${escapeHtml(user.name.split(' ')[0])}</span>
          <button id="logoutBtn" class="btn-logout" title="Sign Out">
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
          </button>
        </div>
      `;

      document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    } else {
      authCapsule.innerHTML = `
        <button id="openAuthModalBtn" class="capsule-btn btn-auth">
          <span>Sign In</span>
          <i class="fa-solid fa-arrow-right-long action-arrow"></i>
        </button>
      `;
      document.getElementById('openAuthModalBtn').addEventListener('click', () => openAuthModal('signIn'));
    }
  }

  async function authFetch(url, options = {}) {
    const token = getAuthToken();
    const headers = options.headers || {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      clearAuth();
      showToast('Session expired. Please sign in.', 'error');
      openAuthModal('signIn');
      throw new Error('Unauthorized');
    }

    return response;
  }

  async function autoLoginDemo() {
    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setAuth(data.token, data.user);
        showToast(`Welcome, ${data.user.name}! Demo profile active.`, 'success');
        refreshDashboard();
      }
    } catch {
      renderAuthCapsule();
    }
  }

  function handleLogout() {
    clearAuth();
    showToast('Signed out successfully.', 'success');
    openAuthModal('signIn');
    // Clear display data
    heroBalance.textContent = '₹0.00';
    pillarIncome.textContent = '₹0.00';
    pillarExpense.textContent = '₹0.00';
    pillarSavingsRate.textContent = '0%';
    overviewRecentList.innerHTML = '<li class="empty-item">Please sign in to view your ledger.</li>';
    txList.innerHTML = '';
  }

  // ==========================================
  // SYSTEM HEALTH STATUS
  // ==========================================
  async function checkSystemStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();

      if (data.mongoConnected) {
        dbModeText.textContent = 'MongoDB Cluster Live';
      } else {
        dbModeText.textContent = 'In-Memory Store (Multi-User)';
      }

      if (data.aiConfigured) {
        aiLivePill.innerHTML = '<i class="fa-solid fa-microchip"></i> Gemini 2.5 Flash (Online)';
      } else {
        aiLivePill.innerHTML = '<i class="fa-solid fa-microchip"></i> Gemini (Set Key in .env)';
      }
    } catch {
      dbModeText.textContent = 'Backend Offline';
    }
  }

  // ==========================================
  // DYNAMIC TAB VIEW NAVIGATION
  // ==========================================
  function setupNavigation() {
    navPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const targetViewId = pill.dataset.view;
        switchView(targetViewId);
      });
    });

    // Cross-view link buttons
    document.querySelectorAll('[data-switch-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        switchView(btn.dataset.switchView);
      });
    });
  }

  function switchView(viewId) {
    // Update active nav pill
    navPills.forEach((pill) => {
      if (pill.dataset.view === viewId) pill.classList.add('active');
      else pill.classList.remove('active');
    });

    // Update active view section
    appViews.forEach((view) => {
      if (view.id === viewId) view.classList.add('active');
      else view.classList.remove('active');
    });

    // Refresh targeted view data
    if (viewId === 'viewOverview') loadSummary();
    if (viewId === 'viewTransactions') loadLedger();
    if (viewId === 'viewAnalytics') loadSummary();
  }

  function refreshDashboard() {
    loadSummary();
    loadLedger();
  }

  // ==========================================
  // SUMMARY & METRICS (.01, .02, .03)
  // ==========================================
  async function loadSummary() {
    if (!getAuthToken()) return;

    try {
      const res = await authFetch('/api/expenses/summary');
      const data = await res.json();

      if (!data.success) return;
      const s = data.summary;

      const formatCurr = (num) =>
        `₹${Number(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      // Update Hero
      heroBalance.textContent = formatCurr(s.balance);

      if (s.balance < 0) {
        heroStatusText.innerHTML = `<span style="color: var(--expense-color);"><i class="fa-solid fa-triangle-exclamation"></i> Deficit Alert: Outflows exceed current reserves</span>`;
      } else if (s.savingsRate >= 20) {
        heroStatusText.innerHTML = `<span style="color: var(--income-color);"><i class="fa-solid fa-circle-check"></i> Optimal Wealth Cushion (SDG 8 Aligned)</span>`;
      } else {
        heroStatusText.innerHTML = `<span><i class="fa-solid fa-shield-halved"></i> Active Liquidity & Emergency Buffer</span>`;
      }

      // Update Three Pillars (.01, .02, .03)
      pillarIncome.textContent = formatCurr(s.totalIncome);
      pillarExpense.textContent = formatCurr(s.totalExpense);
      pillarSavingsRate.textContent = `${s.savingsRate}%`;

      const clampedBar = Math.max(0, Math.min(100, s.savingsRate));
      pillarSavingsBar.style.width = `${clampedBar}%`;

      // Render Recent Mini Feed in Overview
      renderOverviewRecent(s.recentTransactions || []);

      // Render Visual Charts
      renderCharts(s.categoryBreakdown || [], s.monthlyTrend || []);
    } catch (err) {
      console.error('Failed to load summary:', err);
    }
  }

  function renderOverviewRecent(transactions) {
    if (!transactions.length) {
      overviewRecentList.innerHTML = '<li class="empty-item">No transactions logged yet.</li>';
      return;
    }

    overviewRecentList.innerHTML = '';
    transactions.slice(0, 4).forEach((tx) => {
      const li = document.createElement('li');
      li.className = `snapshot-item ${tx.type}`;

      const sign = tx.type === 'income' ? '+' : '-';
      const formatted = `${sign}₹${Number(tx.amount).toLocaleString('en-IN')}`;

      li.innerHTML = `
        <span class="title">${escapeHtml(tx.title)}</span>
        <span class="amt">${formatted}</span>
      `;
      overviewRecentList.appendChild(li);
    });
  }

  // ==========================================
  // VISUAL ANALYTICS (Chart.js)
  // ==========================================
  function renderCharts(breakdown, monthlyTrend) {
    // 1. Category Doughnut Chart
    const catCanvas = document.getElementById('categoryChart');
    if (catCanvas) {
      const ctx = catCanvas.getContext('2d');
      if (categoryChartInstance) categoryChartInstance.destroy();

      if (!breakdown.length) {
        categoryChartInstance = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['No Expenses Logged'],
            datasets: [{ data: [1], backgroundColor: ['rgba(255, 255, 255, 0.08)'] }],
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
        });
      } else {
        const labels = breakdown.map((b) => `${b.category}`);
        const dataVals = breakdown.map((b) => b.amount);

        categoryChartInstance = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels,
            datasets: [
              {
                data: dataVals,
                backgroundColor: chartThemeColors.slice(0, breakdown.length),
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverOffset: 8,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
              legend: {
                position: 'right',
                labels: {
                  color: '#475569',
                  font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
                  boxWidth: 12,
                  padding: 10,
                },
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => ` ₹${ctx.raw.toLocaleString()}`,
                },
              },
            },
          },
        });
      }
    }

    // 2. Monthly Timeline Bar Chart
    const trendCanvas = document.getElementById('monthlyTrendChart');
    if (trendCanvas) {
      const ctx = trendCanvas.getContext('2d');
      if (monthlyTrendChartInstance) monthlyTrendChartInstance.destroy();

      if (!monthlyTrend.length) {
        monthlyTrend = [{ month: 'Current', income: 0, expense: 0 }];
      }

      monthlyTrendChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: monthlyTrend.map((t) => t.month),
          datasets: [
            {
              label: 'Inflow',
              data: monthlyTrend.map((t) => t.income),
              backgroundColor: '#059669',
              borderRadius: 6,
            },
            {
              label: 'Outflow',
              data: monthlyTrend.map((t) => t.expense),
              backgroundColor: '#e11d48',
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: { color: 'rgba(0, 0, 0, 0.05)' },
              ticks: { color: '#64748b', font: { size: 11 } },
            },
            y: {
              grid: { color: 'rgba(0, 0, 0, 0.05)' },
              ticks: {
                color: '#64748b',
                font: { size: 11 },
                callback: (v) => '₹' + v.toLocaleString(),
              },
            },
          },
          plugins: {
            legend: { labels: { color: '#334155', font: { size: 11 }, boxWidth: 12 } },
          },
        },
      });
    }
  }

  // ==========================================
  // TRANSACTIONS LEDGER (Uncluttered Management)
  // ==========================================
  async function loadLedger() {
    if (!getAuthToken()) return;

    try {
      txLoading.style.display = 'flex';
      txEmpty.style.display = 'none';

      const search = txSearchInput.value.trim();
      const category = txCategoryFilter.value;
      const type = currentFilterType;

      const params = new URLSearchParams();
      if (type !== 'all') params.append('type', type);
      if (category !== 'all') params.append('category', category);
      if (search) params.append('search', search);

      const res = await authFetch(`/api/expenses?${params.toString()}`);
      const data = await res.json();

      txLoading.style.display = 'none';

      if (!data.success || !data.data || !data.data.length) {
        txList.innerHTML = '';
        txEmpty.style.display = 'flex';
        return;
      }

      txEmpty.style.display = 'none';
      renderLedger(data.data);
    } catch (err) {
      txLoading.style.display = 'none';
      console.error('Error loading ledger:', err);
    }
  }

  function renderLedger(items) {
    txList.innerHTML = '';

    items.forEach((item) => {
      const li = document.createElement('li');
      li.className = `ledger-item ${item.type}`;

      const icon = catIcons[item.category] || 'fa-receipt';
      const formattedDate = new Date(item.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const sign = item.type === 'income' ? '+' : '-';
      const formattedAmount = `${sign}₹${Number(item.amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

      li.innerHTML = `
        <div class="ledger-left">
          <div class="ledger-icon">
            <i class="fa-solid ${icon}"></i>
          </div>
          <div class="ledger-details">
            <span class="ledger-title">${escapeHtml(item.title)}</span>
            <div class="ledger-meta">
              <span class="ledger-cat-badge">${escapeHtml(item.category)}</span>
              <span>&bull;</span>
              <span>${formattedDate}</span>
              ${item.notes ? `<span>&bull;</span> <span>${escapeHtml(item.notes.substring(0, 35))}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="ledger-right">
          <span class="ledger-amount">${formattedAmount}</span>
          <div class="ledger-actions">
            <button class="btn-item-action edit" data-id="${item._id}" title="Edit Entry">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn-item-action delete" data-id="${item._id}" title="Delete Entry">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      `;

      li.querySelector('.edit').addEventListener('click', () => openTxModal(item));
      li.querySelector('.delete').addEventListener('click', () => deleteEntry(item._id, item.title));

      txList.appendChild(li);
    });
  }

  // ==========================================
  // TRANSACTION CRUD
  // ==========================================
  function openTxModal(item = null) {
    if (!getAuthToken()) {
      openAuthModal('signIn');
      return;
    }

    if (item) {
      txModalHeading.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Transaction';
      txIdField.value = item._id;
      entryTitle.value = item.title;
      entryAmount.value = item.amount;
      document.querySelector(`input[name="entryType"][value="${item.type}"]`).checked = true;
      entryCategory.value = item.category;
      entryDate.value = new Date(item.date).toISOString().split('T')[0];
      entryNotes.value = item.notes || '';
    } else {
      txModalHeading.innerHTML = '<i class="fa-solid fa-circle-plus"></i> New Transaction';
      txIdField.value = '';
      txEntryForm.reset();
      document.querySelector('input[name="entryType"][value="expense"]').checked = true;
      entryDate.value = new Date().toISOString().split('T')[0];
    }

    txModal.classList.add('active');
  }

  function closeTxModal() {
    txModal.classList.remove('active');
  }

  async function handleTxSubmit(e) {
    e.preventDefault();

    const id = txIdField.value;
    const isEdit = Boolean(id);

    const payload = {
      title: entryTitle.value.trim(),
      amount: parseFloat(entryAmount.value),
      type: document.querySelector('input[name="entryType"]:checked').value,
      category: entryCategory.value,
      date: entryDate.value,
      notes: entryNotes.value.trim(),
    };

    if (!payload.title || !payload.amount || isNaN(payload.amount) || payload.amount <= 0 || !payload.category) {
      showToast('Please enter all required fields', 'error');
      return;
    }

    try {
      const url = isEdit ? `/api/expenses/${id}` : '/api/expenses';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (!result.success) {
        showToast(result.message || 'Operation failed', 'error');
        return;
      }

      closeTxModal();
      showToast(isEdit ? 'Transaction updated' : 'Entry recorded successfully', 'success');
      refreshDashboard();
    } catch {
      showToast('Error saving transaction', 'error');
    }
  }

  async function deleteEntry(id, title) {
    if (!confirm(`Delete entry "${title}"?`)) return;

    try {
      const res = await authFetch(`/api/expenses/${id}`, { method: 'DELETE' });
      const result = await res.json();

      if (result.success) {
        showToast('Entry removed', 'success');
        refreshDashboard();
      } else {
        showToast(result.message || 'Failed to remove', 'error');
      }
    } catch {
      showToast('Error deleting transaction', 'error');
    }
  }

  // ==========================================
  // GEMINI AI ADVISORY
  // ==========================================
  async function triggerAiHealthAudit() {
    if (!getAuthToken()) {
      openAuthModal('signIn');
      return;
    }

    aiReportOutput.innerHTML = `
      <div class="ai-intro-placeholder">
        <div class="neo-spinner"></div>
        <p><strong>Gemini 2.5 Flash</strong> is compiling your wealth audit and checking UN SDG benchmarks...</p>
      </div>
    `;

    try {
      const res = await authFetch('/api/ai/insights', { method: 'POST' });
      const data = await res.json();

      if (!data.success) {
        aiReportOutput.innerHTML = `<div style="color: var(--expense-color); padding: 1rem;">${escapeHtml(data.message)}</div>`;
        return;
      }

      const parsedHtml = marked.parse(data.insights);
      aiReportOutput.innerHTML = parsedHtml;

      // Update snippet on overview tab too
      overviewAiSnippet.innerHTML = marked.parse(data.insights.split('\n\n')[1] || data.insights.substring(0, 240) + '...');

      showToast(data.isLiveAI ? 'Gemini 2.5 Flash Audit Ready!' : 'Financial Report Generated', 'success');
    } catch (err) {
      aiReportOutput.innerHTML = `<div style="color: var(--expense-color); padding: 1rem;">Network error running AI audit.</div>`;
    }
  }

  async function sendAiChatQuery() {
    const query = chatQueryInput.value.trim();
    if (!query) return;

    if (!getAuthToken()) {
      openAuthModal('signIn');
      return;
    }

    // Append User message
    const userMsgEl = document.createElement('div');
    userMsgEl.className = 'chat-msg user';
    userMsgEl.innerHTML = `<div class="msg-bubble">${escapeHtml(query)}</div>`;
    chatHistory.appendChild(userMsgEl);

    chatQueryInput.value = '';
    sendChatQueryBtn.disabled = true;

    // Append Assistant loading bubble
    const aiMsgEl = document.createElement('div');
    aiMsgEl.className = 'chat-msg assistant';
    aiMsgEl.innerHTML = `
      <i class="fa-solid fa-robot"></i>
      <div class="msg-bubble"><span style="color: var(--accent-cyan);"><i class="fa-solid fa-spinner fa-spin"></i> Analyzing...</span></div>
    `;
    chatHistory.appendChild(aiMsgEl);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    try {
      const res = await authFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ question: query }),
      });
      const data = await res.json();

      const bubble = aiMsgEl.querySelector('.msg-bubble');
      if (data.success) {
        bubble.innerHTML = marked.parse(data.reply);
      } else {
        bubble.innerHTML = `<span style="color: var(--expense-color);">${escapeHtml(data.message)}</span>`;
      }
    } catch {
      aiMsgEl.querySelector('.msg-bubble').textContent = 'Error contacting AI Advisor.';
    } finally {
      sendChatQueryBtn.disabled = false;
      chatHistory.scrollTop = chatHistory.scrollHeight;
    }
  }

  // ==========================================
  // AUTH MODAL & FLOWS
  // ==========================================
  function openAuthModal(mode = 'signIn') {
    authModal.classList.add('active');
    switchAuthTab(mode);
  }

  function closeAuthModal() {
    authModal.classList.remove('active');
  }

  function switchAuthTab(mode) {
    tabSignIn.classList.remove('active');
    tabRegister.classList.remove('active');
    tabDemo.classList.remove('active');
    signInForm.style.display = 'none';
    registerForm.style.display = 'none';
    demoAuthPanel.style.display = 'none';

    if (mode === 'signIn') {
      tabSignIn.classList.add('active');
      signInForm.style.display = 'flex';
    } else if (mode === 'register') {
      tabRegister.classList.add('active');
      registerForm.style.display = 'flex';
    } else if (mode === 'demo') {
      tabDemo.classList.add('active');
      demoAuthPanel.style.display = 'flex';
    }
  }

  async function handleSignIn(e) {
    e.preventDefault();
    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!data.success) {
        showToast(data.message || 'Login failed', 'error');
        return;
      }

      setAuth(data.token, data.user);
      closeAuthModal();
      showToast(`Welcome back, ${data.user.name}!`, 'success');
      refreshDashboard();
    } catch {
      showToast('Network error during login', 'error');
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    const name = regName.value.trim();
    const email = regEmail.value.trim();
    const password = regPassword.value;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!data.success) {
        showToast(data.message || 'Registration failed', 'error');
        return;
      }

      setAuth(data.token, data.user);
      closeAuthModal();
      showToast(`Account created! Welcome, ${data.user.name}.`, 'success');
      refreshDashboard();
    } catch {
      showToast('Network error during registration', 'error');
    }
  }

  async function handleLaunchDemo() {
    await autoLoginDemo();
    closeAuthModal();
  }

  // ==========================================
  // EVENT LISTENERS
  // ==========================================
  function setupEventListeners() {
    // Auth Modal Tabs
    tabSignIn.addEventListener('click', () => switchAuthTab('signIn'));
    tabRegister.addEventListener('click', () => switchAuthTab('register'));
    tabDemo.addEventListener('click', () => switchAuthTab('demo'));
    closeAuthModalBtn.addEventListener('click', closeAuthModal);
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) closeAuthModal();
    });

    signInForm.addEventListener('submit', handleSignIn);
    registerForm.addEventListener('submit', handleRegister);
    launchDemoBtn.addEventListener('click', handleLaunchDemo);

    // Transaction Modals
    openNewTxBtn.addEventListener('click', () => openTxModal());
    viewAddTxBtn.addEventListener('click', () => openTxModal());
    heroQuickAddBtn.addEventListener('click', () => openTxModal());
    closeTxModalBtn.addEventListener('click', closeTxModal);
    cancelTxBtn.addEventListener('click', closeTxModal);
    txModal.addEventListener('click', (e) => {
      if (e.target === txModal) closeTxModal();
    });
    txEntryForm.addEventListener('submit', handleTxSubmit);

    // Filters
    let debounce;
    txSearchInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(loadLedger, 250);
    });

    typePills.forEach((pill) => {
      pill.addEventListener('click', () => {
        typePills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        currentFilterType = pill.dataset.type;
        loadLedger();
      });
    });

    txCategoryFilter.addEventListener('change', loadLedger);
    txResetBtn.addEventListener('click', () => {
      txSearchInput.value = '';
      currentFilterType = 'all';
      typePills.forEach((p) => p.classList.remove('active'));
      typePills[0].classList.add('active');
      txCategoryFilter.value = 'all';
      loadLedger();
    });

    // AI Triggers
    heroQuickAiBtn.addEventListener('click', () => {
      switchView('viewAiAdvisor');
      triggerAiHealthAudit();
    });
    runAiHealthAuditBtn.addEventListener('click', triggerAiHealthAudit);
    sendChatQueryBtn.addEventListener('click', sendAiChatQuery);
    chatQueryInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendAiChatQuery();
    });
  }

  // ==========================================
  // UTILITIES (Toast & HTML Escaping)
  // ==========================================
  function showToast(msg, type = 'success') {
    neoToastMsg.textContent = msg;
    neoToast.className = `neo-toast ${type} show`;

    setTimeout(() => {
      neoToast.classList.remove('show');
    }, 3200);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
