// PhantomPen OS — AI Assistant Frontend
// Talks to the local Flask as well as Ollama backend at localhost:5000

const AI_BASE = 'http://localhost:5000/api';
let aiChatHistory = [];
let lastAIResult  = '';

// ── Status check ─────────────────────────────────────────────────────────────
async function checkAIStatus() {
  const dot  = document.getElementById('ai-status-dot');
  const text = document.getElementById('ai-status-text');
  const link = document.getElementById('ai-install-link');
  if (!dot) return;

  try {
    const r = await fetch(`${AI_BASE}/status`, { signal: AbortSignal.timeout(2000) });
    const d = await r.json();
    if (d.server === 'ok' && d.ollama) {
      dot.style.color  = 'var(--accent)';
      text.textContent = `Connected · model: ${d.model}`;
      link.style.display = 'none';
    } else if (d.server === 'ok') {
      dot.style.color  = 'var(--warn)';
      text.textContent = 'Server running but Ollama not found — run: ollama serve';
      link.style.display = 'inline';
    }
  } catch {
    dot.style.color  = 'var(--danger)';
    text.textContent = 'Backend offline — run: python server.py';
    link.style.display = 'none';
  }
}

// ── Quick AI actions (toolbar + panel buttons) ────────────────────────────────
async function quickAI(mode) {
  const editor  = document.getElementById('editor');
  const sel     = window.getSelection();
  const context = sel && sel.toString().trim()
    ? sel.toString()
    : (editor ? editor.innerText : '');

  if (!context.trim()) {
    showToast('Write something first!', true);
    return;
  }

  const modeLabels = {
    continue:   '✨ Continuing...',
    improve:    '⚡ Improving...',
    summarise:  '📋 Summarising...',
    brainstorm: '💡 Brainstorming...',
    fixgrammar: '✓ Fixing grammar...',
  };

  showToast(modeLabels[mode] || 'Thinking...');
  showAISpinner(modeLabels[mode]);

  try {
    const r = await fetch(`${AI_BASE}/ai/complete`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ mode, context, prompt: '' }),
    });

    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.error || 'Server error');
    }

    const d = await r.json();
    lastAIResult = d.result || '';
    showAIResult(mode, lastAIResult);
    showToast('AI done ✓');
  } catch (e) {
    hideAISpinner();
    showToast(e.message.includes('fetch') ? 'Backend offline — run python server.py' : e.message, true);
  }
}

function showAIResult(mode, text) {
  const wrap  = document.getElementById('ai-result-wrap');
  const label = document.getElementById('ai-result-label');
  const body  = document.getElementById('ai-result-body');
  const modeNames = {
    continue: 'Continuation', improve: 'Improved text',
    summarise: 'Summary', brainstorm: 'Ideas', fixgrammar: 'Fixed text',
  };
  label.textContent = modeNames[mode] || 'AI suggestion';
  body.textContent  = text;
  wrap.classList.remove('hidden');
  hideAISpinner();
  // If we're not on AI panel, switch to editor and scroll result into view
  wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function insertAIResult() {
  if (!lastAIResult) return;
  const editor = document.getElementById('editor');
  editor.focus();
  document.execCommand('insertText', false, '\n' + lastAIResult);
  dismissAIResult();
  switchPanel('editor');
  showToast('Inserted into document ✓');
}

function dismissAIResult() {
  document.getElementById('ai-result-wrap').classList.add('hidden');
  lastAIResult = '';
}

function showAISpinner(msg) {
  const wrap = document.getElementById('ai-result-wrap');
  const body = document.getElementById('ai-result-body');
  const label = document.getElementById('ai-result-label');
  label.textContent = msg || 'Thinking...';
  body.innerHTML = '<span class="ai-spinner"></span>';
  wrap.classList.remove('hidden');
}

function hideAISpinner() {
  // spinner is replaced by actual content via showAIResult
}
