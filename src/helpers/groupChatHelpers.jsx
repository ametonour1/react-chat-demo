import { decryptGroupAES } from "../helpers/encryptGroupMessage";
import {decryptGroupBatch} from "../helpers/encryptGroupMessage"
import {getMessagesFromIndexedDB, saveMessagesToIndexedDB, purgeOldMessages} from "../helpers/indexedDbUtils"
export const fetchGroupHistory = async (gid, aesKey, token, setGroupMessages, userId) => {
    try {
       
           const response = await fetch(`${process.env.REACT_APP_API_URL}/group-chats/${gid}/messages?offset=0&limit=20`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
            });
        // IMPORTANT: You must await the JSON parsing
        const encryptedMessages = await response.json(); 
        
        console.log("Encrypted Messages from Redis:", encryptedMessages);

        if (!Array.isArray(encryptedMessages)) {
            console.warn("Expected an array but got:", encryptedMessages);
            return;
        }

        // 2. Decrypt each message
        const decryptedMessages = await decryptGroupBatch(encryptedMessages, aesKey ,userId )

        console.log("Decrypted Messages for UI:", decryptedMessages);
        
        setGroupMessages(decryptedMessages);

        // PRO TIP: Save the ENCRYPTED versions to IndexedDB here (Layer 2: Offline)
        // await saveToIndexedDB(gid, encryptedMessages);

    } catch (error) {
        console.error("Error loading history:", error);
    }
};

export const loadAndSyncGroupChat = async (gid, aesKey, token, setGroupMessages, userId) => {
    try {
        // 1. Load what we have locally (Instant render!)
        const localMessages = await getMessagesFromIndexedDB(gid);
        if (localMessages.length > 0) {
            const decryptedLocal = await decryptGroupBatch(localMessages, aesKey, userId);
            setGroupMessages(decryptedLocal); // Show cached messages immediately
        }

        const rawDate = localMessages[localMessages.length - 1].timestamp;
        const lastTimestamp = new Date(rawDate).toISOString();
        console.log("timeStamp",lastTimestamp)
        
        const serverMessages = await fetchMessagesFromServer(gid, token, lastTimestamp);

        // 3. If there are new messages, save and refresh state
        if (serverMessages && serverMessages.length > 0) {
            await saveMessagesToIndexedDB(gid, serverMessages);
            await purgeOldMessages(gid, 100); // Keep it under 100
            
            // Fetch everything again to ensure perfect order
            const updatedLocal = await getMessagesFromIndexedDB(gid);
            const decryptedFinal = await decryptGroupBatch(updatedLocal, aesKey, userId);
            setGroupMessages(decryptedFinal);
        }
    } catch (error) {
        console.error("Error in loadAndSyncGroupChat:", error);
    }
};

export const fetchMessagesFromServer = async (gid, token, sinceTimestamp = 0) => {
    // If we have local messages, we ask for updates. If not, we ask for the initial 20.

    const hasTimestamp = sinceTimestamp && sinceTimestamp !== 0;
  const url = hasTimestamp
        ? `${process.env.REACT_APP_API_URL}/group-chats/${gid}/sync?lastTimestamp=${sinceTimestamp}`
        : `${process.env.REACT_APP_API_URL}/group-chats/${gid}/messages?offset=0&limit=20`;

    console.log("Requesting URL:", url); // Keep this to verify the fix!
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    return await response.json();
}

export const mergeAndSortMessages = (localList, serverList) => {
    // Create a Map to easily prevent duplicate messages by ID
    const messageMap = new Map();
    
    localList.forEach(msg => messageMap.set(msg.id, msg));
    serverList.forEach(msg => messageMap.set(msg.id, msg));
    
    // Convert back to array and sort by timestamp ascending (Oldest to Newest)
    return Array.from(messageMap.values())
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};