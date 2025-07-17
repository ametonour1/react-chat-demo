// src/pages/Dashboard.jsx

import React, {useEffect} from "react";
import ChatSender from "./ChatSender";
import ChatComponent from "../components/ChatComponent";
import { useAuth } from "../context/AuthContext";
import { fetchRecentChats } from "../helpers/fetchRecentChats"

  

export default function Dashboard() {
  const {recentChats, setRecentChats} = useAuth(); 
  const {token} = useAuth()

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
      <ChatComponent  recentChats={recentChats}/>
    </div>
  );
}
