// Helper: convert base64 string to ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

// Helper: convert ArrayBuffer to base64 string
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach(b => binary += String.fromCharCode(b));
  return window.btoa(binary);
}

// Generate AES key
async function generateAESKey() {
  return await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

// Encrypt content with AES-GCM
async function encryptWithAESKey(aesKey, plaintext) {
  const enc = new TextEncoder();
  const encoded = enc.encode(plaintext);

  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12-byte IV for AES-GCM

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    aesKey,
    encoded
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

// Import recipient's public key (assumed to be base64 PEM or SPKI)
async function importPublicKey(pemBase64) {
  // Remove PEM header/footer if present, and decode base64
  const binaryDer = base64ToArrayBuffer(pemBase64.replace(/-----(BEGIN|END) PUBLIC KEY-----/g, '').replace(/\s/g, ''));

  return await window.crypto.subtle.importKey(
    "spki",
    binaryDer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
}

// Encrypt AES key with recipient's RSA public key
async function encryptAESKeyWithRSA(publicKey, aesKey) {
  const rawKey = await window.crypto.subtle.exportKey("raw", aesKey);
  const encryptedKey = await window.crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    publicKey,
    rawKey
  );
  return arrayBufferToBase64(encryptedKey);
}
export async function decryptAESKeyWithRSA(privateKey, encryptedAESKeyBase64) {
  const encryptedAESKey = Uint8Array.from(atob(encryptedAESKeyBase64), c => c.charCodeAt(0));

  const aesKeyBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'RSA-OAEP',
    },
    privateKey,
    encryptedAESKey
  );

  return await window.crypto.subtle.importKey(
    'raw',
    aesKeyBuffer,
    'AES-GCM',
    true,
    ['encrypt', 'decrypt']
  );
}
export async function decryptWithAESKey(aesKey, encryptedContentBase64, ivBase64) {
  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
  const encryptedContent = Uint8Array.from(atob(encryptedContentBase64), c => c.charCodeAt(0));

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    aesKey,
    encryptedContent
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}
// The main helper to encrypt message content and prepare data to send
async function encryptMessage(plaintext, recipientPublicKeyBase64) {
  const publicKey = await importPublicKey(recipientPublicKeyBase64);
  const aesKey = await generateAESKey();
  const { ciphertext, iv } = await encryptWithAESKey(aesKey, plaintext);
  const encryptedAESKey = await encryptAESKeyWithRSA(publicKey, aesKey);

  return {
    encryptedContent: ciphertext,
    encryptedAESKey: encryptedAESKey,
    iv: iv,
  };
}

export async function encryptMessageDual(plaintext, recipientPublicKeyBase64, senderPublicKeyBase64) {
  const recipientPublicKey = await importPublicKey(recipientPublicKeyBase64);
  const senderPublicKey = await importPublicKey(senderPublicKeyBase64);

  const aesKey = await generateAESKey();

  const { ciphertext, iv } = await encryptWithAESKey(aesKey, plaintext);

  const encryptedAESKeyForRecipient = await encryptAESKeyWithRSA(recipientPublicKey, aesKey);
  const encryptedAESKeyForSender = await encryptAESKeyWithRSA(senderPublicKey, aesKey);

  return {
    encryptedContent: ciphertext,
    encryptedAESKeyForRecipient,
    encryptedAESKeyForSender,
    iv,
  };
}

export async function decryptMessage(encryptedContent, encryptedAESKey, ivBase64, privateKey) {

  const aesKey = await decryptAESKeyWithRSA(privateKey, encryptedAESKey);

  const plaintext = await decryptWithAESKey(aesKey, encryptedContent, ivBase64);

  return plaintext;
}