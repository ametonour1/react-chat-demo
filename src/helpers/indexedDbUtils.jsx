// indexedDbUtils.js
import { openDB } from 'idb';

const DB_NAME = 'encryptionKeysDB';
const STORE_NAME = 'keys';

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME);
    },
  });
}

export async function savePrivateKey(userId, privateKey) {
  const db = await getDB();
  await db.put(STORE_NAME, privateKey, userId);
}

export async function getPrivateKey(userId) {
  const db = await getDB();
  return await db.get(STORE_NAME, userId);
}

export async function deletePrivateKey(userId) {
  const db = await getDB();
  return await db.delete(STORE_NAME, userId);
}
