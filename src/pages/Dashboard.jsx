// src/pages/Dashboard.jsx

import React, {useEffect} from "react";
import ChatSender from "./ChatSender";
import ChatComponent from "../components/ChatComponent";
import { useAuth } from "../context/AuthContext";
import { fetchRecentChats } from "../helpers/fetchRecentChats"
import { useNavigate } from "react-router-dom";
import { getEncryptionKeysFromIndexedDB } from "../helpers/indexedDb";
import { checkEncryptionStatus, fetchUserKeys } from "../helpers/encryptionService";
import { getPrivateKey } from "../helpers/indexedDbUtils";


 import {
  generateKeyPair,
  deriveKey,
  encryptPrivateKey,
  decryptPrivateKey,
  bufferToBase64
} from "../helpers/cryptoHelpers";
  

export default function Dashboard() {
  const {recentChats, setRecentChats} = useAuth(); 
  const {token} = useAuth()
  const { userId } = useAuth();
  const navigate = useNavigate();
  


  useEffect(() => {
    async function verifyEncryptionSetup() {
      try {
        const localKey = await getPrivateKey(userId);
        console.log("localKey",localKey)
        if (localKey) return; // Key exists in IndexedDB

        // Check backend
        const hasKeys = await checkEncryptionStatus(userId,token);
        console.log(hasKeys,"hasKeysDashborad")
        if (!hasKeys) {
          navigate("/setup-encryption");
        }else{
          const keys = await fetchUserKeys(userId,token)
          navigate("/recover-encryption")
        }
      } catch (err) {
        console.error("Error checking encryption key:", err);
        navigate("/setup-encryption");
      }
    }

    verifyEncryptionSetup();
  }, [userId, navigate]);


    useEffect(() => {
      async function loadRecentChats() {
        console.log("useEffectRan",Date.now())

        const data = await fetchRecentChats(token);
        setRecentChats(data);
        console.log("useEffectover",Date.now())
      }
      loadRecentChats();
    }, []);




  return (
    <div className="page-container container">
      <ChatComponent  recentChats={recentChats} setRecentChats={setRecentChats}/>
    </div>
  );
}
