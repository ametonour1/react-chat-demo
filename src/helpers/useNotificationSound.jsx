import { useRef } from 'react';

export function useIncomingMessageNotificationSound(src = '/soundEffects/incomingMessage.mp3') {
  const audioRef = useRef(null);

  function play() {
    if (!audioRef.current) {
      audioRef.current = new Audio(src);
    }
    audioRef.current.play().catch((e) => {
      console.log('Notification sound play prevented:', e);
    });
  }

  return play;
}

// Usage inside a component:
// const playNotificationSound = useNotificationSound();
// playNotificationSound();
