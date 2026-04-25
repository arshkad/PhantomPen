// PhantomPen OS — Crypto Module
// AES-GCM 256-bit encryption via Web Crypto API

const Crypto = (() => {
    const ENC = new TextEncoder();
    const DEC = new TextDecoder();
  
    async function deriveKey(passphrase, salt) {
      const keyMaterial = await crypto.subtle.importKey(
        'raw', ENC.encode(passphrase), 'PBKDF2', false, ['deriveKey']
      );
      return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false, ['encrypt', 'decrypt']
      );
    }
  
    async function encrypt(plaintext, passphrase) {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv   = crypto.getRandomValues(new Uint8Array(12));
      const key  = await deriveKey(passphrase, salt);
      const enc  = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv }, key, ENC.encode(plaintext)
      );
      const buf = new Uint8Array(salt.byteLength + iv.byteLength + enc.byteLength);
      buf.set(salt, 0);
      buf.set(iv, 16);
      buf.set(new Uint8Array(enc), 28);
      return btoa(String.fromCharCode(...buf));
    }
    async function decrypt(cipherB64, passphrase) {
        const buf  = Uint8Array.from(atob(cipherB64), c => c.charCodeAt(0));
        const salt = buf.slice(0, 16);
        const iv   = buf.slice(16, 28);
        const data = buf.slice(28);
        const key  = await deriveKey(passphrase, salt);
        const dec  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
        return DEC.decode(dec);
      }
    
      // Fast encrypt with a pre-derived raw key (for share links)
      async function encryptWithKey(plaintext, rawKeyB64) {
        const rawKey = Uint8Array.from(atob(rawKeyB64), c => c.charCodeAt(0));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt']);
        const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, ENC.encode(plaintext));
        const buf = new Uint8Array(iv.byteLength + enc.byteLength);
        buf.set(iv, 0); buf.set(new Uint8Array(enc), 12);
        return btoa(String.fromCharCode(...buf));
      }
    
      async function decryptWithKey(cipherB64, rawKeyB64) {
        const rawKey = Uint8Array.from(atob(rawKeyB64), c => c.charCodeAt(0));
        const buf = Uint8Array.from(atob(cipherB64), c => c.charCodeAt(0));
        const iv   = buf.slice(0, 12);
        const data = buf.slice(12);
        const key  = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['decrypt']);
        const dec  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
        return DEC.decode(dec);
      }
    
      function generateKey() {
        const key = crypto.getRandomValues(new Uint8Array(32));
        return btoa(String.fromCharCode(...key));
      }
    
      return { encrypt, decrypt, encryptWithKey, decryptWithKey, generateKey };
    })();
      