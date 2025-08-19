import {saveGroupChatKey,  getGroupChatKey, getPrivateKey} from "./indexedDbUtils"
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