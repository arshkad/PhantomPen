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