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
  