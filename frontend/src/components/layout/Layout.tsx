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

// Define types for our data structure
interface Lesson {
  id: string;
  name: string;
  time: string;
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

  const startLesson = () => {
    if (!selectedLessonToStart || !selectedDuration || !user) return;

    if (user.role !== 'lead_student') {
      toast({
        title: "Permission Denied",
        description: "Only lead students can start lessons.",
        variant: "destructive",
      });
      return;
    }

    const duration = parseInt(selectedDuration);
    socketRef.current?.emit('startLesson', {
      lessonId: selectedLessonToStart.id,
      duration,
      teacherName: user.username,
    });

    // Set active lesson and session
    setActiveLesson(selectedLessonToStart);
    setActiveLessonSession({
      lessonId: selectedLessonToStart.id,
      startTime: new Date(),
    });

    setShowDurationDialog(false);
    setSelectedDuration("");

    // Set a timer to end the lesson
    const timer = setTimeout(() => {
      socketRef.current?.emit('endLesson', {
        lessonId: selectedLessonToStart.id,
      });
      setEndNotificationData({
        lessonName: selectedLessonToStart.name,
      });
      setShowEndNotification(true);
      setActiveLessonSession(null);
      setActiveLesson(null);
    }, duration * 60 * 1000);

    setLessonEndTimer(timer);
    
    // Navigate to the lesson page
    navigate(`/lesson/${selectedLessonToStart.id}`);
    
    // Clear the selected lesson to start after navigation
    setSelectedLessonToStart(null);
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
      <div className="flex h-screen bg-background">
        {/* Main Sidebar */}
        <div className={`h-screen ${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out relative`}>
          {/* Sidebar Header */}
          <div className="p-4 flex items-center justify-between border-b border-gray-200">
            <Link to="/" className="flex items-center space-x-2">
              <Brain className={`h-6 w-6 text-black ${isSidebarCollapsed ? 'mx-auto' : ''}`} />
              {!isSidebarCollapsed && <span className="font-bold text-xl text-black">AI School</span>}
            </Link>
            <button 
              onClick={toggleSidebar}
              className={`absolute -right-3 top-6 bg-white border rounded-full p-1.5 hover:bg-gray-100 transition-all duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`}
            >
              <ChevronLeft className="h-4 w-4 text-black" />
            </button>
          </div>

          {/* User Info Section */}
          <div className={`p-4 border-b border-gray-200 ${isSidebarCollapsed ? 'text-center' : ''}`}>
            {renderUserInfo()}
          </div>

          {/* Active Users Section - Moved inside main sidebar */}
          <div className="border-b border-gray-200">
            <div className={`p-4 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
              <div className="flex items-center">
                <Users className={`h-5 w-5 text-black ${isSidebarCollapsed ? '' : 'mr-2'}`} />
                {!isSidebarCollapsed && <span className="font-semibold text-sm text-black">Active Users</span>}
              </div>
            </div>
            <div className={`${isSidebarCollapsed ? 'px-2' : 'px-4'} pb-4 max-h-40 overflow-y-auto`}>
              {/* Render active users here */}
              <ActiveUsersSidebar collapsed={isSidebarCollapsed} />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-2 py-4">
            <div className="space-y-1">
              {/* AI Chat */}
              <NavItem to="/chat" icon={MessageSquare} collapsed={isSidebarCollapsed}>
                AI Chat
              </NavItem>

              {/* Curriculum Section - Restructured */}
              <div>
                <button
                  onClick={() => setIsCurriculumOpen(!isCurriculumOpen)}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors`}
                >
                  <div className="flex items-center">
                    <BookOpen className={`h-5 w-5 text-black ${isSidebarCollapsed ? '' : 'mr-2'}`} />
                    {!isSidebarCollapsed && <span className="text-black">Curriculum</span>}
                  </div>
                  {!isSidebarCollapsed && (
                    <ChevronDown
                      className={`h-4 w-4 text-black transition-transform ${
                        isCurriculumOpen ? "transform rotate-180" : ""
                      }`}
                    />
                  )}
                </button>

                {isCurriculumOpen && (
                  <div className={`mt-1 ${isSidebarCollapsed ? 'px-1' : 'pl-6'} space-y-1`}>
                    {isLoading ? (
                      <div className="flex justify-center py-2">
                        <span className="text-sm text-gray-500">Loading...</span>
                      </div>
                    ) : courses.length === 0 ? (
                      <div className="text-sm text-gray-500 py-2">
                        No courses available
                      </div>
                    ) : (
                      courses.map((course) => (
                        <div key={course.id} className="space-y-1">
                          <button
                            onClick={() => toggleCourse(course.id)}
                            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-1' : 'justify-between px-3'} py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors`}
                          >
                            <span className={`text-black ${isSidebarCollapsed ? 'sr-only' : ''}`}>
                              {course.name}
                            </span>
                            {!isSidebarCollapsed && (
                              <ChevronDown
                                className={`h-4 w-4 text-black transition-transform ${
                                  openCourses.includes(course.id) ? "transform rotate-180" : ""
                                }`}
                              />
                            )}
                          </button>

                          {openCourses.includes(course.id) && (
                            <div className={`space-y-1 ${isSidebarCollapsed ? 'px-0' : 'pl-3'}`}>
                              {course.weeks.map((week) => (
                                <div key={week.id} className="space-y-1">
                                  <button
                                    onClick={() => toggleWeek(week.id)}
                                    className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-1' : 'justify-between px-3'} py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors`}
                                  >
                                    <span className={`text-black ${isSidebarCollapsed ? 'sr-only' : ''}`}>
                                      {week.name}
                                    </span>
                                    {!isSidebarCollapsed && (
                                      <ChevronDown
                                        className={`h-4 w-4 text-black transition-transform ${
                                          openWeeks.includes(week.id) ? "transform rotate-180" : ""
                                        }`}
                                      />
                                    )}
                                  </button>

                                  {openWeeks.includes(week.id) && (
                                    <div className={`space-y-1 ${isSidebarCollapsed ? 'px-0' : 'pl-3'}`}>
                                      {week.lessons.map((lesson) => (
                                        <button
                                          key={lesson.id}
                                          onClick={() => handleLessonClick(lesson, course, week)}
                                          className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-1' : 'px-3'} py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors ${
                                            activeLesson?.id === lesson.id ? 'bg-gray-100' : ''
                                          }`}
                                        >
                                          <div className="flex items-center">
                                            {completedLessons.includes(lesson.id) ? (
                                              <Check className="h-4 w-4 text-black mr-2" />
                                            ) : (
                                              <div className="h-4 w-4 mr-2" />
                                            )}
                                            <span className={`text-black ${isSidebarCollapsed ? 'sr-only' : ''}`}>
                                              {lesson.name}
                                            </span>
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Group Chat */}
              <NavItem to="/group-chat" icon={Users} collapsed={isSidebarCollapsed}>
                Group Chat
              </NavItem>

              {/* Challenges */}
              <NavItem to="/challenges" icon={Code} collapsed={isSidebarCollapsed}>
                Challenges
              </NavItem>

              {/* Quizzes */}
              <NavItem to="/quizzes" icon={CheckSquare} collapsed={isSidebarCollapsed}>
                Quizzes
              </NavItem>

              {/* Admin Panel - Only visible to admins */}
              {isAdmin && (
                <NavItem to="/admin" icon={Settings} collapsed={isSidebarCollapsed}>
                  Admin Panel
                </NavItem>
              )}
            </div>
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleSignOut}
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : ''} px-3 py-2 text-sm rounded-lg text-red-500 hover:bg-red-50 transition-colors`}
            >
              <LogOut className={`h-5 w-5 ${isSidebarCollapsed ? '' : 'mr-2'}`} />
              {!isSidebarCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Lesson Timer Bar - Only shown when a lesson is active */}
          {activeLessonSession && activeLesson && (
            <div className="bg-gray-100 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-black" />
                  <span className="text-sm font-medium text-black">
                    {formatDuration(new Date(activeLessonSession.startTime))}
                  </span>
                </div>
                <div className="h-4 w-px bg-gray-300" />
                <span className="text-sm font-medium text-black">
                  {activeLesson.name}
                </span>
              </div>
              <button
                onClick={() => {
                  // End the lesson session
                  setActiveLessonSession(null);
                  setActiveLesson(null);
                  if (lessonEndTimer) {
                    clearTimeout(lessonEndTimer);
                    setLessonEndTimer(null);
                  }
                }}
                className="flex items-center space-x-1 text-sm text-red-500 hover:text-red-700"
              >
                <Square className="h-4 w-4" />
                <span>End Lesson</span>
              </button>
            </div>
          )}

          {/* Content Area */}
          <div className="flex-1 overflow-auto">
            <Outlet />
          </div>
        </div>

        {/* Notifications */}
        {showNotification && notificationData && (
          <NotificationDialog
            type="start"
            data={{
              lessonName: notificationData.lessonName,
              duration: notificationData.duration,
            }}
            open={showNotification}
            onOpenChange={setShowNotification}
          />
        )}

        {showEndNotification && endNotificationData && (
          <NotificationDialog
            type="end"
            data={{
              lessonName: endNotificationData.lessonName,
            }}
            open={showEndNotification}
            onOpenChange={setShowEndNotification}
          />
        )}

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
                onClick={startLesson}
                disabled={!selectedDuration || !selectedLessonToStart}
                className="bg-black text-white hover:bg-gray-800"
              >
                Start Lesson
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
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
