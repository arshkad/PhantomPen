// PhantomPen OS — Backend Integration
// Handles real file exports via Flask backend, falls back to plain text

const BACKEND = 'http://localhost:5000/api';

function toggleExportMenu() {
  const menu = document.getElementById('export-menu');
  menu.classList.toggle('hidden');
  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', function closeMenu(e) {
      if (!e.target.closest('.export-wrap')) {
        menu.classList.add('hidden');
        document.removeEventListener('click', closeMenu);
      }
    });
  }, 10);
}

async function exportAs(format) {
  document.getElementById('export-menu').classList.add('hidden');

  const title   = document.getElementById('doc-title').value || 'Untitled';
  const html    = document.getElementById('editor').innerHTML || '';
  const content = document.getElementById('editor').innerText || '';

  if (format === 'txt') {
    // Always works — no backend needed
    const blob = new Blob([`${title}\n${'='.repeat(title.length)}\n\n${content}`], { type: 'text/plain' });
    downloadBlob(blob, `${sanitize(title)}.txt`);
    showToast('Exported as .txt ✓');
    return;
  }

  showToast(`Exporting as .${format}...`);

  try {
    const r = await fetch(`${BACKEND}/export/${format}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ title, html, content }),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.error || `Export failed (${r.status})`);
    }

    const blob = await r.blob();
    const ext  = format === 'docx' ? 'docx' : 'pdf';
    downloadBlob(blob, `${sanitize(title)}.${ext}`);
    showToast(`Exported as .${ext} ✓`);
  } catch (e) {
    if (e.message.includes('fetch') || e.message.includes('Failed')) {
      showToast('Backend offline — run python server.py for PDF/DOCX export', true);
      // Fallback to txt
      setTimeout(() => {
        if (confirm('Backend not running. Download as .txt instead?')) exportAs('txt');
      }, 500);
    } else {
      showToast(e.message, true);
    }
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function sanitize(name) {
  return name.replace(/[^a-z0-9\s-_]/gi, '_').trim().replace(/\s+/g, '_');
}

// Override old exportDoc to use new system
function exportDoc() {
  toggleExportMenu();
}
