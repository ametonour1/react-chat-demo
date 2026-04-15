import React, { useEffect, useState , useRef} from "react";
import { useAuth } from "../context/AuthContext";
import { getGroupChatKey} from "../helpers/indexedDbUtils"
import {decryptGroupKey, ensureGroupKey, ensureKeyring } from "../helpers/groupEncryptionService";
import { encryptGroupMessage } from "../helpers/encryptGroupMessage";
import {useReadReceiptTrigger} from "../helpers/useReadReceiptTrigger"
import {fetchGroupHistory, loadAndSyncGroupChat, loadOlderMessages, loadGroupMembers, fetchReadCursors, fetchGroupMetadata} from "../helpers/groupChatHelpers"
import {GroupMessage} from "./GroupMessage"
import {GroupSettingsOverlay} from "./GroupSettingsOverlay"
import { Settings } from 'lucide-react';
const GroupChatWindow = ({ selectedGroup, messages, setMessages }) => {
    const { stompClient } = useAuth();
      const { userId, token,groupReadCursors,setGroupReadCursors, groupChatMembers, setGroupChatMembers, keyVersion, setKeyVersion , keyring, setKeyring} = useAuth();
      const {groupMessages, setGroupMessages} = useAuth()
      const groupId = selectedGroup.userId;
      const [groupKey, setGroupKey] = useState(null)
      const [inputText, setInputText] = useState("");
      const [isSending, setIsSending] = useState(false);
      const [loadingOlder, setLoadingOlder] = useState(false);
      const [showSettings, setShowSettings] = useState(false);
      const isAdmin = groupChatMembers?.find(m => Number(m.id) === Number(userId))?.admin || false;



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


  const emitReadReceipt = (messageId) => {
    // If you are using STOMP or Socket.io, use your client's send method.
    // Example using standard STOMP client:


    
    if (stompClient ) {
        const payload = {
            type: "GROUP_READ_RECEIPT", // Hardcoded type
            userId: userId,                  // Test User ID
            groupChatId: groupId,            // Test Group ID
            lastReadMessageId: messageId ,    // Test Message ID
        };

          stompClient.send(
          "/app/group-chat/read-receipt",
          {},
          JSON.stringify(payload)
        );
 
        console.log("🚀 Dummy read receipt sent to backend!", payload);
    } else {
        console.error("❌ Socket is not connected!");
    }
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
  const handleKickUser = async (targetUserId) => {
      const confirmKick = window.confirm("Are you sure you want to kick this user? This will trigger a security key rotation.");
      if (!confirmKick) return;

      try {
          console.log("🚀 Starting Key Rotation and Kick for User:", targetUserId);
          // This is where we will call our Crypto Rotate & API logic
      } catch (error) {
          console.error("Kick failed:", error);
      }
  };

   useEffect(() => {
 
    const initializeChat = async () => {
        try {

            // const groupChatKey = await ensureGroupKey(groupId, userId, token);
            // setGroupKey(groupChatKey);
            const metadata = await fetchGroupMetadata(groupId, token);

            const keyring = await ensureKeyring(groupId, userId, token, metadata.currentKeyVersion)
            const groupChatKey = keyring[1]
 
            setKeyring(keyring)
            setGroupKey(groupChatKey);
            setGroupChatMembers(metadata.members);
            setGroupReadCursors(metadata.readCursors);
            setKeyVersion(metadata.currentKeyVersion);

             await loadAndSyncGroupChat(groupId, groupChatKey, token, setGroupMessages, userId);
        } catch (error) {
            console.error("Failed to initialize chat:", error);
        }
    };

    if (groupId) {
        initializeChat();
    }

    return () => {
        console.log("🧹 Cleaning up old group data for ID:", groupId);
        setGroupMessages([]);         // Clear messages
        setGroupChatMembers([]);      // Clear member list
        setGroupReadCursors({});      // Clear read status icons
        setGroupKey(null);  
        setKeyVersion(null)          // Clear security key
        setKeyring({})
        // If you have a state for typing indicators, clear that too!
        // setTypingUsers([]); 
    };
  }, [groupId]);

  const setLastMessageRef = useReadReceiptTrigger(groupMessages, emitReadReceipt,userId);
  //uncomment later
  // const isAdmin = groupChatMembers.find(m => Number(m.id) === Number(userId))?.admin;


  return (
   <div className="h-full flex flex-col p-4 bg-white shadow-lg rounded-lg">

      {/* Enhanced Header */}
    <div className="flex justify-between items-center mb-4 border-b pb-2">
        <div>
            <h2 className="text-xl font-semibold">Group Chat: {groupId}</h2>
            <p className="text-xs text-gray-500">{groupChatMembers.length} members</p>
        </div>
        
        {/* The Menu Toggle */}
        <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-100 rounded-full transition"
        >
            <Settings size={20} className="text-gray-600" />
        </button>
    </div>

    {/* Settings Overlay / Sidebar */}
    {showSettings && (
        <GroupSettingsOverlay 
            members={groupChatMembers} 
            isAdmin={isAdmin}
            onKick={handleKickUser}
            onClose={() => setShowSettings(false)}
        />
    )}
      
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
          groupMessages.map((msg, idx) => {
    
    const readersHere = Object.entries(groupReadCursors)
      .filter(([userId, lastReadId]) => Number(lastReadId) === Number(msg.id))
      .map(([userId]) => {
          // Find the user's name in your existing group members array
          const member = groupChatMembers.find(m => Number(m.id) === Number(userId));
          return member ? member.username : `User ${userId}`; // Fallback if name not found
      });
    const isLastMessage = idx === groupMessages.length - 1;
    return (
      <GroupMessage 
        key={msg.id || idx} 
        msg={msg}
        isOwnMessage={msg.senderId === userId}
        readers={readersHere}
        innerRef={isLastMessage ? setLastMessageRef : null}
      />
    );
  })
): (
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
