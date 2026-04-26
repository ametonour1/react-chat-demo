// indexedDbUtils.js
import { openDB } from 'idb';

const DB_NAME = 'encryptionKeysDB';
const STORE_NAME = 'keys';
const GROUP_KEYS_STORE = "group_keys";

const MSG_DB_NAME = 'groupChatHistoryDB';
const MESSAGE_STORE = 'group_messages';

// async function getDB() {
//   return openDB(DB_NAME, 1, {
//     upgrade(db) {
//       if (!db.objectStoreNames.contains(STORE_NAME)) {
//         db.createObjectStore(STORE_NAME);
//       }
//     },
//   });
// }

export async function getDB() {
  return openDB(DB_NAME, 3, { // Bump to 3 to trigger the upgrade
    upgrade(db, oldVersion, newVersion, transaction) {
      // 1. Handle Messages Store
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const msgStore = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        msgStore.createIndex("groupId", "groupId", { unique: false });
      } else {
        // If store exists but index doesn't (migration)
        const msgStore = transaction.objectStore(STORE_NAME);
        if (!msgStore.indexNames.contains("groupId")) {
          msgStore.createIndex("groupId", "groupId", { unique: false });
        }
      }

      // 2. Handle Group Keys Store
      if (!db.objectStoreNames.contains(GROUP_KEYS_STORE)) {
        const keyStore = db.createObjectStore(GROUP_KEYS_STORE, { keyPath: "id" });
        keyStore.createIndex("groupId", "groupId", { unique: false });
      } else {
        // Migration for existing store
        const keyStore = transaction.objectStore(GROUP_KEYS_STORE);
        if (!keyStore.indexNames.contains("groupId")) {
          keyStore.createIndex("groupId", "groupId", { unique: false });
        }
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

export async function saveGroupChatKey(groupId, userId, encryptedKey, version, iv) {
  const db = await getDB();
  const storageKey = `groupKey_${groupId}_${userId}_${version}`;
  
  await db.put(GROUP_KEYS_STORE, { // Pointing to the new store
    id: storageKey,
    groupId: Number(groupId),
    userId: Number(userId),
    keyVersion: Number(version),
    encryptedKey,
    iv
  });
}
export async function getAllLocalGroupKeys(groupId, userId) {
  const db = await getDB();
  const allRecords = await db.getAll(STORE_NAME);
  
  if (!allRecords) return [];

  const filtered = allRecords.filter(record => {
    // Check if ID exists and is a string to prevent the 'split' error
    if (!record || !record.id || typeof record.id !== 'string') {
      return false;
    }

    const parts = record.id.split('_'); 
    
    // Check if it's actually one of our key records (should have at least 3 parts)
    if (parts.length < 3) return false;

    const recordGroupId = parts[1];
    const recordUserId = parts[2];

    return Number(recordGroupId) === Number(groupId) && 
           Number(recordUserId) === Number(userId);
  });

  console.log(`IndexedDB: Found ${allRecords} local keys for Group ${groupId}`);
  return filtered;
}
// Get group chat key with version
export async function getGroupChatKey(groupId, userId, version) {
  const db = await getDB();
  const storageKey = `groupKey_${groupId}_${userId}_${version}`;
  return await db.get(GROUP_KEYS_STORE, storageKey);
}

// Delete group chat key
export async function deleteGroupChatKey(groupId, userId) {
  const db = await getDB();
  return await db.delete(STORE_NAME, `groupKey_${groupId}_${userId}`);
}

export const deleteGroupKeysLocally = async (groupId) => {
  const db = await getDB();

  const tx = db.transaction(GROUP_KEYS_STORE, 'readwrite');
  const index = tx.store.index('groupId');
    

  for await (const cursor of index.iterate(groupId)) {
    cursor.delete();
  }

  await tx.done;
  console.log(`✅ Keys for group ${groupId} purged.`);
};
export async function getMessageDB() {

  return openDB(MSG_DB_NAME, 2, {
    upgrade(db, oldVersion, newVersion, transaction) {
     
      if (!db.objectStoreNames.contains(MESSAGE_STORE)) {
        const store = db.createObjectStore(MESSAGE_STORE, { keyPath: 'id' });
        store.createIndex('by-group', 'groupId');
      } else {
      
        const store = transaction.objectStore(MESSAGE_STORE);
        if (!store.indexNames.contains('by-group')) {
          store.createIndex('by-group', 'groupId');
          console.log("🛠️ Migration: 'by-group' index created.");
        }
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

export const deleteGroupMessagesLocally = async (groupId) => {
  const db = await getMessageDB();
  const tx = db.transaction(MESSAGE_STORE, 'readwrite');
  const store = tx.objectStore(MESSAGE_STORE);

  // We scan the store manually to bypass index type-sensitivity
  let cursor = await store.openCursor();
  let count = 0;

  while (cursor) {
    // Use == instead of === to match "123" with 123
    if (cursor.value.groupId == groupId) {
      await cursor.delete();
      count++;
    }
    cursor = await cursor.continue();
  }

  await tx.done;
  console.log(`🧹 Force Wipe Result: Deleted ${count} messages.`);
};