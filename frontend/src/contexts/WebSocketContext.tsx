import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { useAuth } from './AuthContext';
import { api } from '@/server/api';
import { useToast } from '@/components/ui/use-toast';

interface ActiveUser {
  id: string;
  username: string;
  role: string;
  lastActive: Date;
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
        } else if (data.type === 'lessonStarted') {
          handleLessonStarted(data);
        } else if (data.type === 'lessonEnded') {
          handleLessonEnded(data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    // Handle user status changes
    const handleUserStatusChange = (data: { userId: string; active: boolean }) => {
      if (data.active) {
        // User became active
        console.log(`User ${data.userId} is now active`);
      } else {
        // User became inactive
        console.log(`User ${data.userId} is now inactive`);
      }
    };

    // Handle lesson started notification
    const handleLessonStarted = (data: LessonNotification) => {
      console.log('Lesson started notification received:', data);
      
      // Set the active lesson notification
      setActiveLessonNotification({
        ...data,
        startTime: new Date()
      });
      
      // Show a toast notification if this is not the user who started the lesson
      if (user && data.teacherName !== user.username) {
        toast({
          title: "Lesson Started",
          description: `${data.teacherName} has started the lesson "${data.lessonName}" for ${data.duration} minutes.`,
          duration: 5000,
        });
      }
    };

    // Handle lesson ended notification
    const handleLessonEnded = (data: { lessonId: string, teacherName: string }) => {
      console.log('Lesson ended notification received:', data);
      
      // Clear the active lesson notification if it matches
      if (activeLessonNotification && activeLessonNotification.lessonId === data.lessonId) {
        setActiveLessonNotification(null);
        
        // Show a toast notification if this is not the user who ended the lesson
        if (user && data.teacherName !== user.username) {
          toast({
            title: "Lesson Ended",
            description: `${data.teacherName} has ended the lesson.`,
            duration: 5000,
          });
        }
      }
    };

    return () => {
      // Clean up WebSocket connection when component unmounts
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
    };
  }, [user, toast]);

  const sendMessage = (type: string, data: any) => {
    if (!webSocketRef.current || webSocketRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return;
    }
    
    const message = JSON.stringify({
      type,
      ...data
    });
    
    webSocketRef.current.send(message);
    console.log(`Sent WebSocket message: ${type}`, data);
  };

  return (
    <WebSocketContext.Provider value={{ 
      activeUsers, 
      isConnected, 
      sendMessage,
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