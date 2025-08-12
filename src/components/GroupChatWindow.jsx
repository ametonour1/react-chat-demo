import React from "react";

const GroupChatWindow = ({ groupId, messages, setMessages }) => {
  return (
    <div className="h-full flex flex-col p-4">
      <h2 className="text-xl font-semibold mb-4">Group Chat: {groupId}</h2>
      
      {/* Placeholder for messages */}
      <div className="flex-1 overflow-y-auto border rounded p-2 mb-4 bg-gray-50">
        {messages && messages.length > 0 ? (
          messages.map((msg, idx) => (
            <div key={idx} className="mb-2">
              <b>{msg.senderName || "Unknown"}:</b> {msg.content}
            </div>
          ))
        ) : (
          <div className="text-gray-400">No messages yet.</div>
        )}
      </div>

      {/* Placeholder input */}
      <div>
        <input
          type="text"
          placeholder="Type a message..."
          className="w-full border rounded px-3 py-2"
          disabled
        />
        <small className="text-gray-500">Message input will be enabled later</small>
      </div>
    </div>
  );
};

export default GroupChatWindow;
