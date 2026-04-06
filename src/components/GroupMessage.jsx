import React from 'react';


export const GroupMessage = React.memo(({ msg, isOwnMessage, readers, innerRef }) => {
  return (
    <div ref={innerRef} className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} mb-3`}>

      {/* Sender Name */}
      <span className="text-xs text-gray-500 mb-1">
        {msg.senderName || `User ${msg.senderId}`}
      </span>
      
      {/* Message Bubble */}
      <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${
        isOwnMessage 
          ? 'bg-blue-600 text-white rounded-tr-none' 
          : 'bg-white border text-gray-800 rounded-tl-none'
      }`}>
        {msg.content}
      </div>

      {/* Dynamic Read Receipt */}
      {readers.length > 0 && (
        <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
          <span className="text-blue-500 font-bold">✓✓</span> 
          <span>Read by: {readers.join(', ')}</span>
        </div>
      )}
    </div>
  );
});

export default GroupMessage;