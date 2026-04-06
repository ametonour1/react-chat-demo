import { useEffect, useRef } from 'react';

export const useReadReceiptTrigger = (messages, onVisible) => {
    const observer = useRef(null);

    useEffect(() => {
        if (!messages || messages.length === 0) return;

        // 1. Clean up any previous observer
        if (observer.current) observer.current.disconnect();

        // 2. Create the observer
        observer.current = new IntersectionObserver((entries) => {
            const lastMessageEntry = entries[0];
            
            if (lastMessageEntry.isIntersecting) {
                const lastMessage = messages[messages.length - 1];
                onVisible(lastMessage.id);
            }
        }, { threshold: 0.5 });

        const lastMessageId = messages[messages.length - 1].id;
        const elementId = `message-${lastMessageId}`;

        // 🚀 BUG FIX: Give React a split second to render the DOM element before searching for it
        const timer = setTimeout(() => {
            const element = document.getElementById(elementId);
            console.log("element",element)
            
            if (element && observer.current) {
                observer.current.observe(element);
            } else {
                console.warn(`⚠️ Could not find DOM element with ID: ${elementId}`);
            }
        }, 50); // 50ms is plenty of time for a browser paint

        // Cleanup
        return () => {
            clearTimeout(timer);
            if (observer.current) observer.current.disconnect();
        };
        
    // 🚀 BUG FIX: Added onVisible to dependencies so it never gets stale!
    }, [messages, onVisible]); 
};