import React, { useState, useEffect } from 'react';
import { useAuth } from "../context/AuthContext";
import {fetchGroupChatKeys} from "../helpers/groupEncryptionService"
import {saveGroupChatKey} from "../helpers/indexedDbUtils"


const CreateGroupForm = ({ onBack, founderUserId, recentChats }) => {
  const [groupName, setGroupName] = useState('');
  const [users, setUsers] = useState([]); // Load from API or mock
  const [selectedMembers, setSelectedMembers] = useState([]); 
  const { userId } = useAuth(); 
  const {token} = useAuth()
  

  // Example: load users from your API or provide as props
  useEffect(() => {
    // fetch('/api/users')...
    setUsers(recentChats);
    console.log("recentChatsGroupForm",recentChats)
  }, []);

  const toggleMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const createGroup = async () => {
    if (!groupName || selectedMembers.length === 0) {
      alert('Please enter a group name and select at least one member.');
      return;
    }

    // Add founderUserId to members? Backend expects founder separately, so no
    const memberIds = selectedMembers.map(id => Number(id));
    const payload = {
      groupName,
        founderUserId: String(founderUserId),
      memberIds: memberIds,
    };


    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/group-chats/create`, {
        method: 'POST',
        headers: { 
               'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
         },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to create group');

      const data = await res.json();
      const groupId = data.id
      const keys = await fetchGroupChatKeys(groupId,token,userId)


      alert(`Group ${data.name} created!`);
      onBack(); // Go back to chat list or main view
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Create New Group</h2>

      <input
        type="text"
        className="w-full p-2 border rounded"
        placeholder="Group name"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
      />

      <div>
        <p className="font-medium mb-1">Select Members:</p>
        <div className="max-h-48 overflow-y-auto border p-2 rounded">
          {users.map((user) => (
            <label key={user.id} className="block">
              <input
                type="checkbox"
                checked={selectedMembers.includes(user.userId)}
                onChange={() => toggleMember(user.userId)}
              />{' '}
              {user.username}
            </label>
          ))}
          {users.length === 0 && (
            <p className="text-gray-500 italic">No users available.</p>
          )}
        </div>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-300 text-black rounded"
        >
          Cancel
        </button>
        <button
          onClick={createGroup}
          className="px-4 py-2 bg-blue-600 text-white rounded"
          disabled={!groupName || selectedMembers.length === 0}
        >
          Create Group
        </button>
      </div>
    </div>
  );
};

export default CreateGroupForm;
