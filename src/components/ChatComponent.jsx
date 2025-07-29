// ChatApp.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import SearchUser from './SearchUser';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import "../css/chat.css"
const ChatComponent = ({recentChats}) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [messageOffset, setMessageOffset] = useState(0);
  const MESSAGE_LIMIT = 10; // same as backend limit

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

const handleScroll = (e) => {
  const scrollTop = e.target.scrollTop;
  if (scrollTop === 0) { // scrolled to top
    // Load next batch
      console.log("scroll event fired")
    requestMessages(messageOffset + MESSAGE_LIMIT);
    setMessageOffset(messageOffset + MESSAGE_LIMIT);
  }
};


    useEffect(() => {
  if (!selectedUser) return;

  setMessages([]); // Clear old messages

  setMessageOffset(0); // Reset offset for new chat

  requestMessages(0); // Load first batch
}, [selectedUser]);

    
  return (
    <div className="flex h-full">
      <div className="w-1/4 border-r">
        <SearchUser setSelectedUser={setSelectedUser} />
        <ChatList onSelectUser={setSelectedUser} recentChats={recentChats} />
      </div>
      <div className="w-3/4 min-h-0">
        {selectedUser ? (
          <ChatWindow
            selectedUser={selectedUser}
            messages={messages}
            setMessages={setMessages}
            setMessageOffset={setMessageOffset}
            requestMessages={requestMessages}
            handleScroll={handleScroll}
          />
        ) : (
          <div className="p-4">Select a user to chat</div>
        )}
      </div>
    </div>
  );
};
export default ChatComponent