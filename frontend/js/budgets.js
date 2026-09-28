/**
 * SpendWise AI - Budgets & Threshold Alert Controller
 * Group 18: Shivani Anil, Sreerag C Madhu, Sreya N V
 */

document.addEventListener('DOMContentLoaded', () => {
  Auth.checkAuth(true);

  loadBudgets();
  setupBudgetModal();
});

async function loadBudgets() {
  const container = document.getElementById('budgetsGrid');
  const alertContainer = document.getElementById('budgetAlertList');
  const totalBudgetEl = document.getElementById('totalBudgetAmount');
  const totalSpentEl = document.getElementById('totalSpentAmount');
  const budgetUtilizationEl = document.getElementById('budgetUtilizationRate');

  try {
    const res = await Auth.authFetch('/api/budgets');
    const data = await res.json();

    if (!data.success) return;

    const user = Auth.getUser();
    const curr = user && user.currency === 'INR' ? '₹' : '$';

    if (totalBudgetEl) totalBudgetEl.textContent = `${curr}${data.totalBudget.toLocaleString()}`;
    if (totalSpentEl) totalSpentEl.textContent = `${curr}${data.totalSpent.toLocaleString()}`;

    const utilization = data.totalBudget > 0 ? Math.round((data.totalSpent / data.totalBudget) * 100) : 0;
    if (budgetUtilizationEl) budgetUtilizationEl.textContent = `${utilization}%`;

    // Render Alert Warnings
    if (alertContainer) {
      if (data.alerts && data.alerts.length > 0) {
        alertContainer.style.display = 'flex';
        alertContainer.innerHTML = data.alerts
          .map((a) => {
            const isDanger = a.toLowerCase().includes('over budget');
            return `
              <div class="alert-banner ${isDanger ? 'danger' : ''}" style="margin-bottom: 0.5rem;">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span>${escapeHtml(a)}</span>
              </div>
            `;
          })
          .join('');
      } else {
        alertContainer.style.display = 'none';
      }
    }

    // Render Category Budget Cards
    if (container) {
      if (data.data.length === 0) {
        container.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem 1rem;">
            <i class="fa-solid fa-chart-pie" style="font-size: 2.5rem; margin-bottom: 0.75rem; color: #cbd5e1;"></i>
            <h4>No category budgets set for this month</h4>
            <p style="font-size: 0.85rem; margin-top: 0.35rem;">Click "+ Set Budget Limit" to establish responsible spending targets (SDG 12).</p>
          </div>
        `;
        return;
      }

      container.innerHTML = data.data
        .map((b) => {
          const badgeClass = b.status; // normal, warning, exceeded
          let badgeText = 'Normal';
          if (b.status === 'warning') badgeText = 'Approaching Limit';
          if (b.status === 'exceeded') badgeText = 'Over Budget';

          const pctClamped = Math.min(100, b.percentage);

          return `
            <div class="budget-item">
              <div class="budget-item-top">
                <span>${escapeHtml(b.category)}</span>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span class="status-badge ${badgeClass}">${badgeText}</span>
                  <button class="btn-subtle" style="padding: 0.2rem 0.5rem; border-radius: 4px; color: var(--expense-color);" onclick="deleteBudget('${b._id}', '${escapeHtml(b.category)}')">
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </div>
              <div class="budget-track">
                <div class="budget-fill ${badgeClass}" style="width: ${pctClamped}%;"></div>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: var(--text-muted); margin-top: 0.2rem;">
                <span>Spent: <strong>${curr}${b.spent.toLocaleString()}</strong> of ${curr}${b.limit.toLocaleString()}</span>
                <span><strong>${b.percentage}%</strong> used</span>
              </div>
            </div>
          `;
        })
        .join('');
    }
  } catch (err) {
    console.error('Error fetching budgets:', err);
  }
}

function setupBudgetModal() {
  const modal = document.getElementById('budgetModal');
  const openBtn = document.getElementById('openAddBudgetBtn');
  const closeBtn = document.getElementById('closeBudgetModalBtn');
  const cancelBtn = document.getElementById('cancelBudgetBtn');
  const form = document.getElementById('budgetForm');

  if (!modal || !form) return;

  if (openBtn) openBtn.addEventListener('click', () => modal.classList.add('active'));
  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  if (cancelBtn) cancelBtn.addEventListener('click', () => modal.classList.remove('active'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const category = document.getElementById('budgetCategory').value;
    const limit = parseFloat(document.getElementById('budgetLimit').value);

    try {
      const res = await Auth.authFetch('/api/budgets', {
        method: 'POST',
        body: JSON.stringify({ category, limit }),
      });
      const data = await res.json();

      if (data.success) {
        modal.classList.remove('active');
        showToast('Budget limit saved!', 'success');
        form.reset();
        loadBudgets();
      } else {
        showToast(data.error || 'Failed to set budget', 'error');
      }
    } catch {
      showToast('Network error setting budget', 'error');
    }
  });
}

window.deleteBudget = async function (id, category) {
  if (!confirm(`Delete budget limit for "${category}"?`)) return;

  try {
    const res = await Auth.authFetch(`/api/budgets/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Budget removed', 'success');
      loadBudgets();
    } else {
      showToast(data.error || 'Failed to delete budget', 'error');
    }
  } catch {
    showToast('Error removing budget', 'error');
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
