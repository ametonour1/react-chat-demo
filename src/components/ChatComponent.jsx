// ChatApp.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import SearchUser from './SearchUser';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import "../css/chat.css"
const ChatComponent = ({recentChats}) => {
  const [selectedUser, setSelectedUser] = useState(null);
    const { messages, setMessages } = useAuth(); 
    const { stompClient } = useAuth();
    const {token} = useAuth()
    const { userId } = useAuth();
    
    function requestMessages(offset) {
      stompClient.send(
        "/app/get-cached-messages",
        {},
        JSON.stringify({
          senderId: userId,
          recipientId: selectedUser.userId,
          offset: offset,
          limit: MESSAGE_LIMIT,
        })
      );
}

    useEffect(() => {
  if (!selectedUser) return;

  setMessages([]); // Clear old messages

  // Ask server to send cached messages for this chat
  stompClient.send(
    "/app/get-cached-messages", // your controller handles this
    {},
    JSON.stringify({
      senderId: userId,
      recipientId: selectedUser.userId,
    })
  );
}, [selectedUser]);

    
  return (
    <div className="flex h-full">
      <div className="w-1/4 border-r">
        <SearchUser setSelectedUser={setSelectedUser} />
        <ChatList onSelectUser={setSelectedUser} recentChats={recentChats} />
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