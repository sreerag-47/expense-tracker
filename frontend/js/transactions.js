/**
 * SpendWise AI - Transactions Ledger Controller
 * Group 18: Shivani Anil, Sreerag C Madhu, Sreya N V
 */

document.addEventListener('DOMContentLoaded', () => {
  Auth.checkAuth(true);

  loadTransactions();
  setupFilters();
  setupTransactionModal();
});

let currentFilterType = 'all';

async function loadTransactions() {
  const tbody = document.getElementById('txTableBody');
  const countBadge = document.getElementById('txCountBadge');
  const search = document.getElementById('txSearchInput')?.value.trim();
  const category = document.getElementById('txCategoryFilter')?.value;

  const params = new URLSearchParams();
  if (currentFilterType !== 'all') params.append('type', currentFilterType);
  if (category && category !== 'all') params.append('category', category);
  if (search) params.append('search', search);

  try {
    const res = await Auth.authFetch(`/api/transactions?${params.toString()}`);
    const data = await res.json();

    if (!data.success || !tbody) return;

    if (countBadge) countBadge.textContent = `${data.count} items`;

    if (data.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">No matching transactions found.</td></tr>`;
      return;
    }

    const user = Auth.getUser();
    const curr = user && user.currency === 'INR' ? '₹' : '$';

    tbody.innerHTML = data.data
      .map((tx) => {
        const d = new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const isInc = tx.type === 'income';
        const color = isInc ? 'var(--income-color)' : 'var(--expense-color)';
        const sign = isInc ? '+' : '-';
        const title = tx.description || tx.title || 'Untitled';

        return `
          <tr>
            <td>
              <div style="font-weight: 700;">${escapeHtml(title)}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(tx.category)}</div>
            </td>
            <td><span class="cat-badge">${escapeHtml(tx.category)}</span></td>
            <td>${d}</td>
            <td style="color: ${color}; font-weight: 800; text-align: right;">${sign}${curr}${Number(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td style="text-align: center;">
              <button class="btn-subtle" style="padding: 0.25rem 0.6rem; font-size: 0.75rem; border-radius: 6px;" onclick="editTx('${tx._id}', '${escapeHtml(title)}', ${tx.amount}, '${tx.type}', '${tx.category}', '${tx.date.split('T')[0]}')">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="btn-subtle" style="padding: 0.25rem 0.6rem; font-size: 0.75rem; border-radius: 6px; color: var(--expense-color);" onclick="deleteTx('${tx._id}', '${escapeHtml(title)}')">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </td>
          </tr>
        `;
      })
      .join('');
  } catch (err) {
    console.error('Error fetching transactions:', err);
  }
}

function setupFilters() {
  const searchInput = document.getElementById('txSearchInput');
  const catFilter = document.getElementById('txCategoryFilter');
  const typePills = document.querySelectorAll('.type-pill');
  const resetBtn = document.getElementById('txResetBtn');

  let debounceTimer;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(loadTransactions, 250);
    });
  }

  if (catFilter) catFilter.addEventListener('change', loadTransactions);

  typePills.forEach((pill) => {
    pill.addEventListener('click', () => {
      typePills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilterType = pill.dataset.type;
      loadTransactions();
    });
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (catFilter) catFilter.value = 'all';
      currentFilterType = 'all';
      typePills.forEach((p) => p.classList.remove('active'));
      if (typePills[0]) typePills[0].classList.add('active');
      loadTransactions();
    });
  }
}

function setupTransactionModal() {
  const modal = document.getElementById('txModal');
  const openBtn = document.getElementById('openAddTxBtn');
  const closeBtn = document.getElementById('closeTxModalBtn');
  const cancelBtn = document.getElementById('cancelTxBtn');
  const form = document.getElementById('txForm');

  if (!modal || !form) return;

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      document.getElementById('txModalTitle').innerHTML = '<i class="fa-solid fa-circle-plus"></i> New Transaction';
      document.getElementById('txIdField').value = '';
      form.reset();
      document.querySelector('input[name="txType"][value="expense"]').checked = true;
      document.getElementById('txDate').value = new Date().toISOString().split('T')[0];
      modal.classList.add('active');
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  if (cancelBtn) cancelBtn.addEventListener('click', () => modal.classList.remove('active'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('txIdField').value;
    const isEdit = Boolean(id);

    const payload = {
      description: document.getElementById('txTitle').value.trim(),
      amount: parseFloat(document.getElementById('txAmount').value),
      type: document.querySelector('input[name="txType"]:checked').value,
      category: document.getElementById('txCategory').value,
      date: document.getElementById('txDate').value,
    };

    try {
      const url = isEdit ? `/api/transactions/${id}` : '/api/transactions';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await Auth.authFetch(url, {
        method,
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        modal.classList.remove('active');
        showToast(isEdit ? 'Transaction updated' : 'Transaction created', 'success');
        loadTransactions();
      } else {
        showToast(data.error || 'Failed to save', 'error');
      }
    } catch {
      showToast('Error saving transaction', 'error');
    }
  });
}

window.editTx = function (id, title, amount, type, category, date) {
  const modal = document.getElementById('txModal');
  if (!modal) return;

  document.getElementById('txModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Transaction';
  document.getElementById('txIdField').value = id;
  document.getElementById('txTitle').value = title;
  document.getElementById('txAmount').value = amount;
  document.querySelector(`input[name="txType"][value="${type}"]`).checked = true;
  document.getElementById('txCategory').value = category;
  document.getElementById('txDate').value = date;

  modal.classList.add('active');
};

window.deleteTx = async function (id, title) {
  if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

  try {
    const res = await Auth.authFetch(`/api/transactions/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Transaction deleted', 'success');
      loadTransactions();
    } else {
      showToast(data.error || 'Failed to delete', 'error');
    }
  } catch {
    showToast('Error deleting transaction', 'error');
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
