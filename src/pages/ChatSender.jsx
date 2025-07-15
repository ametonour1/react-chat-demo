import React, { useState } from "react";
import { useAuth } from "../context/AuthContext"; // adjust path as needed

const ChatSender = () => {
  const [message, setMessage] = useState("");
  const { stompClient } = useAuth();

  const sendMessage = () => {
    if (stompClient && stompClient.connected) {
      const payload = {
        senderId: "22", // replace with dynamic user ID
        recipientId:"26",
        content: message,
        timestamp: Date.now()
      };

      stompClient.send("/app/chat.send", {}, JSON.stringify(payload));
    } else {
      console.warn("Not connected to WebSocket");
    }
  };

  return (
    <div>
      <h2>Send Message</h2>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
};

export default ChatSender;
