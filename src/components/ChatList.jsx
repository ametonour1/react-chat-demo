import React from "react";

const ChatList = ({ onSelectUser, recentChats }) => {
  console.log(recentChats, "recent chats");

  return (
    <div>
      {recentChats.length === 0 ? (
        <p>No recent chats</p>
      ) : (
        <ul>
          {recentChats.map((chatUser) => (
            <li
              key={chatUser.userId}
              onClick={() => onSelectUser(chatUser)}
              className="cursor-pointer hover:bg-gray-200 p-2 flex items-center"
            >
              {/* Status Dot */}
              <span
                className={`h-3 w-3 rounded-full mr-2 ${
                  chatUser.online ? "bg-green-500" : "bg-gray-400"
                }`}
              ></span>

              {/* Username */}
              {chatUser.username}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ChatList;
