/**
 * SpendWise AI - Intelligence & Gemini Advisor Controller
 * Group 18: Shivani Anil, Sreerag C Madhu, Sreya N V
 */

document.addEventListener('DOMContentLoaded', () => {
  Auth.checkAuth(true);

  loadAiInsights();
  setupChat();
});

async function loadAiInsights() {
  const container = document.getElementById('aiReportContainer');
  const modelTag = document.getElementById('aiModelTag');
  const btn = document.getElementById('runAiAuditBtn');

  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
      <div style="width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #0284c7; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 0.75rem auto;"></div>
      <p>Analyzing spending anomalies, category concentration, and generating SDG wealth strategies...</p>
    </div>
  `;

  if (btn) btn.disabled = true;

  try {
    const res = await Auth.authFetch('/api/ai/insights');
    const data = await res.json();

    if (modelTag) {
      modelTag.textContent = data.isLiveAI ? 'Gemini 2.5 Flash (Live)' : 'Spending Anomaly Engine';
    }

    if (!data.success) {
      container.innerHTML = `<div style="color: var(--expense-color); padding: 1rem;">${escapeHtml(data.error || 'Failed to analyze spending.')}</div>`;
      return;
    }

    // If Gemini raw Markdown is returned, render with marked; otherwise render insights list
    if (data.rawMarkdown) {
      container.innerHTML = marked.parse(data.rawMarkdown);
    } else {
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${data.insights
            .map((item) => {
              const isAlert = item.toLowerCase().includes('alert') || item.toLowerCase().includes('higher');
              return `
                <div class="ai-anomaly-box ${isAlert ? 'alert' : ''}">
                  <i class="fa-solid fa-circle-info" style="margin-right: 0.35rem;"></i>
                  ${escapeHtml(item)}
                </div>
              `;
            })
            .join('')}
          ${
            data.message
              ? `<div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.5rem; background: #f8fafc; padding: 0.6rem 0.85rem; border-radius: 8px; border: 1px dashed #cbd5e1;">
                  <i class="fa-solid fa-circle-info" style="color: #0284c7;"></i> ${escapeHtml(data.message)}
                 </div>`
              : ''
          }
        </div>
      `;
    }

    showToast(data.isLiveAI ? 'Gemini 2.5 Flash analysis updated!' : 'Spending anomaly insights updated', 'success');
  } catch (err) {
    container.innerHTML = `<div style="color: var(--expense-color); padding: 1rem;">Network error analyzing spending.</div>`;
  } finally {
    if (btn) btn.disabled = false;
  }
}

function setupChat() {
  const history = document.getElementById('chatHistory');
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendChatBtn');

  if (!input || !sendBtn) return;

  const sendMessage = async () => {
    const q = input.value.trim();
    if (!q) return;

    input.value = '';
    sendBtn.disabled = true;

    // Append user message
    const userMsg = document.createElement('div');
    userMsg.style.cssText = 'display: flex; justify-content: flex-end; margin-bottom: 0.75rem;';
    userMsg.innerHTML = `
      <div style="background: #0284c7; color: #ffffff; padding: 0.65rem 1rem; border-radius: 14px; max-width: 80%; font-size: 0.85rem;">
        ${escapeHtml(q)}
      </div>
    `;
    history.appendChild(userMsg);
    history.scrollTop = history.scrollHeight;

    // Assistant loading bubble
    const aiMsg = document.createElement('div');
    aiMsg.style.cssText = 'display: flex; gap: 0.65rem; margin-bottom: 0.75rem;';
    aiMsg.innerHTML = `
      <div style="width: 28px; height: 28px; border-radius: 50%; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; flex-shrink: 0;">
        <i class="fa-solid fa-robot"></i>
      </div>
      <div class="msg-bubble" style="background: #ffffff; border: 1px solid #e2e8f0; padding: 0.65rem 1rem; border-radius: 14px; font-size: 0.85rem; max-width: 80%;">
        <span style="color: #0284c7;"><i class="fa-solid fa-spinner fa-spin"></i> Consulting Advisor...</span>
      </div>
    `;
    history.appendChild(aiMsg);
    history.scrollTop = history.scrollHeight;

    try {
      const res = await Auth.authFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();

      const bubble = aiMsg.querySelector('.msg-bubble');
      if (data.success) {
        bubble.innerHTML = marked.parse(data.reply);
      } else {
        bubble.innerHTML = `<span style="color: var(--expense-color);">${escapeHtml(data.error || 'Error')}</span>`;
      }
    } catch {
      aiMsg.querySelector('.msg-bubble').textContent = 'Error contacting advisor.';
    } finally {
      sendBtn.disabled = false;
      history.scrollTop = history.scrollHeight;
    }
  };

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  const refreshBtn = document.getElementById('runAiAuditBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', loadAiInsights);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
