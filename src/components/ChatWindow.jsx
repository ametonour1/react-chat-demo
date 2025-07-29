// ChatWindow.jsx
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
const ChatWindow = ({ selectedUser, messages, setMessages,requestMessages,setMessageOffset,handleScroll }) => {
  const [input, setInput] = useState("");
    const { stompClient } = useAuth();
    const { userId } = useAuth();
    const recipientId = parseInt(selectedUser.userId)

  

  const sendMessage = () => {
    const msg = {
      senderId:userId,
      recipientId: recipientId,
      content: input,
      timestamp: Date.now(),
    };
    // use WebSocket client to send
    stompClient.send("/app/chat.send", {}, JSON.stringify(msg));
    setInput("");
    console.log("user",userId,"sendsTo",recipientId)
    console.log("messages",messages)

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
}, [messages]);
  return (
    <div className="flex flex-col h-full max-h-screen p-4 border border-red-300" >
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