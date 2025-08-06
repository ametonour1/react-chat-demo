import { createContext, useContext, useEffect, useState ,useRef} from "react";
import SockJS from "sockjs-client";
import { Stomp } from "@stomp/stompjs";
import { jwtDecode } from 'jwt-decode';
import { getPrivateKey } from "../helpers/indexedDbUtils";
import { decryptMessage } from "../helpers/messageEncryptionHelpers";
import { useIncomingMessageNotificationSound } from "../helpers/useNotificationSound";
import { fetchRecentChats } from "../helpers/fetchRecentChats";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("authToken") || null);
  const [stompClient, setStompClient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const selectedUserRef = useRef(selectedUser);
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


  const login = (token) => {
    localStorage.setItem("authToken", token);
    setToken(token);
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    setToken(null);
  };

  function parseUserIdFromToken(token) {
   const decoded = jwtDecode(token);
   const userId = decoded.userId
  return userId;
}

useEffect(() => {
  console.log("Messages updated:", messages);
}, [messages]);
useEffect(() => {
  selectedUserRef.current = selectedUser;
}, [selectedUser]);

  return (
    <AuthContext.Provider value={{ token, login, logout,messages,setMessages,userId, recentChats, setRecentChats, isAuthenticated: !!token, stompClient,selectedUser,setSelectedUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
