import {saveGroupChatKey} from "./indexedDbUtils"


export const fetchGroupChatKeys = async (groupId, token, userId) => {
  try {
    const res = await fetch(`${process.env.REACT_APP_API_URL}/group-chats/${groupId}/keys`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.status === 204) {
      console.log('No keys found for this user and group');
      return [];
    }

    if (!res.ok) {
      throw new Error('Failed to fetch encrypted keys');
    }

    const keys = await res.json();
    keys.forEach(key => {
    saveGroupChatKey(groupId, key.userId, key.encryptedKey, key.keyVersion);
    });
    return keys;
  } catch (error) {
    console.error('Error fetching keys:', error.message);
    return [];
  }
};
