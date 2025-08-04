// utils/cryptoHelpers.js

// Convert text to ArrayBuffer
function strToBuffer(str) {
  return new TextEncoder().encode(str);
}

// Convert ArrayBuffer to Base64
export function bufferToBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

// Convert Base64 to ArrayBuffer
export function base64ToBuffer(base64) {
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer;
}

// Generate RSA-OAEP key pair
export async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  return keyPair;
}

// Derive a symmetric AES key from master PIN and salt using PBKDF2
export async function deriveKey(masterPIN, saltBuffer) {
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    strToBuffer(masterPIN),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: 100_000,
      hash: "SHA-256",
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Encrypt the private key using AES-GCM
export async function encryptPrivateKey(privateKey, encryptionKey) {
  const exportedKey = await window.crypto.subtle.exportKey("pkcs8", privateKey);
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM

  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    encryptionKey,
    exportedKey
  );

  return {
    encryptedPrivateKey: bufferToBase64(encrypted),
    iv: bufferToBase64(iv),
  };
}

// Decrypt the private key using AES-GCM
export async function decryptPrivateKey(encryptedPrivateKeyBase64, ivBase64, encryptionKey) {
  const encryptedBuffer = base64ToBuffer(encryptedPrivateKeyBase64);
  const iv = base64ToBuffer(ivBase64);

  const decryptedKeyBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    encryptionKey,
    encryptedBuffer
  );

  return window.crypto.subtle.importKey(
    "pkcs8",
    decryptedKeyBuffer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );
}
export async function exportPublicKeyToBase64(publicKey) {
  const spki = await window.crypto.subtle.exportKey("spki", publicKey);
  return bufferToBase64(spki);
}

export function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}