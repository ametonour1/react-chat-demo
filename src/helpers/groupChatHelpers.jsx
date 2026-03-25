import { decryptGroupAES } from "../helpers/encryptGroupMessage";
import {decryptGroupBatch} from "../helpers/encryptGroupMessage"
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