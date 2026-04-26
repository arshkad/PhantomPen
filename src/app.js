// PhantomPen OS — Main App

let autoLockTimer = null;
let settings = { autoLock: 300000 };

// ─── BOOT ───
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    document.getElementById('boot-screen').style.display = 'none';
    showUnlockScreen();
  }, 2800);
});

function showUnlockScreen() {
  const unlock = document.getElementById('unlock-screen');
  unlock.classList.remove('hidden');

  const createBtn = document.getElementById('create-btn');
  if (Storage.vaultExists()) {
    createBtn.style.display = 'none';
    document.querySelector('.unlock-sub').textContent =
      'Enter your passphrase to unlock your encrypted vault.';
  } else {
    createBtn.style.display = 'block';
    document.querySelector('.unlock-sub').textContent =
      'Create a new encrypted vault or unlock an existing one.';
  }

  document.getElementById('passphrase-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') unlockWorkspace();
  });

  document.getElementById('unlock-btn').addEventListener('click', unlockWorkspace);
  document.getElementById('create-btn').addEventListener('click', createVault);
}

async function createVault() {
  const pass = document.getElementById('passphrase-input').value;
  if (!pass || pass.length < 6) {
    document.getElementById('unlock-hint').textContent = 'Passphrase must be at least 6 characters.';
    return;
  }
  await Storage.initVault(pass);
  showToast('Vault created ✓');
  await unlockWorkspace();
}

async function unlockWorkspace() {
  const pass = document.getElementById('passphrase-input').value;
  const hint = document.getElementById('unlock-hint');
  hint.textContent = 'Verifying...';

  if (!Storage.vaultExists()) {
    hint.textContent = 'No vault found. Click "Create New Vault" first.';
    return;
  }

  const ok = await Storage.verifyPassphrase(pass);
  if (!ok) {
    hint.textContent = 'Incorrect passphrase. Try again.';
    document.getElementById('passphrase-input').value = '';
    return;
  }

  Storage.setPassphrase(pass);
  document.getElementById('unlock-screen').classList.add('hidden');
  document.getElementById('workspace').classList.remove('hidden');
  document.getElementById('vault-label').textContent = 'Vault unlocked';
  document.getElementById('passphrase-input').value = '';
  hint.textContent = '';
 // Load settings
 const savedSettings = await Storage.load('settings');
 if (savedSettings) settings = { ...settings, ...savedSettings };
 const autoSel = document.getElementById('autolock-select');
 if (autoSel) autoSel.value = settings.autoLock;

 initEditor();
 initFiles();
 await refreshDocList();
 updateStorageInfo();
 startAutoLock();
 if (typeof initSecureVault === 'function') await initSecureVault();
 showToast('Vault unlocked ✓');
}

function lockWorkspace() {
 Storage.clearPassphrase();
 document.getElementById('workspace').classList.add('hidden');
 document.getElementById('unlock-screen').classList.remove('hidden');
 document.getElementById('unlock-hint').textContent = '';
 clearTimeout(autoLockTimer);
 showToast('Workspace locked 🔒');
}

document.getElementById('lock-btn').addEventListener('click', lockWorkspace);

// ─── AUTO-LOCK ───
function startAutoLock() {
 clearTimeout(autoLockTimer);
 if (!settings.autoLock) return;
 autoLockTimer = setTimeout(lockWorkspace, settings.autoLock);
}

function resetAutoLock() {
 if (settings.autoLock) {
   clearTimeout(autoLockTimer);
   autoLockTimer = setTimeout(lockWorkspace, settings.autoLock);
 }
}

['mousemove', 'keydown', 'click', 'scroll'].forEach(ev =>
 document.addEventListener(ev, resetAutoLock, { passive: true })
);

// ─── PANEL SWITCHING ───
function switchPanel(name) {
 document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
 document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
 const panel = document.getElementById('panel-' + name);
 if (panel) panel.classList.add('active');
 const btn = document.querySelector(`.nav-btn[data-panel="${name}"]`);
 if (btn) btn.classList.add('active');
}

// ─── SETTINGS ───
async function saveSettings() {
 settings.autoLock = parseInt(document.getElementById('autolock-select').value);
 await Storage.save('settings', settings);
 startAutoLock();
 showToast('Settings saved ✓');
}

async function changePassphrase() {
 const oldPass = prompt('Enter current passphrase:');
 if (!oldPass) return;
 const ok = await Storage.verifyPassphrase(oldPass);
 if (!ok) { showToast('Incorrect passphrase', true); return; }

 const newPass = prompt('Enter new passphrase (min 6 chars):');
 if (!newPass || newPass.length < 6) { showToast('Too short', true); return; }

 // Re-encrypt: export all encrypted blobs, decrypt with old, re-encrypt with new
 showToast('Re-encrypting vault... (this may take a moment)');
 const keys = Storage.listKeys('');
 Storage.setPassphrase(oldPass);
 const allData = {};
 for (const k of keys) {
   if (k === 'sentinel') continue;
   const val = await Storage.load(k);
   if (val !== null) allData[k] = val;
 }

 await Storage.initVault(newPass); // re-write sentinel
 Storage.setPassphrase(newPass);
 for (const [k, v] of Object.entries(allData)) {
   await Storage.save(k, v);
 }
 showToast('Passphrase changed ✓');
}

async function exportVault() {
 const data = await Storage.exportAll();
 const json = JSON.stringify(data, null, 2);
 const blob = new Blob([json], { type: 'application/json' });
 const a = document.createElement('a');
 a.href = URL.createObjectURL(blob);
 a.download = 'phantompen-vault-backup-' + Date.now() + '.json';
 a.click();
 showToast('Vault exported ✓');
}

async function importVault() {
 const input = document.createElement('input');
 input.type = 'file'; input.accept = '.json';
 input.onchange = async e => {
   const file = e.target.files[0];
   if (!file) return;
   const text = await file.text();
   try {
     const data = JSON.parse(text);
     if (!confirm('This will merge the backup into your current vault. Continue?')) return;
     Storage.importAll(data);
     await refreshDocList();
     await refreshFileList();
     updateStorageInfo();
     showToast('Vault imported ✓');
   } catch {
     showToast('Invalid backup file', true);
   }
 };
 input.click();
}

function wipeVault() {
 const confirm1 = confirm('⚠ This will permanently delete ALL data in your vault. Are you sure?');
 if (!confirm1) return;
 const confirm2 = prompt('Type "WIPE" to confirm permanent deletion:');
 if (confirm2 !== 'WIPE') { showToast('Wipe cancelled'); return; }
 Storage.wipeAll();
 lockWorkspace();
 showToast('Vault wiped. All data deleted.');
}

// ─── STORAGE INFO ───
function updateStorageInfo() {
 const bytes = Storage.storageSize();
 const keys = Storage.listKeys('doc_');
 const el = document.getElementById('storage-info');
 if (el) el.textContent = `${keys.length} doc${keys.length!==1?'s':''} · ${formatSize(bytes)}`;
}

function formatSize(bytes) {
 if (bytes < 1024) return bytes + ' B';
 if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
 return (bytes / 1048576).toFixed(1) + ' MB';
}

// ─── TOAST ───
let toastTimer = null;
function showToast(msg, isError = false) {
 const t = document.getElementById('toast');
 t.textContent = msg;
 t.classList.remove('hidden', 'error');
 if (isError) t.classList.add('error');
 clearTimeout(toastTimer);
 toastTimer = setTimeout(() => t.classList.add('hidden'), 3000);
}