import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { io, Socket } from 'socket.io-client';
import { api } from '@/server/api';

interface ActiveUser {
  id: string;
  username: string;
  role: string;
  lastActive: Date;
}

interface WebSocketContextType {
  activeUsers: ActiveUser[];
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  // Fetch active users from the API
  useEffect(() => {
    if (!user) return;

    const fetchActiveUsers = async () => {
      try {
        const response = await api.getActiveUsers();
        setActiveUsers(response);
      } catch (error) {
        console.error('Failed to fetch active users:', error);
      }
    };

    fetchActiveUsers();
  }, [user]);

  useEffect(() => {
    // Only connect if user is authenticated
    if (!user) {
      setIsConnected(false);
      return;
    }

    // Connect to WebSocket server
    // Use relative URL for WebSocket connection
    const socketInstance = io('/', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    setSocket(socketInstance);

    // Socket event handlers
    socketInstance.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      // Authenticate with the server
      socketInstance.emit('authenticate', user.id);
    });

    socketInstance.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    socketInstance.on('active_users_update', (users: ActiveUser[]) => {
      console.log('Active users updated:', users);
      setActiveUsers(users);
    });

    socketInstance.on('user_active', (newUser: ActiveUser) => {
      console.log('User became active:', newUser);
      setActiveUsers(prev => {
        // Check if user already exists in the list
        const exists = prev.some(user => user.id === newUser.id);
        if (exists) {
          // Update the existing user
          return prev.map(user => 
            user.id === newUser.id ? { ...user, lastActive: newUser.lastActive } : user
          );
        } else {
          // Add the new user
          return [...prev, newUser];
        }
      });
    });

    socketInstance.on('user_inactive', ({ userId }: { userId: string }) => {
      console.log('User became inactive:', userId);
      setActiveUsers(prev => prev.filter(user => user.id !== userId));
    });

    // Clean up on unmount
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [user]);

  return (
    <WebSocketContext.Provider value={{ activeUsers, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}; 