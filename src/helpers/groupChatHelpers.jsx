import { decryptGroupAES } from "../helpers/encryptGroupMessage";
import {decryptGroupBatch} from "../helpers/encryptGroupMessage"
import { createAndEncryptGroupKeys } from "./groupEncryptionService";
import {getMessagesFromIndexedDB, saveMessagesToIndexedDB, purgeOldMessages, clearGroupMessagesFromIndexedDB} from "../helpers/indexedDbUtils"
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
 
        const SYNC_LIMIT = 10;

        const localMessages = await getMessagesFromIndexedDB(gid);
        if (localMessages.length > 0) {
            const decryptedLocal = await decryptGroupBatch(localMessages, aesKey, userId);
            setGroupMessages(decryptedLocal); // Show cached messages immediately
        }

       const hasLocalMessages = localMessages && localMessages.length > 0;


        const lastTimestamp = hasLocalMessages
            ? new Date(localMessages[localMessages.length - 1].timestamp).toISOString()
            : null;
        
        const serverMessages = await fetchMessagesFromServer(gid, token, lastTimestamp);

        // 3. If there are new messages, save and refresh state
        if (serverMessages && serverMessages.length > 0) {
            if (serverMessages.length >= SYNC_LIMIT){

                await clearGroupMessagesFromIndexedDB(gid);
                
                await saveMessagesToIndexedDB(gid, serverMessages);
                
                const decryptedNew = await decryptGroupBatch(serverMessages, aesKey, userId);
                setGroupMessages(decryptedNew);
                console.log("serverMessages Lenght", serverMessages.length, "threshold exeeded clearing indexDb")

            }else{

                await saveMessagesToIndexedDB(gid, serverMessages);

                await purgeOldMessages(gid, 100); 
                
                const updatedLocal = await getMessagesFromIndexedDB(gid);
                const decryptedFinal = await decryptGroupBatch(updatedLocal, aesKey, userId);
                setGroupMessages(decryptedFinal);
                console.log("serverMessages Lenght", serverMessages.length, " inside threshold updating indexDb")

            }
          
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

export const fetchHistoricalMessages = async (gid, token, beforeTimestamp) => {
    // We don't hardcode the limit here, we let the backend use its default (20)
    const url = `${process.env.REACT_APP_API_URL}/group-chats/${gid}/historical?beforeTimestamp=${beforeTimestamp}`;
    
    console.log("Fetching historical messages from:", url);

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP error fetching historical messages: ${response.status}`);
    }

    return await response.json();
};

export const loadOlderMessages = async (gid, token, aesKey, userId, groupMessages, setGroupMessages) => {
    // 1. Safety check: make sure we actually have messages to look back from
    if (!groupMessages || groupMessages.length === 0) return;

    try {
        // 2. Grab the timestamp of the OLDEST message currently on screen (index 0)
        const oldestMessage = groupMessages[0]; 
        const beforeTimestamp = new Date(oldestMessage.timestamp).toISOString();

        // 3. Call the API helper we just made
        const olderMessages = await fetchHistoricalMessages(gid, token, beforeTimestamp);

        if (olderMessages && olderMessages.length > 0) {
            // 4. Decrypt the batch
            const decryptedOlder = await decryptGroupBatch(olderMessages, aesKey, userId);

            // 5. Prepend them to the state (Oldest go at the top!)
            setGroupMessages((prev) => [...decryptedOlder, ...prev]);

            // 6. Save them to IndexedDB so they are cached for the next reload
            await saveMessagesToIndexedDB(gid, olderMessages);
            
            console.log(`Successfully loaded ${olderMessages.length} older messages!`);
        } else {
            console.log("No more older messages available in the gap.");
        }
    } catch (error) {
        console.error("Error in loadOlderMessages:", error);
    }
};

/**
 * Subscribes to live read receipt updates for a specific group chat.
 * * @param {Object} stompClient - Your active, connected STOMP client instance.
 * @param {string|number} groupChatId - The ID of the group chat to listen to.
 * @param {Function} onReceiptReceived - Callback function to run when an event arrives.
 * @returns {Object|null} The subscription object (so we can unsubscribe later!), or null.
 */
export const subscribeToGroupLiveStatus = (stompClient, groupChatId, onReceiptReceived) => {
    
    if (!stompClient || !stompClient.connected) {
        console.warn("⚠️ Cannot subscribe to status updates: Socket is not connected.");
        return null;
    }

    const topic = `/topic/group/${groupChatId}/read-status`;
    console.log(`🔌 Subscribing to live read receipts on: ${topic}`);


    const subscription = stompClient.subscribe(topic, (message) => {
        try {
            const payload = JSON.parse(message.body);
            console.log("group message status payload", payload);

            
           
            if (payload.type === "GROUP_READ_RECEIPT") {
                onReceiptReceived(payload);
            }
        } catch (error) {
            console.error("❌ Failed to parse live read receipt payload:", error);
        }
    });

    return subscription;
};

/**
 * Fetches group members from the backend and updates the React state.
 * * @param {string|number} groupId - The ID of the group chat.
 * @param {string} token - The user's JWT auth token.
 * @param {function} setGroupMembers - The React state setter function.
 */
export const loadGroupMembers = async (groupId, token, setGroupMembers) => {
    if (!groupId || !token) {
        console.warn("⚠️ loadGroupMembers called without a valid groupId or token.");
        return;
    }

    const url = `${process.env.REACT_APP_API_URL}/group-chats/${groupId}/members`;;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const members = await response.json();
        
       
        setGroupMembers(members);
        
        console.log(`👥 Successfully loaded ${members.length} members for group ${groupId}`);
    } catch (error) {
        console.error(`❌ Failed to fetch members for group ${groupId}:`, error);
   
    }
};

export const fetchReadCursors = async (groupId, token, setGroupReadCursors) => {
    if (!groupId || !token) {
        console.warn("⚠️ loadGroupMembers called without a valid groupId or token.");
        return;
    }

    const url = `${process.env.REACT_APP_API_URL}/group-chats/${groupId}/read-cursors`;;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const cursors = await response.json();
        
        // Populate the React state with the returned array!
        setGroupReadCursors(cursors);
        
        console.log(`👥 Successfully loaded ${cursors.length} members for group ${groupId}`);
    } catch (error) {
        console.error(`❌ Failed to fetch members for group ${groupId}:`, error);
        // Optional: you could call setGroupMembers([]) here to reset it on failure
    }
};

export const fetchGroupMetadata = async (groupId, token) => {

    const url = `${process.env.REACT_APP_API_URL}/group-chats/${groupId}/metadata`;

    try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
 
        const data = await response.json(); 
        return data;
    } catch (error) {
        console.error("Error fetching group metadata:", error);
        throw error; // Re-throw so the component can handle the error state
    }
};

export const removeUserFromGroup = async (allMembers, kickedUserId, groupId, userId, token) =>{
        const survivors = allMembers.filter(member => member.userId !== kickedUserId);

        const result = await createAndEncryptGroupKeys(survivors, userId);

        console.log("Results after kick", result, "for members",survivors)

        const url = `${process.env.REACT_APP_API_URL}/group-chats/${groupId}/kick`;

        const payload = {
                kickedUserId: kickedUserId,
                members: result
            }
        try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
            });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to kick member');
        }

        const data = await response.json();
        console.log("Backend sync successful:", data.message);
        
        return true; 
    } catch (error) {
        console.error("Error during kick process:", error);
        throw error;
    }
}