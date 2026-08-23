'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(workspaceId: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [latestEvent, setLatestEvent] = useState<{ type: string; payload: unknown } | null>(null);

  useEffect(() => {
    // Connect to the API server (adjust URL based on env in production)
    const socketInstance = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
      auth: {
        token: 'MOCK_TOKEN', // In a real app, grab from cookies/localStorage
      },
    });

    socketInstance.on('connect', () => {
      console.log('Connected to WebSockets');
      // Request to join the workspace channel to receive isolated events
      socketInstance.emit('join_workspace', { workspaceId });
    });

    // Listen to Standup Events
    socketInstance.on('new_standup_submitted', (payload) => {
      setLatestEvent({ type: 'new_standup_submitted', payload });
    });

    // Listen to AI Summary Events
    socketInstance.on('new_daily_summary', (payload) => {
      setLatestEvent({ type: 'new_daily_summary', payload });
    });

    // Listen to AI Blocker Events
    socketInstance.on('blocker_detected', (payload) => {
      setLatestEvent({ type: 'blocker_detected', payload });
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [workspaceId]);

  return { socket, latestEvent };
}
