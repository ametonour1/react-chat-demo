import React, { useState, useEffect } from 'react';
import { useAuth } from "../context/AuthContext";
import {fetchGroupChatKeys, createAndEncryptGroupKeys} from "../helpers/groupEncryptionService"
import {saveGroupChatKey, getPublicKey} from "../helpers/indexedDbUtils"


const CreateGroupForm = ({ onBack, recentChats }) => {
    const [groupName, setGroupName] = useState('');
    const [users, setUsers] = useState([]);
    const [selectedMembers, setSelectedMembers] = useState([]);
    const { userId, token } = useAuth();

    // Filter recentChats to only include users
    useEffect(() => {
        const userChats = recentChats.filter(chat => chat.type === 'USER');
        setUsers(userChats);
        console.log("recentChatsGroupForm", userChats);
    }, [recentChats]);

    const toggleMember = (memberId) => {
        const member = users.find(u => u.userId === memberId);
        if (!member) return;

        setSelectedMembers((prev) => {
            const isSelected = prev.some(m => m.userId === member.userId);
            if (isSelected) {
                return prev.filter(m => m.userId !== member.userId);
            } else {
                return [...prev, member];
            }
        });
    };

    const createGroup = async () => {
        if (!groupName || selectedMembers.length === 0) {
            alert('Please enter a group name and select at least one member.');
            return;
        }

        try {
             const founderPublicKey = await getPublicKey(userId);
            if (!founderPublicKey) {
                throw new Error("Founder's public key not found.");
            }

            // Step 2: Create a founder object with the required structure
            const founder = {
                userId: userId,
                username: null, // or fetch it if not available
                publicKey: founderPublicKey,
                type: 'USER',
                hasUnreadMessage: false,
                online: true,
                profileImageUrl: null
            };

             // Make sure founder is always in the member list
            const allMembers = Array.from(new Set([...selectedMembers, founder]));

            // Call the external function to handle all cryptographic work
            const membersWithKeys = await createAndEncryptGroupKeys(allMembers, userId);

            const payload = {
                groupName,
                founderUserId: userId,
                members: membersWithKeys,
            };
            console.log("creategroupPayload",JSON.stringify(payload))

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
            alert(`Group ${data.name, data.id} created!`);

                const groupId = data.id;

            // NEW: Request the encrypted group key for the current user
            const keyRes = await fetch(`${process.env.REACT_APP_API_URL}/group-chats/${groupId}/keys`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!keyRes.ok) {
                throw new Error('Failed to fetch group key');
            }

              const encryptedKeyData = await keyRes.json();
              const keyToSave = encryptedKeyData[0]; // Assuming the response is a list
              await saveGroupChatKey(
              groupId,
              userId,
              keyToSave.encryptedKey,
              keyToSave.keyVersion,
              keyToSave.iv // Pass the IV here
          );
                    
            onBack();
        } catch (err) {
            alert(err.message);
        }
    };

    // Render logic for the form...
    return (
    <div className="flex flex-col items-center p-5 font-sans bg-gray-100 rounded-lg shadow-md max-w-md mx-auto my-5">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Create New Group</h2>
      <input
        type="text"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        placeholder="Enter group name"
        className="w-full p-2 mb-4 text-base rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <h3 className="text-lg font-semibold text-gray-600 mb-2 self-start">Select Members</h3>
      <ul className="w-full  overflow-y-auto border border-gray-300 rounded-md bg-white">
        {users.map((user) => (
          <li key={user.userId} className="p-2 border-b border-gray-200 last:border-b-0">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={selectedMembers.some(m => m.userId === user.userId)}
                onChange={() => toggleMember(user.userId)}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
              />
              <span className="text-gray-700">{user.username}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex space-x-2 w-full">
        <button
          onClick={createGroup}
          className="flex-1 px-4 py-2 rounded-md border border-transparent bg-blue-600 text-white text-base font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Create Group
        </button>
        <button
          onClick={onBack}
          className="flex-1 px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 text-base font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default CreateGroupForm;
