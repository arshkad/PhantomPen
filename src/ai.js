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

// ── Chat ──────────────────────────────────────────────────────────────────────
async function sendAIChat() {
    const input  = document.getElementById('ai-chat-input');
    const msg    = input.value.trim();
    if (!msg) return;
  
    input.value = '';
    const editor = document.getElementById('editor');
    const docCtx = editor ? editor.innerText.slice(0, 3000) : '';
  
    // Add user message to UI
    appendChatMessage('user', msg);
    aiChatHistory.push({ role: 'user', content: msg });
  
    // Typing indicator
    const typingId = 'typing-' + Date.now();
    appendChatMessage('assistant', '...', typingId);
  
    try {
      const r = await fetch(`${AI_BASE}/ai/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: aiChatHistory, documentContext: docCtx }),
      });
  
      const el = document.getElementById(typingId);
      if (!r.ok) {
        const err = await r.json();
        if (el) el.textContent = '⚠ ' + (err.error || 'Error');
        return;
      }
  
      const d = await r.json();
      const reply = d.result || '';
      if (el) el.textContent = reply;
      aiChatHistory.push({ role: 'assistant', content: reply });
    } catch (e) {
      const el = document.getElementById(typingId);
      if (el) el.textContent = '⚠ Backend offline — run python server.py';
    }
  }
  
  function appendChatMessage(role, text, id) {
    const box   = document.getElementById('ai-chat-box');
    const empty = box.querySelector('.ai-chat-empty');
    if (empty) empty.remove();
  
    const msg = document.createElement('div');
    msg.className = `ai-chat-msg ai-chat-${role}`;
    msg.textContent = text;
    if (id) msg.id = id;
    box.appendChild(msg);
    box.scrollTop = box.scrollHeight;
  }
  
  // Init: check status when AI panel is opened
  document.addEventListener('DOMContentLoaded', () => {
    // Poll status every 10s
    checkAIStatus();
    setInterval(checkAIStatus, 10000);
  });  
