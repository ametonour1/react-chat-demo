// ChatWindow.jsx
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { getPublicKey } from "../helpers/indexedDbUtils";
import {encryptMessageDual} from '../helpers/messageEncryptionHelpers';
const ChatWindow = ({ selectedUser, messages, setMessages,requestMessages,setMessageOffset,handleScroll,markUserAsRead }) => {
  const [input, setInput] = useState("");
    const { stompClient } = useAuth();
    const { userId } = useAuth();
    
    const recipientId = parseInt(selectedUser.userId)

  

  const sendMessage = async () => {
    const senderPublicKey = await getPublicKey(userId)
    const reciverPublicKey = selectedUser.publicKey;


    console.log("selctedUser",selectedUser)
     const {
      encryptedContent,
      encryptedAESKeyForRecipient,
      encryptedAESKeyForSender,
      iv,
    } = await encryptMessageDual(input, reciverPublicKey, senderPublicKey);

    const msg = {
      senderId:userId,
      recipientId: recipientId,
      content: encryptedContent,
      timestamp: Date.now(),
      encryptedAESKeyForRecipient,
      encryptedAESKeyForSender,
      iv,
    };
    // use WebSocket client to send
    stompClient.send("/app/chat.send", {}, JSON.stringify(msg));
    setInput("");
    console.log("user",userId,"sendsTo",recipientId)
    console.log("message",msg)

  };

    const lastSentMsgIndex = [...messages]
    .map((m, i) => (m.me ? i : -1))
    .filter(i => i !== -1)
    .pop();

const handleReadMessage = (messageId) => {
  if (stompClient && stompClient.connected) {
    stompClient.send("/app/message/read", {}, JSON.stringify({ messageId }));
    console.log("Sent read event for message", messageId);
  }


};


// useEffect(() => {
//   if (!messages || messages.length === 0) return;

//   // Mark all unread incoming messages as read

//   // Find the last unread message sent by the other user
//   const lastUnreadIncomingMsg = [...messages]
//   .filter(msg => !msg.me && msg.status !== "READ")
//   .pop();
// console.log(lastUnreadIncomingMsg,"lastmesseg")
//   if (lastUnreadIncomingMsg) {
//     handleReadMessage(lastUnreadIncomingMsg.id);
//   }
// }, [messages]);

const lastReadRef = useRef(null);

useEffect(() => {
  if (!messages || messages.length === 0) return;

  const unreadIncomingMessages = messages.filter(
    (msg) => !msg.me && msg.status !== "READ"
  );

  if (unreadIncomingMessages.length > 0) {
    const lastUnread = unreadIncomingMessages.at(-1);

    // Prevent re-sending if we already marked this one
    if (lastReadRef.current !== lastUnread.id) {
      lastReadRef.current = lastUnread.id;
      handleReadMessage(lastUnread.id);
    }
  }

  //markUserAsRead(selectedUser.userId)
  console.log("eseEffectRan in window")

   


}, [messages]);
  return (
    <div className="flex flex-col h-full max-h-screen p-4 border border-red-300" >
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-white sticky top-0 z-10">
    <div className="flex items-center space-x-3">
      {/* Profile Image or Placeholder */}
      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
        {selectedUser?.profileImageUrl ? (
          <img src={selectedUser.profileImageUrl} alt="profile" className="rounded-full" />
        ) : (
          selectedUser?.username?.charAt(0).toUpperCase()
        )}
      </div>
      
      <div>
        <h3 className="font-semibold text-gray-800">{selectedUser?.username}</h3>
        <div className="flex items-center text-xs">
          {/* Online Indicator Dot */}
          <span className={`h-2 w-2 rounded-full mr-2 ${selectedUser?.online ? 'bg-green-500' : 'bg-gray-400'}`}></span>
          <span className="text-gray-500">{selectedUser?.online ? 'Active Now' : 'Offline'}</span>
        </div>
      </div>
    </div>

    {/* Optional: Add a "Chat Settings" or "Info" icon here */}
    <div className="text-gray-400 hover:text-gray-600 cursor-pointer">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
      </svg>
    </div>
  </div>
      <div className="flex-1 overflow-y-auto min-h-0 pt-10" onScroll={handleScroll } >
        {messages.map((m, idx) => {
          const isLastSentMessage = idx === lastSentMsgIndex;
          return (
            <div
              key={idx}
              className={m.me ? "text-right" : "text-left"}
            >
              <div className="inline-block bg-gray-200 rounded p-2 m-1 relative">
                <div>{m.content}</div>

                {/* Show status ONLY for last sent message */}
                {m.me && isLastSentMessage && m.status && (
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "gray",
                      marginTop: "2px",
                    }}
                  >
                    {m.status}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border p-2"
          placeholder="Type your message"
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white px-4 ml-2"
        >
          Send
        </button>
      </div>
    </div>
  );
};
export default ChatWindow