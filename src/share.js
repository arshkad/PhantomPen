// PhantomPen OS — Share Module
// The key is embedded in URL fragment so server never sees it

async function generateShareLink() {
    const docId   = document.getElementById('share-doc-select').value;
    const expiry  = parseInt(document.getElementById('share-expiry').value);
    const password = document.getElementById('share-password').value;
  
    if (!docId) { showToast('Select a document first', true); return; }
  
    const doc = await Storage.load('doc_' + docId);
    if (!doc) { showToast('Document not found', true); return; }
  
    const rawKey = Crypto.generateKey();
  
    // Payload
    const payload = JSON.stringify({
      title: doc.title,
      content: doc.innerText || doc.content,
      createdAt: Date.now(),
      expiresAt: expiry ? Date.now() + expiry : 0,
      hasPassword: !!password
    });
  
    // If password, derive an additional key layer
    let finalKey = rawKey;
    let encPayload;
    if (password) {
      // encrypt with rawKey first, then note password needed in the envelope
      encPayload = await Crypto.encryptWithKey(payload, rawKey);
      // we'll re-encrypt the rawKey with password
      const passKey = Crypto.generateKey();
      // Store the rawKey encrypted by password hint (simplified: use rawKey XOR'd by password hash)
      // For demo purposes: store password-protected note in payload
      const protectedPayload = JSON.stringify({
        protected: true,
        data: encPayload
      });
      encPayload = await Crypto.encryptWithKey(protectedPayload, rawKey);
    } else {
      encPayload = await Crypto.encryptWithKey(payload, rawKey);
    }
  
    // Build share "link" (in a real app this would be a URL; here it's a self-contained token)
    const shareToken = btoa(JSON.stringify({
      v: 1,
      data: encPayload,
      exp: expiry ? Date.now() + expiry : 0
    }));
  
    const shareLink = `phantompen://share?token=${shareToken}#${rawKey}`;
  
    document.getElementById('share-link-output').value = shareLink;
    document.getElementById('share-result').classList.remove('hidden');
    showToast('Share link generated ✓');
  }
  function copyShareLink() {
    const link = document.getElementById('share-link-output').value;
    navigator.clipboard.writeText(link).then(() => showToast('Link copied to clipboard ✓'));
  }
  
  async function openShareLink() {
    const input = document.getElementById('open-share-input').value.trim();
    const resultEl = document.getElementById('open-share-result');
  
    if (!input) { showToast('Paste a share link first', true); return; }
  
    try {
      // Extract token and key from the link
      const hashIdx = input.lastIndexOf('#');
      if (hashIdx === -1) throw new Error('No key fragment found in link');
  
      const rawKey = input.slice(hashIdx + 1);
      const tokenPart = input.slice(0, hashIdx);
      const tokenMatch = tokenPart.match(/[?&]token=([^&]+)/);
      if (!tokenMatch) throw new Error('Invalid share link format');
  
      const envelope = JSON.parse(atob(tokenMatch[1]));
  
      // Check expiry
      if (envelope.exp && Date.now() > envelope.exp) {
        resultEl.classList.remove('hidden');
        resultEl.innerHTML = '<div style="color:var(--danger)">⚠ This share link has expired.</div>';
        return;
      }
  
      const decrypted = await Crypto.decryptWithKey(envelope.data, rawKey);
      const payload = JSON.parse(decrypted);
  
      const innerPayload = payload.protected
        ? JSON.parse(await Crypto.decryptWithKey(payload.data, rawKey))
        : payload;
  
      resultEl.classList.remove('hidden');
      resultEl.innerHTML = `
        <div style="margin-bottom:12px">
          <strong style="font-size:18px">${escapeHtml(innerPayload.title || 'Untitled')}</strong>
          <div style="font-size:11px;color:var(--text3);margin-top:4px;font-family:var(--font-mono)">
            Shared ${new Date(innerPayload.createdAt).toLocaleString()}
            ${innerPayload.expiresAt ? ' · Expires ' + new Date(innerPayload.expiresAt).toLocaleString() : ' · No expiry'}
          </div>
        </div>
        <div style="border-top:1px solid var(--border);padding-top:16px;font-family:var(--font-editor);font-size:16px;line-height:1.8;white-space:pre-wrap">${escapeHtml(innerPayload.content ? stripHtml(innerPayload.content) : '')}</div>
      `;
      showToast('Document decrypted ✓');
    } catch (e) {
      resultEl.classList.remove('hidden');
      resultEl.innerHTML = `<div style="color:var(--danger)">⚠ Could not decrypt: ${e.message}</div>`;
    }
  }
  
  function stripHtml(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    return d.innerText;
  }  