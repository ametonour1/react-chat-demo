import { useEffect, useRef, useCallback } from 'react';

export const useReadReceiptTrigger = (messages, onVisible, currentUserId) => {
    const observer = useRef(null);
    const lastEmittedId = useRef(null); // 📓 This remembers the last message we successfully sent

    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const lastMessageId = lastMessage?.id;
    const senderId = lastMessage?.senderId;

    const setLastMessageRef = useCallback((node) => {
        if (observer.current) observer.current.disconnect();

        if (node && lastMessageId) {
            observer.current = new IntersectionObserver((entries) => {
                const isVisible = entries[0].isIntersecting;
                
                // 🛡️ THE TRIPLE CHECK:
                // 1. Is it visible?
                // 2. Is it NOT my own message?
                // 3. Have I NOT already sent a receipt for this specific ID?
                if (isVisible && 
                    senderId !== currentUserId && 
                    lastEmittedId.current !== lastMessageId
                ) {
                    console.log("✅ New message discovered! Emitting:", lastMessageId);
                    
                    onVisible(lastMessageId);
                    
                    // ✍️ Save this ID so we don't spam the server for this same message again
                    lastEmittedId.current = lastMessageId;
                }
            }, { threshold: 0.1 });

            observer.current.observe(node);
        }
    }, [lastMessageId, senderId, currentUserId, onVisible]);

    return setLastMessageRef;
};