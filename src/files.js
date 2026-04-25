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
  