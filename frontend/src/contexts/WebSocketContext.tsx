import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { useAuth } from './AuthContext';
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
  sendMessage: (type: string, data: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();
  const webSocketRef = useRef<WebSocket | null>(null);

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
    // Use the correct WebSocket URL
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use the backend server port explicitly
    const wsUrl = `${wsProtocol}//localhost:3001/ws`;
    console.log('Connecting to WebSocket server at:', wsUrl);
    const ws = new WebSocket(wsUrl);
    webSocketRef.current = ws;

    // WebSocket event handlers
    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      // Authenticate with the server
      if (user && user.id) {
        ws.send(JSON.stringify({
          type: 'authenticate',
          userId: user.id
        }));
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'user_status_change') {
          handleUserStatusChange(data);
        } else if (data.type === 'active_users_update') {
          console.log('Active users updated:', data.users);
          setActiveUsers(data.users);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    // Handle user status changes
    const handleUserStatusChange = (data: { userId: string; active: boolean }) => {
      if (data.active) {
        // User became active
        api.getUserById(data.userId)
          .then(userData => {
            setActiveUsers(prev => {
              // Check if user already exists in the list
              const exists = prev.some(user => user.id === userData.id);
              if (exists) {
                // Update the existing user
                return prev.map(user => 
                  user.id === userData.id ? { ...userData, lastActive: new Date() } : user
                );
              } else {
                // Add the new user
                return [...prev, { ...userData, lastActive: new Date() }];
              }
            });
          })
          .catch(error => console.error('Error fetching user data:', error));
      } else {
        // User became inactive
        setActiveUsers(prev => prev.filter(user => user.id !== data.userId));
      }
    };

    // Clean up on unmount
    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
    };
  }, [user]);

  // Function to send messages through WebSocket
  const sendMessage = (type: string, data: any) => {
    if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
      webSocketRef.current.send(JSON.stringify({
        type,
        ...data
      }));
    } else {
      console.error('WebSocket is not connected');
    }
  };

  return (
    <WebSocketContext.Provider value={{ activeUsers, isConnected, sendMessage }}>
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