import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { session } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!session?.access_token) {
      setSocket(null);
      return;
    }

    const BACKEND = import.meta.env.VITE_API_URL || '';
    const s = io(BACKEND, {
      auth: { token: session.access_token },
      transports: ['websocket', 'polling']
    });

    s.on('connect', () => console.log('[socket] connected'));
    s.on('connect_error', (err) => console.error('[socket] error:', err.message));

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [session?.access_token]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
