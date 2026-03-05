/**
 * Encrypts a plaintext string using an AES-GCM CryptoKey.
 * @param {string} text - The message to encrypt.
 * @param {CryptoKey} aesKey - The decrypted group key from your state.
 * @returns {Promise<{content: string, iv: string}>} - Base64 encoded content and IV.
 */

import { bufferToBase64 } from './cryptoHelpers';

export async function encryptGroupMessage(text, aesKey) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  // Generate a fresh, random 12-byte IV for EVERY message
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    aesKey,
    data
  );

  return {
    content: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv),
  };
}