import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getGroupChatKey} from "../helpers/indexedDbUtils"
import {decryptGroupKey, ensureGroupKey } from "../helpers/groupEncryptionService";
import { encryptGroupMessage } from "../helpers/encryptGroupMessage";
import {fetchGroupHistory, loadAndSyncGroupChat, loadOlderMessages} from "../helpers/groupChatHelpers"
const GroupChatWindow = ({ selectedGroup, messages, setMessages }) => {
    const { stompClient } = useAuth();
      const { userId, token } = useAuth();
      const {groupMessages, setGroupMessages} = useAuth()
      const groupId = selectedGroup.userId;
      const [groupKey, setGroupKey] = useState(null)
      const [inputText, setInputText] = useState("");
      const [isSending, setIsSending] = useState(false);
      const [loadingOlder, setLoadingOlder] = useState(false);


  const sendDummyMessage = () => {
    if (!stompClient) return;

    // Dummy payload matching your required backend structure
    const dummyPayload = {
      groupChatId: groupId,
      senderId: userId,
      content: "dummyEncryptedMessage",
      iv: "dummyBase64IV",
      keyVersion: 1,
    };

    stompClient.send(
      "/app/group-chat/chat.send",
      {},
      JSON.stringify(dummyPayload)
    );

    console.log("Dummy message sent:", dummyPayload);
  };


  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !stompClient || !groupKey || isSending) return;

    setIsSending(true);
    try {
      // 1. Encrypt the real text using the AES CryptoKey in state
      const { content, iv } = await encryptGroupMessage(inputText, groupKey);

      // 2. Prepare the payload for Kafka/Spring Boot
      const payload = {
        groupChatId: groupId,
        senderId: userId,
        content: content, // The encrypted Base64 string
        iv: iv,          // The unique Base64 IV
        keyVersion: 1,
      };

      // 3. Send via STOMP
      stompClient.send(
        "/app/group-chat/chat.send",
        {},
        JSON.stringify(payload)
      );

      // 4. Clear input
      setInputText("");
    } catch (error) {
      console.error("Failed to encrypt/send message:", error);
      alert("Encryption error. Check console.");
    } finally {
      setIsSending(false);
    }
  };

  const handleLoadMoreClick = async () => {
        if (loadingOlder || groupMessages.length === 0) return;
        
        setLoadingOlder(true);
        console.log("Button clicked! Loading older messages...");
        
        await loadOlderMessages(
            groupId, 
            token, 
            groupKey, 
            userId, 
            groupMessages, 
            setGroupMessages
        );
        
        setLoadingOlder(false);
    };

   useEffect(() => {
    // const fetchKey = async () => {
    //   try {
    //     console.log("groupId,userId", groupId,userId);

    //     const groupChatKey = await ensureGroupKey(groupId, userId, token)
    //     console.log("groupChatKey", groupChatKey);

    //     const decryptedGroupKey = groupChatKey;
    //     console.log("aeskey", decryptedGroupKey);
    //     setGroupKey(decryptedGroupKey);
    //   } catch (error) {
    //     console.error("Failed to fetch group key:", error);
    //   }
    // };

    // fetchKey();

    const initializeChat = async () => {
        try {
            // 1. Get the Key first (You need this to read the messages!)
            const groupChatKey = await ensureGroupKey(groupId, userId, token);
            setGroupKey(groupChatKey);

            // 2. Now fetch the messages from your new API
            //await fetchGroupHistory(groupId, groupChatKey, token, setGroupMessages, userId);
             await loadAndSyncGroupChat(groupId, groupChatKey, token, setGroupMessages, userId);
        } catch (error) {
            console.error("Failed to initialize chat:", error);
        }
    };

    if (groupId) {
        initializeChat();
    }
  }, [groupId]);
      
  return (
   <div className="h-full flex flex-col p-4 bg-white shadow-lg rounded-lg">
      <h2 className="text-xl font-semibold mb-4 border-b pb-2">Group Chat: {groupId}</h2>
      
      {/* Message Display Area */}
      <div className="flex-1 overflow-y-auto border rounded p-4 mb-4 bg-gray-50 space-y-3">
      {groupMessages.length > 0 && (
                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                    <button 
                        onClick={handleLoadMoreClick}
                        disabled={loadingOlder}
                        style={{
                            padding: '8px 16px',
                            cursor: loadingOlder ? 'not-allowed' : 'pointer',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px'
                        }}
                    >
                        {loadingOlder ? 'Loading...' : 'Load Older Messages'}
                    </button>
                </div>
            )}
        {groupMessages && groupMessages.length > 0 ? (
          groupMessages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.senderId === userId ? 'items-end' : 'items-start'}`}>
              <span className="text-xs text-gray-500 mb-1">{msg.senderName || `User ${msg.senderId}`}</span>
              <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${
                msg.senderId === userId 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white border text-gray-800 rounded-tl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          ))
        ) : (
          <div className="text-gray-400 text-center mt-10">No messages yet. Start the conversation!</div>
        )}
      </div>

      {/* Message Input Form */}
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={groupKey ? "Type an encrypted message..." : "Decrypting key..."}
          className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={!groupKey || isSending}
        />
        <button
          type="submit"
          disabled={!groupKey || !inputText.trim() || isSending}
          className={`px-6 py-2 rounded-full font-medium transition ${
            !groupKey || isSending 
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
          }`}
        >
          {isSending ? "..." : "Send"}
        </button>
      </form>
      {!groupKey && <small className="text-red-500 mt-2">Waiting for group encryption key...</small>}
    </div>
  );
};

export default GroupChatWindow;
