// utils/indexedDb.js
export function openDB() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open("chatapp", 1);
    request.onupgradeneeded = function (e) {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("encryption")) {
        db.createObjectStore("encryption", { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getEncryptionKeysFromIndexedDB() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("encryption", "readonly");
    const store = tx.objectStore("encryption");
    const getRequest = store.get("user-private-key");

    getRequest.onsuccess = () => resolve(getRequest.result);
    getRequest.onerror = () => reject(getRequest.error);
  });
}
