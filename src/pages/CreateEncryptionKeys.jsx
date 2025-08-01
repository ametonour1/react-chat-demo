// pages/CreateEncryptionKeys.js
import React, { useState } from "react";
import {
  generateKeyPair,
  deriveKey,
  encryptPrivateKey,
  decryptPrivateKey,
  bufferToBase64,
  exportPublicKeyToBase64
} from "../helpers/cryptoHelpers";
import { savePrivateKey } from '../helpers/indexedDbUtils';
import { useAuth } from "../context/AuthContext";
import { storeEncryptionKey } from "../helpers/encryptionService";
import { useNavigate } from "react-router-dom";

function CreateEncryptionKeys() {
  const [pin, setPin] = useState("");
  const [publicKeyInfo, setPublicKeyInfo] = useState("");
  const [status, setStatus] = useState("");
  const { userId } = useAuth();
  const {token} = useAuth()
  const navigate = useNavigate();
  
  

  async function handleGenerateKeys() {
    try {
      setStatus("🔐 Generating keys...");

      const salt = window.crypto.getRandomValues(new Uint8Array(16)); // save this later
      const { publicKey, privateKey } = await generateKeyPair();

      const encryptionKey = await deriveKey(pin, salt);
      const { encryptedPrivateKey, iv } = await encryptPrivateKey(privateKey, encryptionKey);

      // For testing: decrypt immediately to ensure it works
      const derivedKeyAgain = await deriveKey(pin, salt);
      const decryptedPrivateKey = await decryptPrivateKey(encryptedPrivateKey, iv, derivedKeyAgain);
      await savePrivateKey(userId, decryptedPrivateKey);
  
  // 🔐 Convert binary values to base64 for transmission
  const encryptedPrivateKeyBase64 = bufferToBase64(encryptedPrivateKey);
  const saltBase64 = bufferToBase64(salt);
  const ivBase64 = bufferToBase64(iv);
  const publicKeyBase64 = await exportPublicKeyToBase64(publicKey); // assuming it's in binary, else skip

      
  // 🔁 Store to backend
  const result = await storeEncryptionKey({
    userId: userId,
    privateKeyEncrypted: encryptedPrivateKey,
    publicKey: publicKeyBase64,
    salt: saltBase64,
    iv: iv,
    token:token,
  });

  if (result.success) {
    console.log("✅ Keys stored successfully!");
  } else {
    console.error("❌ Error storing keys:", result.error);
  }

      setPublicKeyInfo(publicKey);
      savePrivateKey(userId,decryptedPrivateKey)

      setStatus("✅ Key pair generated and private key encrypted successfully!");
       setTimeout(() => {
        navigate("/dashboard"); // or whatever your route is
        }, 1500);
    } catch (err) {
      console.error("Key generation failed:", err);
      setStatus("❌ Failed to generate keys.");
    }
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h2>🔐 Set Up Your Encryption Keys</h2>
      <p>Choose a master PIN to protect your private key.</p>

      <input
        type="password"
        value={pin}
        placeholder="Enter master PIN"
        onChange={(e) => setPin(e.target.value)}
        style={{ padding: "0.5rem", marginRight: "1rem" }}
      />
      <button onClick={handleGenerateKeys}>Generate Keys</button>

      <div style={{ marginTop: "1rem", fontSize: "0.9rem" }}>
        <strong>Status:</strong> {status}
      </div>

      {publicKeyInfo && (
        <div style={{ marginTop: "1rem" }}>
          <strong>Public Key:</strong>
          <pre style={{ background: "#f4f4f4", padding: "1rem" }}>
            {JSON.stringify(publicKeyInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default CreateEncryptionKeys;
