import React from "react";

const dummyChats = [
  { id: 1, username: "alice" },
  { id: 2, username: "bob" },
  { id: 3, username: "charlie" },
];

const ChatList = ({ onSelectUser }) => {
  return (
    <div className="p-2 border-t">
      <h2 className="text-lg font-semibold mb-2">Recent Chats</h2>
      <ul>
        {dummyChats.map((user) => (
          <li
            key={user.id}
            onClick={() => onSelectUser(user)}
            className="cursor-pointer p-2 hover:bg-gray-100 rounded"
          >
            {user.username}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChatList;
