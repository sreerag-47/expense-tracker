/**
 * SpendWise AI - Dashboard Controller
 * Group 18: Shivani Anil, Sreerag C Madhu, Sreya N V
 */

document.addEventListener('DOMContentLoaded', async () => {
  Auth.checkAuth(true);

  // Load summary and render components
  await Promise.all([loadDashboardSummary(), loadBudgetWarnings(), loadAiHighlights()]);

  // Setup quick add transaction
  setupQuickAdd();
});

let categoryChart = null;
let trendChart = null;

async function loadDashboardSummary() {
  try {
    const res = await Auth.authFetch('/api/transactions/summary');
    const data = await res.json();

    if (!data.success) return;
    const s = data.summary;

    const user = Auth.getUser();
    const currency = user && user.currency === 'INR' ? '₹' : '$';

    const fmt = (num) =>
      `${currency}${Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Net Liquid Reserve
    const heroBalance = document.getElementById('heroBalance');
    if (heroBalance) heroBalance.textContent = fmt(s.balance);

    // Three Pillars (.01, .02, .03)
    const pillarIncome = document.getElementById('pillarIncome');
    if (pillarIncome) pillarIncome.textContent = fmt(s.totalIncome);

    const pillarExpense = document.getElementById('pillarExpense');
    if (pillarExpense) pillarExpense.textContent = fmt(s.totalExpense);

    const pillarSavingsRate = document.getElementById('pillarSavingsRate');
    if (pillarSavingsRate) pillarSavingsRate.textContent = `${s.savingsRate}%`;

    const pillarSavingsBar = document.getElementById('pillarSavingsBar');
    if (pillarSavingsBar) {
      pillarSavingsBar.style.width = `${Math.max(0, Math.min(100, s.savingsRate))}%`;
    }

    // Recent Transactions in Dashboard
    const recentList = document.getElementById('dashboardRecentTable');
    if (recentList && s.recentTransactions) {
      if (s.recentTransactions.length === 0) {
        recentList.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No transactions recorded yet.</td></tr>`;
      } else {
        recentList.innerHTML = s.recentTransactions
          .map((tx) => {
            const dateStr = new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const isInc = tx.type === 'income';
            const color = isInc ? 'var(--income-color)' : 'var(--expense-color)';
            const sign = isInc ? '+' : '-';
            const title = tx.description || tx.title || 'Untitled';
            return `
              <tr>
                <td><strong>${escapeHtml(title)}</strong></td>
                <td><span class="cat-badge">${escapeHtml(tx.category)}</span></td>
                <td>${dateStr}</td>
                <td style="color: ${color}; font-weight: 700; text-align: right;">${sign}${fmt(tx.amount)}</td>
              </tr>
            `;
          })
          .join('');
      }
    }

    // Render Charts
    renderCategoryChart(s.categoryBreakdown || []);
    renderTrendChart(s.monthlyTrend || []);
  } catch (err) {
    console.error('Error loading dashboard summary:', err);
  }
}

async function loadBudgetWarnings() {
  const alertContainer = document.getElementById('budgetAlertBanner');
  if (!alertContainer) return;

  try {
    const res = await Auth.authFetch('/api/budgets');
    const data = await res.json();

    if (data.success && data.alerts && data.alerts.length > 0) {
      const isDanger = data.alerts.some((a) => a.toLowerCase().includes('over budget'));
      alertContainer.className = `alert-banner ${isDanger ? 'danger' : ''}`;
      alertContainer.style.display = 'flex';
      alertContainer.innerHTML = `
        <div>
          <strong><i class="fa-solid fa-triangle-exclamation"></i> Budget Warning:</strong>
          <span>${data.alerts[0]}</span>
          ${data.alerts.length > 1 ? `<span style="font-size: 0.75rem;">(+${data.alerts.length - 1} more)</span>` : ''}
        </div>
        <a href="budgets.html" class="capsule-btn btn-subtle" style="padding: 0.35rem 0.85rem; font-size: 0.78rem;">Manage Budgets &rarr;</a>
      `;
    } else {
      alertContainer.style.display = 'none';
    }
  } catch (err) {
    console.error('Error checking budget alerts:', err);
  }
}

async function loadAiHighlights() {
  const container = document.getElementById('dashboardAiCard');
  if (!container) return;

  try {
    const res = await Auth.authFetch('/api/ai/insights');
    const data = await res.json();

    if (data.success && data.insights && data.insights.length > 0) {
      const topInsight = data.insights[0];
      const isAlert = topInsight.toLowerCase().includes('alert') || topInsight.toLowerCase().includes('higher');

      container.className = `ai-anomaly-box ${isAlert ? 'alert' : ''}`;
      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.35rem;">
          <strong><i class="fa-solid fa-brain-circuit"></i> AI Spending Intelligence</strong>
          <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">${data.isLiveAI ? 'Gemini 2.5 Flash' : 'Anomaly Detector'}</span>
        </div>
        <p style="margin: 0;">${escapeHtml(topInsight)}</p>
      `;
    }
  } catch (err) {
    console.error('Error loading AI highlight:', err);
  }
}

function renderCategoryChart(breakdown) {
  const canvas = document.getElementById('categoryDoughnutChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (categoryChart) categoryChart.destroy();

  const colors = ['#0284c7', '#059669', '#d97706', '#e11d48', '#8b5cf6', '#06b6d4', '#ec4899'];

  if (!breakdown.length) {
    categoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['No Outflows Logged'],
        datasets: [{ data: [1], backgroundColor: ['#f1f5f9'] }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
    });
    return;
  }

  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: breakdown.map((b) => b.category),
      datasets: [
        {
          data: breakdown.map((b) => b.amount),
          backgroundColor: colors.slice(0, breakdown.length),
          borderWidth: 2,
          borderColor: '#ffffff',
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
          labels: { color: '#475569', font: { family: "'Plus Jakarta Sans'", size: 11 }, boxWidth: 12 },
        },
      },
    },
  });
}

function renderTrendChart(monthlyTrend) {
  const canvas = document.getElementById('monthlyCashflowChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (trendChart) trendChart.destroy();

  if (!monthlyTrend.length) {
    monthlyTrend = [{ month: 'Current', income: 0, expense: 0 }];
  }

  trendChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: monthlyTrend.map((t) => t.month),
      datasets: [
        { label: 'Inflow', data: monthlyTrend.map((t) => t.income), backgroundColor: '#059669', borderRadius: 6 },
        { label: 'Outflow', data: monthlyTrend.map((t) => t.expense), backgroundColor: '#e11d48', borderRadius: 6 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: 'rgba(0, 0, 0, 0.04)' }, ticks: { color: '#64748b', font: { size: 11 } } },
        y: { grid: { color: 'rgba(0, 0, 0, 0.04)' }, ticks: { color: '#64748b', font: { size: 11 } } },
      },
      plugins: {
        legend: { labels: { color: '#334155', font: { size: 11 }, boxWidth: 12 } },
      },
    },
  });
}

function setupQuickAdd() {
  const openBtn = document.getElementById('openQuickAddBtn');
  const modal = document.getElementById('txModal');
  const closeBtn = document.getElementById('closeTxModalBtn');
  const cancelBtn = document.getElementById('cancelTxBtn');
  const form = document.getElementById('txForm');

  if (!modal || !form) return;

  const openModal = () => {
    form.reset();
    document.querySelector('input[name="txType"][value="expense"]').checked = true;
    document.getElementById('txDate').value = new Date().toISOString().split('T')[0];
    modal.classList.add('active');
  };

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  if (cancelBtn) cancelBtn.addEventListener('click', () => modal.classList.remove('active'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      description: document.getElementById('txTitle').value.trim(),
      amount: parseFloat(document.getElementById('txAmount').value),
      type: document.querySelector('input[name="txType"]:checked').value,
      category: document.getElementById('txCategory').value,
      date: document.getElementById('txDate').value,
    };

    try {
      const res = await Auth.authFetch('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        modal.classList.remove('active');
        showToast('Transaction recorded successfully!', 'success');
        await Promise.all([loadDashboardSummary(), loadBudgetWarnings(), loadAiHighlights()]);
      } else {
        showToast(data.error || 'Failed to record entry', 'error');
      }
    } catch {
      showToast('Error recording transaction', 'error');
    }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
