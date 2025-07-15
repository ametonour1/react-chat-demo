// ChatWindow.jsx
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
const ChatWindow = ({ selectedUser, messages, setMessages }) => {
  const [input, setInput] = useState("");
    const { stompClient } = useAuth();
    const { userId } = useAuth();

  

  const sendMessage = () => {
    const msg = {
      senderId:userId,
      recipientId: selectedUser.id,
      content: input,
      timestamp: Date.now(),
    };
    // use WebSocket client to send
    stompClient.send("/app/chat.send", {}, JSON.stringify(msg));
    setMessages([...messages, { ...msg, sender: "me" }]);
    setInput("");
    console.log("user",userId,"sendsTo",selectedUser.id)
  };

  return (
    <div className="flex flex-col h-full p-4 border-red-300">
      <div className="flex-1 overflow-y-auto">
        {messages.map((m, idx) => (
          <div key={idx} className={m.sender === "me" ? "text-right" : "text-left"}>
            <div className="inline-block bg-gray-200 rounded p-2 m-1">
              {m.content}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border p-2"
          placeholder="Type your message"
        />
        <button onClick={sendMessage} className="bg-blue-500 text-white px-4 ml-2">
          Send
        </button>
      </div>
    </div>
  );
};
export default ChatWindow