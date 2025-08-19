import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getGroupChatKey} from "../helpers/indexedDbUtils"
import {decryptGroupKey } from "../helpers/groupEncryptionService";

const GroupChatWindow = ({ selectedGroup, messages, setMessages }) => {
    const { stompClient } = useAuth();
      const { userId } = useAuth();
      const groupId = selectedGroup.userId;
      const [aesKey, setAesKey] = useState("")


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

   useEffect(() => {
    const fetchKey = async () => {
      try {
        const groupChatKey = await getGroupChatKey(groupId,userId);
        const decryptedGroupKey = await decryptGroupKey(groupChatKey.encryptedKey, userId)
        console.log("aeskey", decryptedGroupKey);
      } catch (error) {
        console.error("Failed to fetch group key:", error);
      }
    };

    fetchKey();
  }, [groupId]);
      
  return (
    <div className="h-full flex flex-col p-4">
      <h2 className="text-xl font-semibold mb-4">Group Chat: {groupId}</h2>
           <button
        onClick={sendDummyMessage}
        className="px-4 py-2 bg-blue-500 text-white rounded mt-2"
      >
        Send Dummy Message
      </button>
      
      {/* Placeholder for messages */}
      <div className="flex-1 overflow-y-auto border rounded p-2 mb-4 bg-gray-50">
        {messages && messages.length > 0 ? (
          messages.map((msg, idx) => (
            <div key={idx} className="mb-2">
              <b>{msg.senderName || "Unknown"}:</b> {msg.content}
            </div>
          ))
        ) : (
          <div className="text-gray-400">No messages yet.</div>
        )}
      </div>

      {/* Placeholder input */}
      <div>
        <input
          type="text"
          placeholder="Type a message..."
          className="w-full border rounded px-3 py-2"
          disabled
        />
        <small className="text-gray-500">Message input will be enabled later</small>
      </div>
    </div>
  );
};

export default GroupChatWindow;
