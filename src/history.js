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