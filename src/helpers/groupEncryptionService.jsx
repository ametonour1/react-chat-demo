import {saveGroupChatKey,  getGroupChatKey, getPrivateKey, getAllLocalGroupKeys} from "./indexedDbUtils"
import {
  bufferToBase64,
  base64ToBuffer,
  importPublicKey
} from './cryptoHelpers'; 


export const fetchGroupChatKeys = async (groupId, token, userId) => {
  try {
    const res = await fetch(`${process.env.REACT_APP_API_URL}/group-chats/${groupId}/keys`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.status === 204) {
      console.log('No keys found for this user and group');
      return [];
    }

    if (!res.ok) {
      throw new Error('Failed to fetch encrypted keys');
    }

    const keys = await res.json();
    keys.forEach(key => {
    saveGroupChatKey(groupId, key.userId, key.encryptedKey, key.keyVersion);
    });
    return keys;
  } catch (error) {
    console.error('Error fetching keys:', error.message);
    return [];
  }
};


/**
 * Generates a group AES key and encrypts it with each member's public key.
 * @param {Array<Object>} members - An array of member objects, each with a userId and publicKey.
 * @param {string} founderUserId - The ID of the group's creator.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of member objects,
 * each with their userId, encryptedKey, unique IV, and isAdmin status.
 */
export async function createAndEncryptGroupKeys(members, founderUserId) {
  // Step 1: Generate a single AES-GCM key for the group chat.
  const groupKey = await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );

  // Export the raw group key to be encrypted
  const exportedGroupKey = await window.crypto.subtle.exportKey("raw", groupKey);

  // Step 2 & 3: Encrypt the key for each member
  const membersWithKeys = await Promise.all(
    members.map(async (member) => {
      // Import the member's public key
      const memberPublicKey = await importPublicKey(member.publicKey);

      // Generate a unique IV for each encryption operation
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      // Encrypt the group key with the member's public key (RSA-OAEP)
      const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        memberPublicKey,
        exportedGroupKey
      );

      // Convert encrypted key and IV to Base64
      const encryptedKey = bufferToBase64(encryptedKeyBuffer);
      const ivBase64 = bufferToBase64(iv);
      
      // Determine if the member is the founder (admin)
  
      const isAdmin = member.userId === founderUserId;

      // Return the formatted member object
      return {
        userId: parseInt(member.userId),
        encryptedKey: encryptedKey,
        iv: ivBase64,
        isAdminUser: isAdmin,
      };
    })
  );

  return membersWithKeys;
}

export async function decryptGroupKey(encryptedKeyBase64, userId) {
  try {
    // 1. Fetch the user's private key from the local database
    const privateKey = await getPrivateKey(userId);
    
    if (!privateKey) {
      throw new Error("Private key not found for user.");
    }

    // 2. Convert Base64 strings to ArrayBuffers
    const encryptedKeyBuffer = base64ToBuffer(encryptedKeyBase64);
    
    // 3. Decrypt the group key with the private key (RSA-OAEP)
    const decryptedKeyBuffer = await window.crypto.subtle.decrypt(
      {
        name: "RSA-OAEP",
      },
      privateKey,
      encryptedKeyBuffer
    );

    // 4. Import the decrypted key buffer as a usable AES-GCM key
    const decryptedKey = await window.crypto.subtle.importKey(
      "raw",
      decryptedKeyBuffer,
      {
        name: "AES-GCM",
        length: 256,
      },
      false, // non-extractable, since it's a session key
      ["encrypt", "decrypt"]
    );

    return decryptedKey;

  } catch (error) {
    console.error("Error decrypting group key:", error);
    throw new Error("Failed to decrypt group key.");
  }
}

export const ensureGroupKey = async (groupId, userId, token) => {

  // 1. Check IndexedDB first
  let keyEntry = await getGroupChatKey(groupId, userId);

  // 2. If not in DB, fetch from Server
  if (!keyEntry) {
    console.log(`Key missing for group ${groupId}, fetching from server...`);
    const fetchedResult = await fetchGroupChatKeys(groupId, token, userId);
    console.log("Raw result from server:", fetchedResult);


    keyEntry = Array.isArray(fetchedResult) ? fetchedResult[0] : fetchedResult;

    if (!keyEntry || !keyEntry.encryptedKey) {
        throw new Error("Could not retrieve group key from server or data is malformed.");
    }
    console.log(keyEntry,"keyentry")
    

    // 3. Save it locally so we don't have to fetch next time
    await saveGroupChatKey(groupId, userId, keyEntry.encryptedKey, keyEntry.keyVersion, keyEntry.iv);
  }

 const groupCryptoKey = await decryptGroupKey(keyEntry.encryptedKey, userId);

  return groupCryptoKey;
};

export const ensureKeyring = async (groupId, userId, token, latestVersion,setGroupKey) => {
    const keyring = {};
    let missingAny = false;

    // 1. Precise Point-Lookups
    // We only look for the keys we KNOW we need for THIS group.
    let latestKey = await getGroupChatKey(groupId,userId,latestVersion)

     if (!latestKey) {
        const serverKeys = await fetchGroupChatKeys(groupId, token, userId);
        latestKey = serverKeys[0];

        
        
        for (const k of serverKeys) {
            await saveGroupChatKey(groupId, userId, k.encryptedKey, k.keyVersion, k.iv);
            const decrypted = await decryptGroupKey(k.encryptedKey, userId);
            keyring[k.keyVersion] = decrypted;
        }
        console.log("there are missing keys from keyring")
    }
        console.log("latestKey", latestKey)

        const decryptedLatestKey = await decryptGroupKey(latestKey.encryptedKey, userId);
        setGroupKey(decryptedLatestKey)
    

    for (let v = latestVersion; v > 0; v--) {
        const localEntry = await getGroupChatKey(groupId, userId, v);
        console.log("key num v",v,"key",localEntry)

        
        if (localEntry) {
            const decrypted = await decryptGroupKey(localEntry.encryptedKey, userId);
            keyring[v] = decrypted;
        } else {
            // If we are missing even one version, we'll sync with the server
            // to see if the user is entitled to it.
            missingAny = true; 
        }
    }


    return keyring;
};