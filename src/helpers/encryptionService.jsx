// services/encryptionService.js
export async function checkEncryptionStatus(userId,token) {
  const response = await fetch(`${process.env.REACT_APP_API_URL}/encryption/status/${userId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
       Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to check encryption status: ${response.status}`);
  }

  const data = await response.json();
  console.log("userHasKeys",data)
  return data.hasKeys;
}


export async function storeEncryptionKey({
  userId,
  privateKeyEncrypted,
  publicKey,
  salt,
  iv,
  token
}) {
  try {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/encryption/store`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
         Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        userId,
        privateKeyEncrypted,
        publicKey,
        salt,
        iv
      })
    });

    if (!response.ok) {
      if (response.status === 409) {
        throw new Error("Encryption key already exists for user.");
      } else {
        throw new Error("Failed to store encryption key.");
      }
    }

    const message = await response.text();
    return { success: true, message };

  } catch (err) {
    console.error("Error storing encryption key:", err);
    return { success: false, error: err.message };
  }
}


export async function fetchUserKeys(userId, token) {
  try {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/encryption/fetch/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch keys: ${response.status}`);
    }

    const data = await response.json();
    console.log('User Keys:', data);
    return data;
  } catch (error) {
    console.error('Error fetching user keys:', error);
    return null;
  }
}