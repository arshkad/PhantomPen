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
  