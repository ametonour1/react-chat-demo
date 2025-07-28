import { createContext, useContext, useEffect, useState } from "react";
import SockJS from "sockjs-client";
import { Stomp } from "@stomp/stompjs";
import { jwtDecode } from 'jwt-decode';
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("authToken") || null);
  const [stompClient, setStompClient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  

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
        setMessages((prev) => [...prev, JSON.parse(msg.body)]);
        //console.log(messages,"messages")

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
      const cachedMessages = JSON.parse(msg.body);
        // Inject "me" flag based on senderId === current user's ID
      const enrichedMessages = cachedMessages.map((m) => ({
        ...m,
        me: m.senderId === userId,
      }));

      setMessages(enrichedMessages);
      console.log(enrichedMessages,"chahed messages")
    });
      client.subscribe(`/topic/recent-chats/${userId}`, (message) => {
       
        const updatedChats = JSON.parse(message.body);
        // console.log("websocet call:", updatedChats)
        setRecentChats(updatedChats); // this updates the state and refreshes the UI
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

  return (
    <AuthContext.Provider value={{ token, login, logout,messages,setMessages,userId, recentChats, setRecentChats, isAuthenticated: !!token, stompClient }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
