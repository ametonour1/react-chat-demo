// indexedDbUtils.js
import { openDB } from 'idb';

const DB_NAME = 'encryptionKeysDB';
const STORE_NAME = 'keys';

const MSG_DB_NAME = 'groupChatHistoryDB';
const MESSAGE_STORE = 'group_messages';

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

export async function saveGroupChatKey(groupId, userId, encryptedKey, keyVersion, iv) {
  const db = await getDB();
  // Include IV in the data to be saved
  const keyData = { encryptedKey, keyVersion, iv }; 
  await db.put(STORE_NAME, keyData, `groupKey_${groupId}_${userId}`);
}
// Get group chat key with version
export async function getGroupChatKey(groupId, userId) {
  const db = await getDB();
  return await db.get(STORE_NAME, `groupKey_${groupId}_${userId}`);
}

// Delete group chat key
export async function deleteGroupChatKey(groupId, userId) {
  const db = await getDB();
  return await db.delete(STORE_NAME, `groupKey_${groupId}_${userId}`);
}

export async function getMessageDB() {
  return openDB(MSG_DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(MESSAGE_STORE)) {
        // We use the server's message 'id' as the primary key
        const store = db.createObjectStore(MESSAGE_STORE, { keyPath: 'id' });
        
        // CRITICAL: This index allows us to fetch only messages for a specific group!
        store.createIndex('by-group', 'groupId');
      }
    },
  });
}


export async function saveMessagesToIndexedDB(groupId, messages) {
  const db = await getMessageDB();
  const tx = db.transaction(MESSAGE_STORE, 'readwrite');
  const store = tx.objectStore(MESSAGE_STORE);

  for (const msg of messages) {
    await store.put({
      ...msg,
      groupId: groupId // Tag it with the groupId for the index search
    });
  }

  await tx.done;
  console.log(`Saved ${messages.length} messages to MessageDB for group ${groupId}`);
}


export async function getMessagesFromIndexedDB(groupId) {
  const db = await getMessageDB();
  const tx = db.transaction(MESSAGE_STORE, 'readonly');
  const store = tx.objectStore(MESSAGE_STORE);
  

  const index = store.index('by-group');
  const messages = await index.getAll(groupId);


  return messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

export async function purgeOldMessages(groupId, keepCount = 100) {
  const db = await getMessageDB();
  const tx = db.transaction(MESSAGE_STORE, 'readwrite');
  const store = tx.objectStore(MESSAGE_STORE);
  const index = store.index('by-group');

  const messages = await index.getAll(groupId);

  if (messages.length > keepCount) {
    messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const deleteCount = messages.length - keepCount;
    const toDelete = messages.slice(0, deleteCount);

    for (const msg of toDelete) {
      await store.delete(msg.id);
    }
    console.log(`Purged ${deleteCount} old messages from MessageDB for group ${groupId}`);
  }
  await tx.done;
}

export async function clearGroupMessagesFromIndexedDB(groupId) {
  const db = await getMessageDB(); 
  const tx = db.transaction(MESSAGE_STORE, 'readwrite');
  const store = tx.objectStore(MESSAGE_STORE);
  const index = store.index('by-group');

  // Find all messages belonging to this group
  const messages = await index.getAll(groupId);

  // Delete them one by one
  for (const msg of messages) {
    await store.delete(msg.id);
  }

  await tx.done;
  console.log(`🧹 Cleared all local messages for group ${groupId}`);
}