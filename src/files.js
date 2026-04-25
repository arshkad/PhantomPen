// PhantomPen OS — Files Module

function initFiles() {
    const fileInput = document.getElementById('file-input');
    const dropZone  = document.getElementById('drop-zone');
  
    fileInput.addEventListener('change', e => handleFiles(e.target.files));
  
    dropZone.addEventListener('dragover', e => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      handleFiles(e.dataTransfer.files);
    });
  
    refreshFileList();
  }
  
  async function handleFiles(fileList) {
    for (const file of fileList) {
      await encryptAndStoreFile(file);
    }
    refreshFileList();
    updateStorageInfo();
    showToast(`${fileList.length} file(s) encrypted & stored`);
  }
  
  async function encryptAndStoreFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const b64 = btoa(String.fromCharCode(...uint8));
  
    const fileData = {
      id: 'file_' + Date.now() + '_' + Math.random().toString(36).slice(2),
      name: file.name,
      type: file.type,
      size: file.size,
      storedAt: Date.now(),
      data: b64
    };
  
    await Storage.save('file_' + fileData.id, fileData);
  }
  
  async function refreshFileList() {
    const keys = Storage.listKeys('file_file_');
    const listEl = document.getElementById('file-list');
    if (!listEl) return;
  
    const files = [];
    for (const k of keys) {
      const f = await Storage.load(k);
      if (f) files.push(f);
    }
    files.sort((a, b) => b.storedAt - a.storedAt);
  
    if (files.length === 0) {
      listEl.innerHTML = '<div class="empty-state">No files stored yet. Upload something above.</div>';
      return;
    }
    listEl.innerHTML = files.map(f => `
        <div class="file-item">
          <span class="file-icon">${fileIcon(f.type)}</span>
          <div class="file-info">
            <div class="file-name">${escapeHtml(f.name)}</div>
            <div class="file-meta">${formatSize(f.size)} · ${new Date(f.storedAt).toLocaleDateString()}</div>
          </div>
          <div class="file-actions">
            <button class="file-action-btn" onclick="downloadFile('${f.id}')">Download</button>
            <button class="file-action-btn danger" onclick="deleteFile('${f.id}')">Delete</button>
          </div>
        </div>
      `).join('');
    }
    
    async function downloadFile(fileId) {
      const f = await Storage.load('file_file_' + fileId.replace('file_',''));
      if (!f) { showToast('File not found', true); return; }
      // Convert base64 back to blob
      const binary = atob(f.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: f.type || 'application/octet-stream' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = f.name;
      a.click();
      showToast('File decrypted & downloaded');
    }
    
    async function deleteFile(fileId) {
      if (!confirm('Delete this file? Cannot be undone.')) return;
      const key = 'file_file_' + fileId.replace('file_','');
      await Storage.remove(key);
      refreshFileList();
      updateStorageInfo();
      showToast('File deleted');
    }
    
    function fileIcon(type = '') {
      if (type.startsWith('image/')) return '🖼️';
      if (type === 'application/pdf') return '📕';
      if (type.startsWith('video/')) return '🎬';
      if (type.startsWith('audio/')) return '🎵';
      if (type.includes('zip') || type.includes('tar')) return '📦';
      if (type.startsWith('text/')) return '📄';
      return '📎';
    }
    
    function formatSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1048576).toFixed(1) + ' MB';
    }
      