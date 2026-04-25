// PhantomPen OS — History Module

async function saveHistorySnapshot(docId, title, preview) {
    const snapId = 'history_' + docId + '_' + Date.now();
    const content = document.getElementById('editor').innerHTML;
    const snap = {
      id: snapId,
      docId,
      title,
      preview: preview.replace(/<[^>]*>/g, '').slice(0, 150),
      content,
      savedAt: Date.now()
    };
    await Storage.save(snapId, snap);
  
    // Keep only last 20 snapshots per doc
    const allSnaps = Storage.listKeys('history_' + docId + '_');
    if (allSnaps.length > 20) {
      const sorted = allSnaps.sort();
      const toDelete = sorted.slice(0, allSnaps.length - 20);
      for (const k of toDelete) await Storage.remove(k);
    }
  }
  async function loadHistory() {
    const docId = document.getElementById('history-doc-select').value;
    const listEl = document.getElementById('history-list');
    if (!docId) {
      listEl.innerHTML = '<div class="empty-state">Select a document to view its history.</div>';
      return;
    }
  
    const keys = Storage.listKeys('history_' + docId + '_');
    const snaps = [];
    for (const k of keys) {
      const s = await Storage.load(k);
      if (s) snaps.push(s);
    }
    snaps.sort((a, b) => b.savedAt - a.savedAt);
  
    if (snaps.length === 0) {
      listEl.innerHTML = '<div class="empty-state">No history yet. Save the document first.</div>';
      return;
    }
  
    listEl.innerHTML = snaps.map((s, i) => `
      <div class="history-item">
        <div>
          <div class="history-time">${formatRelTime(s.savedAt)}</div>
          <div style="font-size:10px;color:var(--text3);font-family:var(--font-mono)">${new Date(s.savedAt).toLocaleString()}</div>
        </div>
        <div class="history-preview">${escapeHtml(s.preview || '(empty)')}</div>
        ${i === 0 ? '<span style="font-size:11px;color:var(--accent);padding:4px 8px;border:1px solid var(--accent);border-radius:4px;">Current</span>' :
          `<button class="history-restore" onclick="restoreSnapshot('${s.id}')">Restore</button>`}
      </div>
    `).join('');
  }
  
  async function restoreSnapshot(snapId) {
    if (!confirm('Restore this version? The current content will be replaced.')) return;
    const snap = await Storage.load(snapId);
    if (!snap) { showToast('Snapshot not found', true); return; }
    document.getElementById('editor').innerHTML = snap.content;
    updateWordCount();
    markDirty();
    switchPanel('editor');
    showToast('Version restored ✓');
  }
  
  function formatRelTime(ts) {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 1) return 'Just now';
    if (m < 60) return m + 'm ago';
    if (h < 24) return h + 'h ago';
    return d + 'd ago';
  }