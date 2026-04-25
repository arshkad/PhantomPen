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
