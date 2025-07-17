import React from "react";

const dummyChats = [
  { id: 1, username: "alice" },
  { id: 2, username: "bob" },
  { id: 3, username: "charlie" },
];

const ChatList = ({ onSelectUser,recentChats }) => {
  return (
        <div>
      {recentChats.length === 0 ? (
        <p>No recent chats</p>
      ) : (
        <ul>
          {recentChats.map((chatUser) => (
            <li 
              key={chatUser.id} 
              onClick={() => onSelectUser(chatUser)}
              className="cursor-pointer hover:bg-gray-200 p-2"
            >
              {chatUser.username}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ChatList;
