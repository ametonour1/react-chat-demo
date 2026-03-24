/**
 * Encrypts a plaintext string using an AES-GCM CryptoKey.
 * @param {string} text - The message to encrypt.
 * @param {CryptoKey} aesKey - The decrypted group key from your state.
 * @returns {Promise<{content: string, iv: string}>} - Base64 encoded content and IV.
 */

import { bufferToBase64, base64ToBuffer } from './cryptoHelpers';

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

export async function decryptGroupAES(contentBase64, ivBase64, cryptoKey) {
  try {
    const iv = base64ToBuffer(ivBase64);
    const data = base64ToBuffer(contentBase64);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      cryptoKey,
      data
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (err) {
    console.error("Group Decryption Helper Error:", err);
    return "[Encrypted Message]";
  }
}

// HELPER B: Loops through a Redis/History batch
export async function decryptGroupBatch(messages, cryptoKey, currentUserId) {
  return await Promise.all(
    messages.map(async (m) => ({
      ...m,
      content: await decryptGroupAES(m.content, m.iv, cryptoKey),
      me: m.senderId === currentUserId
    }))
  );
}