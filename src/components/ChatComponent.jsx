// ChatApp.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import SearchUser from './SearchUser';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import GroupChatWindow from "./GroupChatWindow";
import CreateGroupForm from "./CreateGroupForm";
import "../css/chat.css"
const ChatComponent = ({recentChats,setRecentChats}) => {
  const { selectedUser, setSelectedUser } = useAuth();
  const [messageOffset, setMessageOffset] = useState(0);
  const MESSAGE_LIMIT = 10; // same as backend limit

    const { messages, setMessages } = useAuth(); 
    const { stompClient } = useAuth();
    const {token} = useAuth()
    const { userId } = useAuth();
    const {activeView, setActiveView} = useAuth()
    
    function requestMessages(offset) {
      const recipientId = parseInt(selectedUser.userId)
      console.log(recipientId)
      stompClient.send(
        "/app/get-cached-messages",
        {},
        JSON.stringify({
          senderId: userId,
          recipientId: recipientId,
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
const markUserAsRead = (userId) => {
  setRecentChats((prev) =>
    prev.map((chat) =>
      chat.userId === parseInt(userId)
        ? { ...chat, hasUnreadMessage: false }
        : chat
    )
  );
};


    useEffect(() => {
  if (!selectedUser) return;

  setMessages([]); // Clear old messages

  setMessageOffset(0); // Reset offset for new chat

  requestMessages(0); // Load first batch
    setRecentChats(prevChats =>
    prevChats.map(chat =>
      chat.userId === selectedUser.userId
        ? { ...chat, hasUnreadMessage: false }
        : chat
    )
  );
  setActiveView("chat")
}, [selectedUser]);

    
  return (
    <div className="flex h-full">
      <div className="w-1/4 border-r">
        <SearchUser setSelectedUser={setSelectedUser} />
        <ChatList onSelectUser={setSelectedUser} recentChats={recentChats} />
      </div>
      <div className="w-3/4 min-h-0">
       {activeView === 'chat' && selectedUser ? (
    selectedUser.type === "USER" ? (
    <ChatWindow
      selectedUser={selectedUser}
      messages={messages}
      setMessages={setMessages}
      setMessageOffset={setMessageOffset}
      requestMessages={requestMessages}
      handleScroll={handleScroll}
      markUserAsRead={markUserAsRead}
    />
  ) : selectedUser.type === "GROUP" ? (
    <GroupChatWindow
      selectedGroup={selectedUser}
      messages={messages}
      setMessages={setMessages}
      setMessageOffset={setMessageOffset}
      requestMessages={requestMessages}
      handleScroll={handleScroll}
      // add any other props GroupChatWindow needs
    />
  ) : null
    ) : activeView === 'createGroup' ? (
      <CreateGroupForm onBack={() => setActiveView('default')}  founderUserId={userId} recentChats={recentChats}  />
    ) : (
      <div className="p-4 space-y-2">
        <div>Select a user to chat</div>
        <button
          onClick={() => setActiveView('createGroup')}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Create New Group
        </button>
      </div>
    )}
      </div>
    </div>
  );
};
export default ChatComponent