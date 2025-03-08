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

  const handleLessonClick = (lesson: Lesson) => {
    if (activeLessonSession) {
      navigate(`/lesson/${lesson.id}`);
    } else {
      setSelectedLessonToStart({ id: lesson.id, name: lesson.name });
      setShowDurationDialog(true);
    }
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
    setSelectedLessonToStart(null);

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
        onClick={() => handleLessonClick(lesson)}
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
      <div className="flex h-screen overflow-hidden bg-gradient-to-b from-secondary/30 to-white">
        {/* Sidebar */}
        <div
          className={cn(
            "h-screen transition-all duration-300 ease-in-out border-r border-primary/10 bg-white shadow-sm",
            isSidebarCollapsed ? "w-16" : "w-64"
          )}
        >
          {/* Logo and toggle button */}
          <div className="flex items-center justify-between p-4 border-b border-primary/10">
            <Link to="/" className="flex items-center space-x-2">
              <div className="relative">
                <Brain className="h-6 w-6 text-primary" />
                <Sparkles className="h-3 w-3 absolute -top-1 -right-1 text-yellow-300" />
              </div>
              {!isSidebarCollapsed && (
                <span className="font-bold text-gradient-middle">AI School</span>
              )}
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="text-primary hover:bg-secondary/50"
            >
              <ChevronLeft
                className={cn(
                  "h-4 w-4 transition-transform",
                  isSidebarCollapsed && "rotate-180"
                )}
              />
            </Button>
          </div>

          {/* User info */}
          <div className="p-4 border-b border-primary/10">
            {renderUserInfo()}
          </div>

          {/* Navigation */}
          <div className="p-2 space-y-1">
            <NavItem
              to="/chat"
              icon={MessageSquare}
              collapsed={isSidebarCollapsed}
            >
              AI Chat
            </NavItem>
            
            <NavItem
              to="/group-chat"
              icon={Users}
              collapsed={isSidebarCollapsed}
            >
              Group Chat
            </NavItem>

            {/* Curriculum section */}
            <div className="pt-4">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start font-medium text-primary/80 hover:bg-secondary/50",
                  isCurriculumOpen && "bg-secondary/50"
                )}
                onClick={() => setIsCurriculumOpen(!isCurriculumOpen)}
              >
                <div className="flex items-center">
                  <BookOpen
                    className={cn(
                      "h-4 w-4",
                      !isSidebarCollapsed && "mr-2"
                    )}
                  />
                  {!isSidebarCollapsed && (
                    <>
                      <span>Curriculum</span>
                      <ChevronDown
                        className={cn(
                          "ml-auto h-4 w-4 transition-transform",
                          isCurriculumOpen && "rotate-180"
                        )}
                      />
                    </>
                  )}
                </div>
              </Button>

              {/* Curriculum content */}
              {isCurriculumOpen && !isSidebarCollapsed && (
                <div className="mt-1 ml-2 space-y-1">
                  {/* Courses */}
                  {courses.map((course) => (
                    <Collapsible
                      key={course.id}
                      open={openCourses.includes(course.id)}
                      onOpenChange={() => toggleCourse(course.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-between font-normal text-primary/70 hover:bg-secondary/50"
                        >
                          <span>{course.name}</span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform",
                              openCourses.includes(course.id) && "rotate-180"
                            )}
                          />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="ml-2 space-y-1">
                          {/* Weeks */}
                          {course.weeks.map((week) => (
                            <Collapsible
                              key={week.id}
                              open={openWeeks.includes(week.id)}
                              onOpenChange={() => toggleWeek(week.id)}
                            >
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-between font-normal text-primary/70 hover:bg-secondary/50"
                                >
                                  <span>{week.name}</span>
                                  <ChevronDown
                                    className={cn(
                                      "h-4 w-4 transition-transform",
                                      openWeeks.includes(week.id) && "rotate-180"
                                    )}
                                  />
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="ml-2 space-y-1">
                                  {/* Lessons */}
                                  {week.lessons.map((lesson) => (
                                    <Button
                                      key={lesson.id}
                                      variant="ghost"
                                      size="sm"
                                      className={cn(
                                        "w-full justify-start font-normal text-primary/70 hover:bg-secondary/50",
                                        completedLessons.includes(lesson.id) &&
                                          "line-through opacity-70",
                                        activeLesson?.id === lesson.id &&
                                          "bg-secondary/50 font-medium"
                                      )}
                                      onClick={() =>
                                        handleLessonClick({
                                          id: lesson.id,
                                          name: lesson.name,
                                        })
                                      }
                                    >
                                      <div className="flex items-center w-full">
                                        <span className="truncate">
                                          {lesson.name}
                                        </span>
                                        {completedLessons.includes(
                                          lesson.id
                                        ) && (
                                          <Check className="ml-auto h-4 w-4 text-green-500" />
                                        )}
                                        {lesson.isActive && (
                                          <div className="ml-auto flex items-center">
                                            <div className="h-2 w-2 rounded-full bg-green-500 mr-1"></div>
                                            <span className="text-xs text-green-600">
                                              Live
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </Button>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              )}
            </div>

            <NavItem
              to="/lessons"
              icon={BookOpen}
              collapsed={isSidebarCollapsed}
            >
              Lessons
            </NavItem>
            
            <NavItem
              to="/challenges"
              icon={Code}
              collapsed={isSidebarCollapsed}
            >
              Challenges
            </NavItem>
            
            <NavItem
              to="/quizzes"
              icon={CheckSquare}
              collapsed={isSidebarCollapsed}
            >
              Quizzes
            </NavItem>
          </div>

          {/* Sign out button */}
          <div className="absolute bottom-4 left-0 right-0 px-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-primary/70 hover:bg-secondary/50"
              onClick={handleSignOut}
            >
              <LogOut className={cn("h-4 w-4", !isSidebarCollapsed && "mr-2")} />
              {!isSidebarCollapsed && <span>Sign Out</span>}
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>

        {/* Active users sidebar */}
        <ActiveUsersSidebar />
      </div>

      {/* Notification dialogs */}
      <NotificationDialog
        type="start"
        data={{
          lessonName: notificationData?.lessonName || "",
          duration: notificationData?.duration,
        }}
        open={showNotification}
        onOpenChange={setShowNotification}
      />

      <NotificationDialog
        type="end"
        data={{
          lessonName: endNotificationData?.lessonName || "",
        }}
        open={showEndNotification}
        onOpenChange={setShowEndNotification}
      />

      {/* Duration selection dialog */}
      <Dialog open={showDurationDialog} onOpenChange={setShowDurationDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Set Lesson Duration</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">
                How long would you like the lesson to run?
              </p>
              <Select
                value={selectedDuration}
                onValueChange={setSelectedDuration}
              >
                <SelectTrigger>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDurationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={startLesson} disabled={!selectedDuration}>
              Start Lesson
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WebSocketProvider>
  );
}

// Navigation item component
function NavItem({ to, icon: Icon, children, collapsed }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link to={to}>
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start font-medium text-primary/80 hover:bg-secondary/50",
          isActive && "bg-secondary/50"
        )}
      >
        <Icon className={cn("h-4 w-4", !collapsed && "mr-2")} />
        {!collapsed && <span>{children}</span>}
      </Button>
    </Link>
  );
}
