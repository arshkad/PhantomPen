// PhantomPen OS — Storage Module
// All data is AES-GCM encrypted before hitting localStorage

const Storage = (() => {
    const PREFIX = 'phantompen_';
    let _passphrase = null;
  
    function setPassphrase(p) { _passphrase = p; }
    function getPassphrase() { return _passphrase; }
    function clearPassphrase() { _passphrase = null; }
  
    async function save(key, value) {
      if (!_passphrase) throw new Error('No passphrase set');
      const json = JSON.stringify(value);
      const enc  = await Crypto.encrypt(json, _passphrase);
      localStorage.setItem(PREFIX + key, enc);
    }
  
    async function load(key) {
      if (!_passphrase) throw new Error('No passphrase set');
      const enc = localStorage.getItem(PREFIX + key);
      if (!enc) return null;
      try {
        const json = await Crypto.decrypt(enc, _passphrase);
        return JSON.parse(json);
      } catch {
        return null;
      }
    }
  
    async function remove(key) {
      localStorage.removeItem(PREFIX + key);
    }
  
    function listKeys(prefix = '') {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX + prefix)) {
          keys.push(k.slice(PREFIX.length));
        }
      }
      return keys;
    }
  
    // Verify passphrase by trying to decrypt the sentinel value
    async function verifyPassphrase(pass) {
      const sentinel = localStorage.getItem(PREFIX + 'sentinel');
      if (!sentinel) return null; // No vault yet
      try {
        const val = await Crypto.decrypt(sentinel, pass);
        return val === 'phantompen_ok';
      } catch {
        return false;
      }
    }
  
    async function initVault(pass) {
      _passphrase = pass;
      const enc = await Crypto.encrypt('phantompen_ok', pass);
      localStorage.setItem(PREFIX + 'sentinel', enc);
    }
    function vaultExists() {
        return !!localStorage.getItem(PREFIX + 'sentinel');
      }
    
      async function exportAll() {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(PREFIX)) {
            data[k] = localStorage.getItem(k);
          }
        }
        return data;
      }
    
      function importAll(data) {
        for (const [k, v] of Object.entries(data)) {
          if (k.startsWith(PREFIX)) localStorage.setItem(k, v);
        }
      }
    
      function wipeAll() {
        const toRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(PREFIX)) toRemove.push(k);
        }
        toRemove.forEach(k => localStorage.removeItem(k));
      }
    
      function storageSize() {
        let total = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(PREFIX)) {
            total += (localStorage.getItem(k) || '').length * 2;
          }
        }
        return total;
      }
    
      return {
        setPassphrase, getPassphrase, clearPassphrase,
        save, load, remove, listKeys,
        verifyPassphrase, initVault, vaultExists,
        exportAll, importAll, wipeAll, storageSize
      };
    })();  