// indexedDbUtils.js
import { openDB } from 'idb';

const DB_NAME = 'encryptionKeysDB';
const STORE_NAME = 'keys';

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

// Save private key
export async function savePrivateKey(userId, privateKey) {
  const db = await getDB();
  await db.put(STORE_NAME, privateKey, `privateKey_${userId}`);
}

// Get private key
export async function getPrivateKey(userId) {
  const db = await getDB();
  return await db.get(STORE_NAME, `privateKey_${userId}`);
}

// Delete private key
export async function deletePrivateKey(userId) {
  const db = await getDB();
  return await db.delete(STORE_NAME, `privateKey_${userId}`);
}

// Save public key
export async function savePublicKey(userId, publicKey) {
  const db = await getDB();
  await db.put(STORE_NAME, publicKey, `publicKey_${userId}`);
}

// Get public key
export async function getPublicKey(userId) {
  const db = await getDB();
  return await db.get(STORE_NAME, `publicKey_${userId}`);
}

// Delete public key
export async function deletePublicKey(userId) {
  const db = await getDB();
  return await db.delete(STORE_NAME, `publicKey_${userId}`);
}
