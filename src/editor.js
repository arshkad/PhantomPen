// PhantomPen OS — Editor Module

let currentDocId = null;
let autoSaveTimer = null;
let isDirty = false;

function initEditor() {
  const editor = document.getElementById('editor');
  const titleInput = document.getElementById('doc-title');

  editor.addEventListener('input', () => {
    updateWordCount();
    markDirty();
    scheduleAutoSave();
  });

  titleInput.addEventListener('input', () => {
    markDirty();
    scheduleAutoSave();
  });

  updateWordCount();
}

function markDirty() {
  isDirty = true;
  const ind = document.getElementById('save-indicator');
  if (ind) { ind.classList.add('unsaved'); ind.classList.remove('saved'); }
}

function markClean() {
  isDirty = false;
  const ind = document.getElementById('save-indicator');
  if (ind) { ind.classList.remove('unsaved'); ind.classList.add('saved'); }
  const ls = document.getElementById('last-saved');
  if (ls) ls.textContent = 'Saved ' + new Date().toLocaleTimeString();
}

function scheduleAutoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => saveCurrentDoc(true), 2000);
}

function updateWordCount() {
  const editor = document.getElementById('editor');
  const text = editor.innerText || '';
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  const wc = document.getElementById('word-count');
  const cc = document.getElementById('char-count');
  if (wc) wc.textContent = words + ' word' + (words !== 1 ? 's' : '');
  if (cc) cc.textContent = chars + ' char' + (chars !== 1 ? 's' : '');
}

function formatText(cmd) {
  document.execCommand(cmd, false, null);
  document.getElementById('editor').focus();
}

function insertHeading(level) {
  document.execCommand('formatBlock', false, `h${level}`);
  document.getElementById('editor').focus();
}

function insertCodeBlock() {
  const sel = window.getSelection();
  const text = sel.toString();
  document.execCommand('insertHTML', false,
    text ? `<code>${text}</code>` : '<pre><code>// code here</code></pre>'
  );
  document.getElementById('editor').focus();
}

async function saveCurrentDoc(silent = false) {
  if (!currentDocId) {
    currentDocId = 'doc_' + Date.now();
  }
  const title   = document.getElementById('doc-title').value || 'Untitled';
  const content = document.getElementById('editor').innerHTML;
  const text    = document.getElementById('editor').innerText || '';

  const doc = { id: currentDocId, title, content, updatedAt: Date.now() };
  await Storage.save('doc_' + currentDocId, doc);

  // Save a history snapshot
  await saveHistorySnapshot(currentDocId, title, text.slice(0, 200));

  markClean();
  refreshDocList();
  updateStorageInfo();
  if (!silent) showToast('Document saved ✓');
}
async function loadDoc(docId) {
    const doc = await Storage.load('doc_' + docId);
    if (!doc) return;
    currentDocId = docId;
    document.getElementById('doc-title').value = doc.title || '';
    document.getElementById('editor').innerHTML = doc.content || '';
    updateWordCount();
    markClean();
    document.getElementById('last-saved').textContent =
      'Last saved ' + new Date(doc.updatedAt).toLocaleString();
  
    // Update active state in list
    document.querySelectorAll('.doc-item').forEach(el => {
      el.classList.toggle('active', el.dataset.id === docId);
    });
    switchPanel('editor');
  }
  
  function newDocument() {
    currentDocId = null;
    document.getElementById('doc-title').value = '';
    document.getElementById('editor').innerHTML = '';
    document.getElementById('last-saved').textContent = 'Not saved';
    updateWordCount();
    document.querySelectorAll('.doc-item').forEach(el => el.classList.remove('active'));
    switchPanel('editor');
    document.getElementById('editor').focus();
  }
  
  async function deleteDoc(docId) {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    await Storage.remove('doc_' + docId);
    // Remove history too
    const hkeys = Storage.listKeys('history_' + docId);
    for (const k of hkeys) await Storage.remove(k);
  
    if (currentDocId === docId) newDocument();
    refreshDocList();
    updateStorageInfo();
    showToast('Document deleted');
  }
  
  async function refreshDocList() {
    const keys = Storage.listKeys('doc_');
    const list = document.getElementById('doc-list');
    const docs = [];
    for (const k of keys) {
      const doc = await Storage.load(k);
      if (doc) docs.push(doc);
    }
    docs.sort((a, b) => b.updatedAt - a.updatedAt);
  
    list.innerHTML = docs.map(d => `
      <div class="doc-item ${d.id === currentDocId ? 'active' : ''}" data-id="${d.id}" onclick="loadDoc('${d.id}')">
        <span>📄</span>
        <span class="doc-item-name">${escapeHtml(d.title || 'Untitled')}</span>
        <button class="doc-delete" onclick="event.stopPropagation(); deleteDoc('${d.id}')" title="Delete">✕</button>
      </div>
    `).join('');
  
    // Refresh history & share selects
    const histSel = document.getElementById('history-doc-select');
    const shareSel = document.getElementById('share-doc-select');
    [histSel, shareSel].forEach(sel => {
      if (!sel) return;
      const cur = sel.value;
      sel.innerHTML = '<option value="">— Select document —</option>' +
        docs.map(d => `<option value="${d.id}" ${d.id===cur?'selected':''}>${escapeHtml(d.title||'Untitled')}</option>`).join('');
    });
  }
  
  function exportDoc() {
    const title   = document.getElementById('doc-title').value || 'untitled';
    const content = document.getElementById('editor').innerText || '';
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = title.replace(/[^a-z0-9]/gi, '_') + '.txt';
    a.click();
    showToast('Exported as .txt');
  }
  
  function escapeHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  