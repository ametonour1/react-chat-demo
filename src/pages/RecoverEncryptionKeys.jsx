import { useState } from "react";
import { useAuth } from "../context/AuthContext";
 import {
  deriveKey,
  decryptPrivateKey,
  base64ToUint8Array
} from "../helpers/cryptoHelpers";
import { fetchUserKeys } from "../helpers/encryptionService";
import {savePrivateKey, savePublicKey} from "../helpers/indexedDbUtils"
import { useNavigate } from "react-router-dom";



export default function RecoverEncryptionKeys() {
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState("");
  const [decryptedPrivateKey, setDecryptedPrivateKey] = useState("");
  const {token} = useAuth()
  const { userId } = useAuth();
  const navigate = useNavigate();
  

  const handleRecover = async () => {
    try {


      const { privateKeyEncrypted, iv, salt, publicKey } = await fetchUserKeys(userId, token);

      const decodedSalt = base64ToUint8Array(salt);
      const derivedKey = await deriveKey(pin, decodedSalt);
      const decrypted = await decryptPrivateKey(privateKeyEncrypted, iv, derivedKey);

      setDecryptedPrivateKey(decrypted);
      savePrivateKey(userId,decrypted)
      savePublicKey(userId,publicKey)
      setStatus("✅ Private key recovered successfully.");
        setTimeout(() => {
        navigate("/dashboard"); // or whatever your route is
        }, 1500);

    } catch (e) {
      console.error(e);
      setStatus("Failed to decrypt key. Wrong PIN?");
    }
  };

  return (
    <div>
      <h2>Recover Encryption Keys</h2>
      <input
        type="password"
        placeholder="Enter your PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
      />
      <button onClick={handleRecover}>Recover</button>
      <p>{status}</p>
      {decryptedPrivateKey && (
        <textarea rows="8" value={decryptedPrivateKey} readOnly />
      )}
    </div>
  );
}
