import { useState, useEffect, useRef } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  Home,
  BookOpen,
  Code,
  CheckSquare,
  ChevronDown,
  MessageSquare,
  Brain,
  Users,
  Settings,
  ChevronLeft,
  Play,
  Square,
  Clock,
  Crown,
  Sparkles,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import LessonChatbot from "@/components/LessonChatbot";
import { api } from "@/server/api";
import { Manager } from "socket.io-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ActiveUsersSidebar from "@/components/ActiveUsersSidebar";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import Sidebar from "@/components/layout/Sidebar";

// Define types for our data structure
interface Lesson {
  id: string;
  name: string;
  time?: string;
  isActive?: boolean;
  startTime?: Date;
  duration?: number;
}

interface Week {
  id: string;
  name: string;
  lessons: Lesson[];
}

interface Course {
  id: string;
  name: string;
  weeks: Week[];
}

interface NotificationDialogProps {
  type: 'start' | 'end';
  data: {
    lessonName: string;
    duration?: number;
  };
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

const NotificationDialog = ({ type, data, onOpenChange, open }: NotificationDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className={cn(
      "border-2",
      type === "start" ? "border-green-500 bg-green-50" : "border-red-500 bg-red-100"
    )}>
      <DialogHeader>
        <DialogTitle className={cn(
          "text-xl font-bold",
          type === "start" ? "text-green-700" : "text-red-700"
        )}>
          {type === "start" ? "Lesson Started" : "⚠️ Lesson Ended"}
        </DialogTitle>
      </DialogHeader>
      <div className="p-4">
        <p className={cn(
          "text-lg font-medium mb-3",
          type === "start" ? "text-green-700" : "text-red-700"
        )}>
          {type === "start" 
            ? "A new lesson has started:" 
            : "The lesson has ended because the timer has expired:"}
        </p>
        <p className="text-xl font-bold mt-2">{data?.lessonName}</p>
        {type === "start" && (
          <p className="text-sm text-gray-600 mt-2 flex items-center gap-2">
            Duration: {data?.duration} minutes
          </p>
        )}
      </div>
    </DialogContent>
  </Dialog>
);

export default function Layout() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [openCourses, setOpenCourses] = useState<string[]>([]);
  const [openWeeks, setOpenWeeks] = useState<string[]>([]);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [isCurriculumOpen, setIsCurriculumOpen] = useState(false);
  const [activeLesson, setActiveLesson] = useState<{id: string, name: string} | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeLessonSession, setActiveLessonSession] = useState<{
    lessonId: string;
    startTime: Date;
    duration: number;
  } | null>(null);
  const socketRef = useRef<any>(null); // Using any temporarily for socket type
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState<{
    lessonName: string;
    teacherName: string;
    duration: number;
  } | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<string>("");
  const [showDurationDialog, setShowDurationDialog] = useState(false);
  const [selectedLessonToStart, setSelectedLessonToStart] = useState<{id: string, name: string} | null>(null);
  const [lessonEndTimer, setLessonEndTimer] = useState<NodeJS.Timeout | null>(null);
  const [showEndNotification, setShowEndNotification] = useState(false);
  const [endNotificationData, setEndNotificationData] = useState<{
    lessonName: string;
  } | null>(null);
  const [showLessonAccessDenied, setShowLessonAccessDenied] = useState(false);

  // Fetch courses data when component mounts
  useEffect(() => {
    const fetchCourseData = async () => {
      setIsLoading(true);
      try {
        // This is a placeholder - you'll need to implement this API endpoint
        // to return the full course structure with weeks and lessons
        const coursesData = await api.getCourseStructure();
        console.log('Course structure data:', coursesData);
        setCourses(coursesData);
      } catch (error) {
        console.error("Failed to fetch course data:", error);
        // Fallback to empty courses array
        setCourses([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourseData();
  }, []);

  // Listen for lesson start notifications
  useEffect(() => {
    // This would be a WebSocket connection in a real implementation
    const handleLessonStarted = (data: any) => {
      setNotificationData({
        lessonName: data.lessonName,
        teacherName: data.teacherName,
        duration: data.duration
      });
      setShowNotification(true);
      
      // Set active lesson session
      setActiveLessonSession({
        lessonId: data.lessonId,
        startTime: new Date(),
        duration: data.duration
      });
    };

    // Mock notification for demo purposes
    const mockNotification = () => {
      // This is just for demonstration
      console.log("Setting up mock notification listener");
    };

    mockNotification();

    return () => {
      // Cleanup
    };
  }, []);

  // Check if a lesson is accessible
  const isLessonAccessible = (lessonId: string) => {
    // If user is lead student, they can access any lesson
    if (user?.role === 'lead_student') return true;
    
    // If there's an active lesson session for this lesson, other users can access it
    return activeLessonSession?.lessonId === lessonId;
  };

  // Handle lesson navigation
  const handleLessonNavigation = (lessonId: string, lessonName: string) => {
    if (isLessonAccessible(lessonId)) {
      setActiveLesson({ id: lessonId, name: lessonName });
      navigate(`/lesson/${lessonId}`);
    } else {
      setShowLessonAccessDenied(true);
      setTimeout(() => setShowLessonAccessDenied(false), 3000);
    }
  };

  // Start a lesson (for lead students)
  const startLesson = (lessonId: string, lessonName: string, duration: number) => {
    if (user?.role !== 'lead_student') return;
    
    // Set active lesson
    setActiveLesson({ id: lessonId, name: lessonName });
    
    // Set active lesson session
    setActiveLessonSession({
      lessonId,
      startTime: new Date(),
      duration
    });
    
    // In a real implementation, this would send a notification to all users
    console.log(`Starting lesson: ${lessonName} for ${duration} minutes`);
    
    // Navigate to lesson
    navigate(`/lesson/${lessonId}`);
  };

  // Initialize WebSocket connection
  useEffect(() => {
    // Create a dummy manager to prevent errors
    // This is a temporary solution until the Socket.IO server is properly implemented
    const dummyManager = {
      socket: () => ({
        on: (event: string, callback: Function) => {
          // Only log connect_error to avoid flooding the console
          if (event === 'connect_error') {
            console.log('Socket.IO connection disabled temporarily');
          }
        },
        emit: () => {},
        disconnect: () => {}
      })
    };
    
    // Use the dummy manager instead of trying to connect to a non-existent Socket.IO server
    const socket = dummyManager.socket();
    socketRef.current = socket;

    // No need to attempt connection or register handlers
    
    return () => {
      // No need to disconnect
    };
  }, [activeLessonSession, activeLesson, user]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (lessonEndTimer) {
        clearTimeout(lessonEndTimer);
      }
    };
  }, [lessonEndTimer]);

  const toggleCourse = (courseId: string) => {
    setOpenCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const toggleWeek = (weekId: string) => {
    setOpenWeeks(prev => 
      prev.includes(weekId) 
        ? prev.filter(id => id !== weekId)
        : [...prev, weekId]
    );
  };

  const toggleLessonComplete = (lessonId: string) => {
    setCompletedLessons(prev => 
      prev.includes(lessonId) 
        ? prev.filter(id => id !== lessonId)
        : [...prev, lessonId]
    );
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const handleLessonClick = (lesson: Lesson, course: Course, week: Week) => {
    // When a lesson is clicked, directly open it with duration selection
    setSelectedLessonToStart({ id: lesson.id, name: lesson.name });
    setShowDurationDialog(true);
  };

  // Check if user has admin role
  const isAdmin = user?.role === 'admin';

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Function to format duration
  const formatDuration = (startTime: Date) => {
    const duration = new Date().getTime() - startTime.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Modify the lesson rendering part in the curriculum section
  const renderLesson = (lesson: Lesson, course: Course, week: Week) => {
    const isActive = activeLessonSession?.lessonId === lesson.id;
    
    return (
      <div
        key={lesson.id}
        className={cn(
          "flex items-center justify-between px-3 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg cursor-pointer",
          isActive && "bg-green-50"
        )}
        onClick={() => handleLessonClick(lesson, course, week)}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">{lesson.name}</span>
          {isActive && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs">{lesson.time}</span>
        </div>
      </div>
    );
  };

  const renderUserInfo = () => {
    const getRoleDisplay = () => {
      switch (user?.role) {
        case 'lead_student':
          return {
            label: 'Lead Student',
            className: "bg-gradient-to-r from-amber-200 to-yellow-400 text-amber-900 border border-amber-300 shadow-sm",
            icon: <Crown className="w-3 h-3 mr-1 text-amber-700" />
          };
        case 'admin':
          return {
            label: 'Administrator',
            className: "bg-purple-100 text-purple-800",
            icon: <Settings className="w-3 h-3 mr-1 text-purple-700" />
          };
        case 'student':
          return {
            label: 'Student',
            className: "bg-blue-100 text-blue-800",
            icon: <BookOpen className="w-3 h-3 mr-1 text-blue-700" />
          };
        default:
          return {
            label: user?.role || 'User',
            className: "bg-gray-100 text-gray-800",
            icon: null
          };
      }
    };

    const roleInfo = getRoleDisplay();

    return (
      <div className="transition-opacity duration-300">
        <div className="font-medium text-sm leading-tight">{user?.username}</div>
        <div className="text-xs text-gray-500 truncate">{user?.email}</div>
        <div className={cn(
          "mt-1 text-xs inline-flex items-center px-2 py-1 rounded-full font-medium",
          roleInfo.className
        )}>
          {roleInfo.icon}
          {roleInfo.label}
        </div>
      </div>
    );
  };

  return (
    <WebSocketProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
        
        {/* Lesson Access Denied Notification */}
        {showLessonAccessDenied && (
          <div className="fixed bottom-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-md">
            <div className="flex">
              <div className="py-1">
                <svg className="h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-bold">Access Denied</p>
                <p className="text-sm">Waiting for the lead student to start this lesson.</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Lesson Started Notification */}
        {showNotification && notificationData && (
          <div className="fixed bottom-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md">
            <div className="flex">
              <div className="py-1">
                <svg className="h-6 w-6 text-green-500 mr-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-bold">Lesson Started</p>
                <p className="text-sm">{notificationData.lessonName} has been started by {notificationData.teacherName}.</p>
                <p className="text-sm">Duration: {notificationData.duration} minutes</p>
                <button 
                  className="mt-2 bg-green-500 hover:bg-green-600 text-white py-1 px-2 rounded text-xs"
                  onClick={() => setShowNotification(false)}
                >
                  Join Now
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Duration Selection Dialog */}
      <Dialog open={showDurationDialog} onOpenChange={setShowDurationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-black">Select Lesson Duration</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-4">
              How long would you like to study {selectedLessonToStart?.name}?
            </p>
            <Select value={selectedDuration} onValueChange={setSelectedDuration}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="90">90 minutes</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDurationDialog(false)}
              className="border-gray-300 text-black"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedLessonToStart && selectedDuration) {
                  startLesson(
                    selectedLessonToStart.id,
                    selectedLessonToStart.name,
                    parseInt(selectedDuration)
                  );
                  setShowDurationDialog(false);
                  setSelectedDuration("");
                }
              }}
              disabled={!selectedDuration || !selectedLessonToStart}
              className="bg-black text-white hover:bg-gray-800"
            >
              Start Lesson
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WebSocketProvider>
  );
}

function NavItem({ to, icon: Icon, children, collapsed }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`flex items-center ${
        collapsed ? "justify-center" : ""
      } px-3 py-2 text-sm rounded-lg transition-colors ${
        isActive
          ? "bg-gray-100 text-black font-medium"
          : "text-gray-600 hover:bg-gray-100 hover:text-black"
      }`}
    >
      <Icon className={`h-5 w-5 ${collapsed ? "" : "mr-2"}`} />
      {!collapsed && <span>{children}</span>}
    </Link>
  );
}
