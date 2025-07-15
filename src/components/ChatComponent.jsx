// ChatApp.jsx
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import SearchUser from './SearchUser';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import "../css/chat.css"
const ChatComponent = () => {
  const [selectedUser, setSelectedUser] = useState(null);
    const { messages, setMessages } = useAuth(); 

  return (
    <div className="flex h-full">
      <div className="w-1/4 border-r">
        <SearchUser setSelectedUser={setSelectedUser} />
        <ChatList onSelectUser={setSelectedUser} />
      </div>
      <div className="w-3/4">
        {selectedUser ? (
          <ChatWindow
            selectedUser={selectedUser}
            messages={messages}
            setMessages={setMessages}
          />
        ) : (
          <div className="p-4">Select a user to chat</div>
        )}
      </div>
    </div>
  );
};
export default ChatComponent