// PhantomPen OS — Secure Vault
// Combines Breach Detection (Integrity) + Panic Button (Availability/Privacy)

// ─── BREACH DETECTION ────────────────────────────────────────────────────────

const IntegrityMonitor = (() => {
    const HASH_PREFIX  = 'pp_integrity_';
    const CHECK_INTERVAL = 15000; // check every 15 seconds
    let monitorTimer = null;
    let breachCallback = null;
  
    // Compute SHA-256 hash of a string
    async function sha256(str) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  
    // Record a hash snapshot of a storage key's raw value
    async function snapshot(key) {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const hash = await sha256(raw);
      localStorage.setItem(HASH_PREFIX + key, hash);
    }
  
    // Verify a key hasn't been tampered with
    async function verify(key) {
      const raw      = localStorage.getItem(key);
      const expected = localStorage.getItem(HASH_PREFIX + key);
      if (!raw || !expected) return true; // no snapshot = no check
      const actual = await sha256(raw);
      return actual === expected;
    }
  
    // Snapshot all phantompen keys
    async function snapshotAll() {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('phantompen_') && !k.startsWith(HASH_PREFIX)) {
          await snapshot(k);
        }
      }
    }
  
    // Verify all phantompen keys
    async function verifyAll() {
      const tampered = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('phantompen_') && !k.startsWith(HASH_PREFIX)) {
          const ok = await verify(k);
          if (!ok) tampered.push(k);
        }
      }
      return tampered;
    }
  
    // Start background monitoring
    function startMonitoring(onBreach) {
      breachCallback = onBreach;
      monitorTimer = setInterval(async () => {
        const tampered = await verifyAll();
        if (tampered.length > 0 && breachCallback) {
          breachCallback(tampered);
        }
      }, CHECK_INTERVAL);
    }
  
    function stopMonitoring() {
      clearInterval(monitorTimer);
    }
  
    function clearHashes() {
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(HASH_PREFIX)) toRemove.push(k);
      }
      toRemove.forEach(k => localStorage.removeItem(k));
    }
  
    return { snapshotAll, verifyAll, startMonitoring, stopMonitoring, clearHashes, sha256 };
  })();
  