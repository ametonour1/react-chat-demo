import { createContext, useContext, useEffect, useState ,useRef} from "react";
import SockJS from "sockjs-client";
import { Stomp } from "@stomp/stompjs";
import { jwtDecode } from 'jwt-decode';
import { getPrivateKey } from "../helpers/indexedDbUtils";
import { decryptMessage } from "../helpers/messageEncryptionHelpers";
import { decryptGroupAES } from "../helpers/encryptGroupMessage";
import { useIncomingMessageNotificationSound } from "../helpers/useNotificationSound";
import { fetchRecentChats } from "../helpers/fetchRecentChats";
import { ensureGroupKey, ensureKeyring } from "../helpers/groupEncryptionService";
import { subscribeToGroupLiveStatus, handleKickedUser } from "../helpers/groupChatHelpers";


const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("authToken") || null);
  const [stompClient, setStompClient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [groupMessages, setGroupMessages] = useState([]);

  const [recentChats, setRecentChats] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const selectedUserRef = useRef(selectedUser);
  const [activeView, setActiveView] = useState('default');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const currentSubRef = useRef(null);
  const [groupReadCursors, setGroupReadCursors] = useState({});
  const [groupChatMembers, setGroupChatMembers] = useState([]);
  const [groupKey, setGroupKey] = useState(null)
  
  const [keyVersion, setKeyVersion] = useState(null);
  const [keyring, setKeyring] = useState({});
  const keyringRef = useRef({});




  const playIncomingNotificationSound = useIncomingMessageNotificationSound();
  

  const userId = token ? parseUserIdFromToken(token) : null;


    useEffect(() => {
    if (!token) {
      if (stompClient) {
        stompClient.disconnect();
        setStompClient(null);
      }
      return;
    }
  console.log("userId",userId)


    const socket = new SockJS(`http://localhost:8080/ws?userId=${userId}`);
    const client = Stomp.over(socket);

    let heartbeatIntervalId;

    client.connect({}, () => {
      console.log("WebSocket connected");

      // Register user on backend if needed
      client.send("/app/register", {}, JSON.stringify({ userId }));

      // Subscribe to personal topic for incoming messages
      client.subscribe(`/topic/messages/${userId}`, (msg) => {

        (async () => {
        const data = JSON.parse(msg.body);

        const {
          senderId,
          recipientId,
          content,
          encryptedAESKeyForRecipient,
          encryptedAESKeyForSender,
          iv,
          me
        } = data;
      // if (!me   && senderId !== selectedUser?.userId) {
      //     // Ignore messages from other users
      //     return;
      //   }
      const currentSelectedUser = selectedUserRef.current;
     if (
          !me &&
          senderId !== parseInt(currentSelectedUser?.userId) &&
          recipientId !== parseInt(currentSelectedUser?.userId)
        ) {
          // const updatedRecentChats = await fetchRecentChats()
          // setRecentChats(updatedRecentChats)
          playIncomingNotificationSound()
          return; // ignore irrelevant messages
        }
    console.log("currentUser",userId,"isMe",me,"senderId",senderId,"recipientId",recipientId,"selcetedUser",currentSelectedUser.userId)
    const encryptedAESKey = me ? encryptedAESKeyForSender : encryptedAESKeyForRecipient;
   


    const privateKey = await getPrivateKey(userId); // from IndexedDB
 

    const decryptedMessage = await decryptMessage(
      content,
      encryptedAESKey,
      iv,
      privateKey
    );
    //console.log("decrtyptedMessease",decryptMessage)

    setMessages((prev) => [
      ...prev,
      {
        ...data,
        content: decryptedMessage, // inject decrypted message
      }
    ]);
  })().catch((err) => {
    console.error("Decryption failed:", err);
  });
      });

  
      client.subscribe('/topic/status/' + userId, function(message) {
      const statusUpdate = JSON.parse(message.body);
      console.log("User", statusUpdate.userId, "is online:", statusUpdate.online);
       setRecentChats(prevChats =>
          prevChats.map(chat =>
            chat.userId === statusUpdate.userId
              ? { ...chat, online: statusUpdate.online }
              : chat
          ))
  });

      client.subscribe(`/topic/cached-messages/${userId}`, (msg) => {
     (async () => {
    const cachedMessages = JSON.parse(msg.body);
    console.log(cachedMessages,"chacedMessages")

    // Load private key once per batch
    const privateKey = await getPrivateKey(userId);

    // Process all messages asynchronously
    const enrichedMessages = await Promise.all(
      cachedMessages.map(async (m) => {
        const me = m.senderId === userId;
        const encryptedAESKey = me ? m.encryptedAESKeyForSender : m.encryptedAESKeyForRecipient;

        // Decrypt the content
        const decryptedContent = await decryptMessage(m.content, encryptedAESKey, m.iv, privateKey);

        return {
          ...m,
          me,
          content: decryptedContent,
        };
      })
    );

    // Now update your state or UI with decrypted messages
   setMessages((prev) =>
  [...prev, ...enrichedMessages].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  )
);
  })().catch((err) => {
    console.error("Error decrypting cached messages:", err);
  });
    });
      client.subscribe(`/topic/recent-chats/${userId}`, (message) => {
       
        const updatedChats = JSON.parse(message.body);
         const currentSelectedUser = selectedUserRef.current;
        console.log("websocet call:", updatedChats)
          const safeChats = updatedChats.map(chat => {
          if (chat.userId === currentSelectedUser?.userId?.toString()) {
            return { ...chat, hasUnreadMessage: false };
          }
          return chat;
        });

        setRecentChats(safeChats);
      });


      client.subscribe(`/topic/message-status/${userId}`, (message) => {
      const statusUpdate = JSON.parse(message.body); // { messageId, status }
      console.log("Message status update received:", statusUpdate);

      // Update messages state: find the message and update its status
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === statusUpdate.messageId
            ? { ...msg, status: statusUpdate.status }
            : msg
        )
      );

      // If you want, update recent chats' last message status as well
      // setRecentChats(prevChats =>
      //   prevChats.map(chat => {
      //     if (chat.lastMessageId === statusUpdate.messageId) {
      //       return { ...chat, lastMessageStatus: statusUpdate.status };
      //     }
      //     return chat;
      //   })
      // );
    });

      

      heartbeatIntervalId = setInterval(() => {
      client.send("/app/heartbeat", {}, JSON.stringify({ userId }));
    }, 45000);
    });

    setStompClient(client);

    return () => {
      if (heartbeatIntervalId) clearInterval(heartbeatIntervalId);
      if (client) {
        client.disconnect();
        console.log("WebSocket disconnected");
      }
    };
  }, [token, userId]);


  const login = (token, userData) => {
    console.log("userData",userData);
    localStorage.setItem("authToken", token);
    localStorage.setItem('chat_user', JSON.stringify(userData));
    setUser(userData);
    setToken(token);
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("chat_user");
    setUser(null);
    setToken(null);
  };

  function parseUserIdFromToken(token) {
   const decoded = jwtDecode(token);
   const userId = decoded.userId
  return userId;
}

const processEncryptedMessage = async (incoming, currentKeyring, currentUserId) => {
    // 1. Get the key for this specific version
    const groupAesKey = currentKeyring[incoming.keyVersion];

    if (!groupAesKey) {
      console.log("currentKeyring",currentKeyring)
        throw new Error(`Missing key for version ${incoming.keyVersion}`);
    }

    // 2. Decrypt the content
    const decryptedText = await decryptGroupAES(
        incoming.content,
        incoming.iv,
        groupAesKey
    );

    // 3. Return the formatted message object
    return decryptedText;
};


const subscribeToGroupLive =  async (groupId) => {
  if (!stompClient ) return null;

  console.log(`Subscribing to live feed for group: ${groupId}`);

  // This is the "Live" pipe

  const  subscription = stompClient.subscribe(`/topic/group/${groupId}`, async (msg) => {
    try {
        const incoming = JSON.parse(msg.body);
        console.log("📥 Group Event:", incoming.type || "CHAT_MESSAGE");

        switch (incoming.type) {
            case 'KEY_ROTATION':
                console.warn("🔐 Security Update: New key version detected:", incoming.newVersion);
                // Refresh the keyring from the server/Postgres
                 await ensureKeyring(groupId, userId, token,incoming.newVersion, setGroupKey, setKeyring);
                
                // // Update member list UI
                 setGroupChatMembers((prev) => prev.filter(m => m.userId !== incoming.kickedUserId));
                 setKeyVersion(incoming.newVersion);
                break;

            case 'MEMBER_JOINED':
                // logic for new members...
                break;

            default: 
                // Default case handles standard 'CHAT_MESSAGE'
                try {
                    const decryptedText = await processEncryptedMessage(
                        incoming, 
                        keyringRef.current, 
                        userId
                    );
                         setGroupMessages((prev) => [
                            ...prev, 
                            { 
                              ...incoming, 
                              content: decryptedText, 
                              me: incoming.senderId === userId 
                            }
                          ]);
                } catch (decryptError) {
                    console.error("Decryption failed. Syncing keys...", decryptError);
                    // If key is missing, try to sync and retry once
                    //await ensureKeyring(groupId, incoming.keyVersion);
                }
                break;
        }
    } catch (err) {
        console.error("Socket processing error:", err);
    }

    currentSubRef.current = subscription;
  });


};

const handleIncomingReadReceipt = (receipt) => {
    
    
    setGroupReadCursors((prevCursors) => {
      
        const incomingUserId = receipt.userId;
        const incomingMessageId = Number(receipt.lastReadMessageId);
        
  
        const existingLastRead = prevCursors[incomingUserId];
        

        if (!existingLastRead || incomingMessageId > existingLastRead) {
            return {
                ...prevCursors,
                [incomingUserId]: incomingMessageId 
            };
        }
        
 
        return prevCursors;
    });
};

const subscribeToPrivateEvents = (stompClient) => {
    
    // Spring magic: /user/queue/... maps to the specific authenticated user
    stompClient.subscribe('/user/queue/kick', (message) => {
        const data = JSON.parse(message.body);
        console.warn("🚨 Kick event received for group:", data.groupId);
        setSelectedUser(null)

        setActiveView('default')

        handleKickedUser(data.groupId);

    });
};
useEffect(() => {
 
    if (stompClient && stompClient.connected) {
        subscribeToPrivateEvents(stompClient);
    } else {
        console.log("Waiting for stompClient to connect...");
    }
}, [stompClient, stompClient?.connected]);
useEffect(() => {
  console.log("Messages updated:", messages);
}, [messages]);
useEffect(() => {
  selectedUserRef.current = selectedUser;
}, [selectedUser]);

useEffect(() => {
    const savedUser = localStorage.getItem('chat_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);

  }, []);

  useEffect(() => {
  let liveSub = null;

  if (selectedUser?.type === "GROUP") {

      liveSub = subscribeToGroupLive(selectedUser.userId);

      liveSub = subscribeToGroupLiveStatus(
            stompClient, 
            selectedUser.userId, 
            handleIncomingReadReceipt 
        );
  }
  return () => {
    if (currentSubRef.current) {
      console.log("Unsubscribing from group:", selectedUser?.userId);
      currentSubRef.current.unsubscribe();
      currentSubRef.current = null;
    }
  };
}, [selectedUser?.userId]);

useEffect(()=>{
  console.log("group members updated", groupChatMembers)
  console.log("group messages updated", groupMessages)

},
[ groupChatMembers, groupMessages])

useEffect(() => {
    keyringRef.current = keyring;
    console.log("keyringAtUseeffect")
}, [keyring]);
  return (
    <AuthContext.Provider value={{ token, login, logout,messages,setMessages,userId,user, recentChats, setRecentChats, isAuthenticated: !!token, stompClient,selectedUser,setSelectedUser ,activeView, setActiveView, groupMessages, setGroupMessages,groupReadCursors,setGroupReadCursors,groupChatMembers, setGroupChatMembers,keyVersion, setKeyVersion, keyring, setKeyring, groupKey, setGroupKey}}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
