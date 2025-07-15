import { createContext, useContext, useEffect, useState } from "react";
import SockJS from "sockjs-client";
import { Stomp } from "@stomp/stompjs";
import { jwtDecode } from 'jwt-decode';
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("authToken") || null);
  const [stompClient, setStompClient] = useState(null);
  const [messages, setMessages] = useState([]);

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

    const socket = new SockJS("http://localhost:8080/ws");
    const client = Stomp.over(socket);

    client.connect({}, () => {
      console.log("WebSocket connected");

      // Register user on backend if needed
      client.send("/app/register", {}, JSON.stringify({ userId }));

      // Subscribe to personal topic for incoming messages
      client.subscribe(`/topic/messages/${userId}`, (msg) => {
        setMessages((prev) => [...prev, JSON.parse(msg.body)]);
      });
    });

    setStompClient(client);

    return () => {
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


  return (
    <AuthContext.Provider value={{ token, login, logout,messages,setMessages,userId, isAuthenticated: !!token, stompClient }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
