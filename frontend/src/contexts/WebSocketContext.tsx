import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/server/api';

interface ActiveUser {
  id: string;
  username: string;
  surname?: string;
  role: string;
  active: number | boolean;
}

interface LessonNotification {
  lessonId: string;
  lessonName: string;
  teacherName: string;
  duration: number;
  startTime?: Date;
}

interface WebSocketContextType {
  activeUsers: ActiveUser[];
  isConnected: boolean;
  sendMessage: (type: string, data: any) => void;
  activeLessonNotification: LessonNotification | null;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeLessonNotification, setActiveLessonNotification] = useState<LessonNotification | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const webSocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  // Fetch active users from the API
  const fetchActiveUsers = async () => {
    try {
      const users = await api.getActiveUsers();
      console.log('Raw users from API:', users);
      
      // Filter active users and ensure proper active status
      const filteredUsers = users.filter(u => {
        // Consider a user active if their active status is 1 or true
        const isActive = u.active === 1 || u.active === true;
        return isActive;
      });
      
      console.log('Filtered active users before adding current user:', filteredUsers);
      
      // Always ensure current user is included if they're logged in
      if (user && !filteredUsers.some(u => u.id === user.id)) {
        console.log('Adding current user to active users list:', user);
        filteredUsers.push({
          id: user.id,
          username: user.username,
          surname: user.surname || '',
          role: user.role,
          active: 1
        });
      }
      
      console.log('Final active users list:', filteredUsers);
      setActiveUsers(filteredUsers);
    } catch (error) {
      console.error('Failed to fetch active users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch active users",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!user) {
      setIsConnected(false);
      setActiveUsers([]);
      return;
    }

    const connectWebSocket = () => {
      try {
        // Close existing connection if any
        if (webSocketRef.current) {
          webSocketRef.current.close();
        }

        console.log('Attempting to connect to WebSocket...');
        const socket = new WebSocket('ws://localhost:8000/ws');
        webSocketRef.current = socket;

        socket.onopen = () => {
          console.log('WebSocket connected successfully');
          setIsConnected(true);
          reconnectAttemptsRef.current = 0;
          
          // Authenticate immediately after connection
          if (user?.id) {
            const authMessage = JSON.stringify({
              type: 'authenticate',
              userId: user.id,
              username: user.username,
              surname: user.surname || '',
              role: user.role
            });
            console.log('Sending authentication message:', authMessage);
            socket.send(authMessage);
            
            // Update user's active status and fetch initial active users
            api.updateActiveStatus(true)
              .then(() => {
                console.log('User active status updated');
                return fetchActiveUsers();
              })
              .catch(error => console.error('Failed to update active status:', error));
          }
        };

        socket.onclose = (event) => {
          console.log('WebSocket disconnected:', event);
          setIsConnected(false);

          // Attempt to reconnect if we haven't exceeded max attempts
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            console.log(`Reconnect attempt ${reconnectAttemptsRef.current + 1} of ${MAX_RECONNECT_ATTEMPTS}`);
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current += 1;
              connectWebSocket();
            }, 5000);
          } else {
            console.log('Max reconnection attempts reached');
            toast({
              title: "Connection Lost",
              description: "Unable to reconnect to the server. Please refresh the page.",
              variant: "destructive",
            });
          }
        };

        socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
          toast({
            title: "Connection Error",
            description: "Failed to connect to the server",
            variant: "destructive",
          });
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('Received WebSocket message:', data);
            
            switch (data.type) {
              case 'user_status_change':
                console.log('Handling user status change:', data);
                handleUserStatusChange(data);
                break;
              case 'active_users_update':
                console.log('Received active users update:', data.users);
                const updatedUsers = data.users.filter((u: ActiveUser) => {
                  const isActive = u.active === 1 || u.active === true;
                  return isActive;
                });
                
                // Always ensure current user is included
                if (user && !updatedUsers.some(u => u.id === user.id)) {
                  console.log('Adding current user to active users update:', user);
                  updatedUsers.push({
                    id: user.id,
                    username: user.username,
                    surname: user.surname || '',
                    role: user.role,
                    active: 1
                  });
                }
                
                console.log('Setting updated active users:', updatedUsers);
                setActiveUsers(updatedUsers);
                break;
              case 'lessonStarted':
                handleLessonStarted(data);
                break;
              case 'lessonEnded':
                handleLessonEnded(data);
                break;
              default:
                console.log('Unknown message type:', data.type);
            }
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
          }
        };
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        toast({
          title: "Connection Error",
          description: "Failed to establish WebSocket connection",
          variant: "destructive",
        });
      }
    };

    // Initial connection
    connectWebSocket();

    // Set up periodic active status update and user list refresh
    const statusInterval = setInterval(() => {
      if (isConnected && user) {
        console.log('Performing periodic active status update and user list refresh');
        api.updateActiveStatus(true)
          .then(() => {
            console.log('Active status refreshed');
            return fetchActiveUsers();
          })
          .catch(error => console.error('Failed to refresh status or fetch users:', error));
      }
    }, 30000); // Update every 30 seconds

    // Cleanup function
    return () => {
      console.log('Cleaning up WebSocket connection...');
      clearInterval(statusInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (webSocketRef.current) {
        api.updateActiveStatus(false)
          .then(() => console.log('User active status updated to inactive'))
          .catch(error => console.error('Failed to update active status:', error));
        webSocketRef.current.close();
      }
    };
  }, [user, toast]);

  const handleUserStatusChange = async (data: { userId: string; active: boolean }) => {
    try {
      await fetchActiveUsers(); // Refresh the active users list
      
      // Show toast for user status change
      const changedUser = activeUsers.find(u => u.id === data.userId);
      if (changedUser && user?.id !== data.userId) {
        toast({
          title: data.active ? "User Online" : "User Offline",
          description: `${changedUser.username} is now ${data.active ? 'online' : 'offline'}`,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error handling user status change:', error);
    }
  };

  const handleLessonStarted = (data: LessonNotification) => {
    console.log('Lesson started notification received:', data);
    
    setActiveLessonNotification({
      ...data,
      startTime: new Date()
    });
    
    if (user && data.teacherName !== user.username) {
      toast({
        title: "Lesson Started",
        description: `${data.teacherName} has started the lesson "${data.lessonName}" for ${data.duration} minutes.`,
        duration: 5000,
      });
    }
  };

  const handleLessonEnded = (data: { lessonId: string, teacherName: string }) => {
    console.log('Lesson ended notification received:', data);
    
    if (activeLessonNotification && activeLessonNotification.lessonId === data.lessonId) {
      setActiveLessonNotification(null);
      
      if (user && data.teacherName !== user.username) {
        toast({
          title: "Lesson Ended",
          description: `${data.teacherName} has ended the lesson.`,
          duration: 5000,
        });
      }
    }
  };

  return (
    <WebSocketContext.Provider value={{ 
      activeUsers, 
      isConnected, 
      sendMessage: (type: string, data: any) => {
        if (webSocketRef.current?.readyState === WebSocket.OPEN) {
          webSocketRef.current.send(JSON.stringify({ type, ...data }));
        } else {
          console.error('Cannot send message: WebSocket is not connected');
          toast({
            title: "Connection Error",
            description: "Cannot send message: Not connected to server",
            variant: "destructive",
          });
        }
      },
      activeLessonNotification
    }}>
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