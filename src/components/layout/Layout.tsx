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
  Square
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import LessonChatbot from "@/components/LessonChatbot";
import { api } from "@/server/api";
import { io, Socket } from "socket.io-client";
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

// Update the notification dialog
const NotificationDialog = ({ type, data, onOpenChange, open }) => (
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
  const socketRef = useRef<Socket | null>(null);
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
    socketRef.current = io('http://localhost:3001');

    socketRef.current.on('lessonStarted', (data) => {
      if (data.lessonId !== activeLessonSession?.lessonId) {
        setNotificationData({
          lessonName: data.lessonName,
          teacherName: data.teacherName,
          duration: data.duration
        });
        setShowNotification(true);
        toast({
          title: "Lesson Started",
          description: `Lesson "${data.lessonName}" has started and will last ${data.duration} minutes`,
          className: "bg-green-50 border-green-500 border text-green-700",
        });
      }
    });

    socketRef.current.on('lessonEnded', (data) => {
      setEndNotificationData({
        lessonName: data.lessonName,
      });
      setShowEndNotification(true);
      if (data.lessonId === activeLesson?.id) {
        setActiveLesson(null);
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [activeLessonSession, activeLesson]);

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

  const handleLessonClick = (lessonId: string, lessonName: string) => {
    // If lesson is active, show content
    if (activeLessonSession?.lessonId === lessonId) {
      setActiveLesson({id: lessonId, name: lessonName});
    } else {
      // If lesson isn't active, show duration dialog
      setSelectedLessonToStart({id: lessonId, name: lessonName});
      setShowDurationDialog(true);
    }
  };

  // Check if user has admin role
  const isAdmin = user?.role === 'admin';

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const startLesson = () => {
    if (!selectedLessonToStart || !selectedDuration) return;

    const durationInMinutes = parseInt(selectedDuration);
    
    if (socketRef.current) {
      socketRef.current.emit('startLesson', {
        lessonId: selectedLessonToStart.id,
        lessonName: selectedLessonToStart.name,
        teacherName: 'Teacher',
        duration: durationInMinutes
      });

      setActiveLessonSession({
        lessonId: selectedLessonToStart.id,
        startTime: new Date(),
      });

      // Set timer to end lesson
      const timer = setTimeout(() => {
        // Show timer expiration notification
        setEndNotificationData({
          lessonName: selectedLessonToStart.name,
        });
        setShowEndNotification(true);
        endLesson(selectedLessonToStart.id, selectedLessonToStart.name);
      }, durationInMinutes * 60 * 1000);

      setLessonEndTimer(timer);
      setActiveLesson({id: selectedLessonToStart.id, name: selectedLessonToStart.name});
    }

    setShowDurationDialog(false);
    setSelectedDuration("");
    setSelectedLessonToStart(null);
  };

  const endLesson = (lessonId: string, lessonName: string) => {
    if (socketRef.current) {
      socketRef.current.emit('endLesson', {
        lessonId,
        lessonName,
        teacherName: 'Teacher'
      });
      
      setActiveLessonSession(null);
      setActiveLesson(null);
      
      if (lessonEndTimer) {
        clearTimeout(lessonEndTimer);
        setLessonEndTimer(null);
      }
    }
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
        onClick={() => handleLessonClick(lesson.id, lesson.name)}
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

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <div className={`${isSidebarCollapsed ? 'w-20' : 'w-72'} h-screen bg-gray-100 border-r transition-all duration-300 relative flex flex-col `}>
          {/* Toggle Button - Positioned at the edge between sidebar and content */}
          <button 
            onClick={toggleSidebar}
            className={`absolute -right-4 top-10 bg-white border border-gray-200 shadow-md rounded-full p-2 hover:bg-gray-100 transition-all duration-300 z-50 ${isSidebarCollapsed ? 'rotate-180' :  ''}`}
            >
            <ChevronLeft className="h-5 w-5 text-primary" />
          </button>

          {/* Top Section - Fixed */}
          <div className="flex-shrink-0">
            {/* Header */}
            <div className={`p-5 border-b transition-all duration-300 ${isSidebarCollapsed ? 'p-3' : ''}`}>
              <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                <Brain className="h-8 w-8 text-primary" />
                <h1 className={`text-2xl font-bold text-primary transition-opacity duration-300 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
                  AI School
                </h1>
              </div>
              <p className={`text-xs text-muted-foreground mt-1 italic transition-opacity duration-300 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
                Learn. Challenge. Grow.
              </p>
            </div>
            
            {/* User Profile */}
            <div className={`p-3 border-b transition-all duration-300 ${isSidebarCollapsed ? 'p-2 flex justify-center' : ''}`}>
              {user ? (
                <div className={`flex items-center ${isSidebarCollapsed ? '' : 'gap-2'}`}>
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0">
                    {user.username ? user.username.charAt(0).toUpperCase() : '?'}
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="overflow-hidden">
                      <div className="font-medium text-sm">{user.username} {user.surname}</div>
                      <div className="text-xs text-gray-500 truncate">{user.email}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`flex items-center ${isSidebarCollapsed ? '' : 'gap-3'}`}>
                  <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center font-bold flex-shrink-0">
                    ?
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="text-sm text-gray-500">Not logged in</div>
                  )}
                </div>
              )}
            </div>
          </div>
            
          {/* Middle Section - Scrollable with fixed height */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <nav className="flex-1 overflow-y-auto">
              <div className={`space-y-4 ${isSidebarCollapsed ? 'p-2' : 'p-3'}`}>
                {/* AI Chat */}
                <NavItem to="/chat" icon={MessageSquare} collapsed={isSidebarCollapsed}>
                  AI Chat
                </NavItem>

                {/* Curriculum Dropdown - Only show when expanded */}
                {!isSidebarCollapsed && (
                  <Collapsible open={isCurriculumOpen} onOpenChange={setIsCurriculumOpen} className="flex-shrink-0">
                    <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-2 text-gray-900 transition-all hover:bg-gray-200 font-bold text-base rounded-lg">
                      <div className="flex items-center space-x-3">
                        <BookOpen className="h-5 w-5" />
                        <span>Curriculum</span>
                      </div>
                      <ChevronDown className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isCurriculumOpen && "transform rotate-180"
                      )} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1 space-y-0.5 pl-4">
                      {isLoading ? (
                        <div className="px-3 py-2 text-gray-500">Loading courses...</div>
                      ) : courses.length === 0 ? (
                        <div className="px-3 py-2 text-gray-500">No courses available</div>
                      ) : (
                        courses.map(course => (
                          <Collapsible
                            key={course.id}
                            open={openCourses.includes(course.id)}
                            onOpenChange={() => toggleCourse(course.id)}
                          >
                            <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium">
                              <span>{course.name}</span>
                              <ChevronDown className={cn(
                                "h-4 w-4 transition-transform duration-200",
                                openCourses.includes(course.id) && "transform rotate-180"
                              )} />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="ml-3 mt-0.5">
                              <div className="border-l-2 border-gray-200 pl-2 space-y-0.5">
                                {course.weeks.map(week => (
                                  <Collapsible
                                    key={week.id}
                                    open={openWeeks.includes(week.id)}
                                    onOpenChange={() => toggleWeek(week.id)}
                                  >
                                    <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium">
                                      <span>{week.name}</span>
                                      <ChevronDown className={cn(
                                        "h-4 w-4 transition-transform duration-200",
                                        openWeeks.includes(week.id) && "transform rotate-180"
                                      )} />
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="ml-3 mt-0.5">
                                      <div className="border-l-2 border-gray-200 pl-2 space-y-0.5">
                                        {week.lessons.map(lesson => renderLesson(lesson, course, week))}
                                      </div>
                                    </CollapsibleContent>
                                  </Collapsible>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        ))
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Other navigation items */}
                <div className="space-y-4">
                  <NavItem to="/challenges" icon={Code} collapsed={isSidebarCollapsed}>
                    Challenges
                  </NavItem>
                  <NavItem to="/quizzes" icon={CheckSquare} collapsed={isSidebarCollapsed}>
                    Quizzes
                  </NavItem>
                  <NavItem to="/group-chat" icon={Users} collapsed={isSidebarCollapsed}>
                    Group Chat
                  </NavItem>
                  
                  {/* Admin link */}
                  <NavItem to="/admin" icon={Settings} collapsed={isSidebarCollapsed}>
                    Admin
                  </NavItem>
                </div>
              </div>
            </nav>
            
            {/* Sign Out Button - Fixed at bottom */}
            <div className={`p-3 border-t mt-auto flex-shrink-0 ${isSidebarCollapsed ? 'p-2' : ''}`}>
              <Button 
                variant="ghost" 
                className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-start'} text-red-600 hover:text-red-700 hover:bg-red-50`}
                onClick={handleSignOut}
              >
                <LogOut className={`${isSidebarCollapsed ? '' : 'mr-2'} h-4 w-4`} />
                {!isSidebarCollapsed && <span>Sign Out</span>}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-screen bg-gray-50">
          <div className="h-full flex flex-col">
            {activeLesson ? (
              <div className="flex-1 h-screen overflow-hidden">
                <LessonChatbot lessonId={activeLesson.id} lessonTitle={activeLesson.name} />
              </div>
            ) : (
              <div className="container mx-auto p-6">
                <Outlet />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Duration Selection Dialog */}
      <Dialog open={showDurationDialog} onOpenChange={setShowDurationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Lesson Duration</DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-4">
            <p className="text-sm text-gray-500">
              Select how long this lesson will be available:
            </p>
            <Select value={selectedDuration} onValueChange={setSelectedDuration}>
              <SelectTrigger>
                <SelectValue placeholder="Select duration in minutes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 minute</SelectItem>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="20">20 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowDurationDialog(false);
                setSelectedDuration("");
                setSelectedLessonToStart(null);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={startLesson}
              disabled={!selectedDuration}
              className="bg-green-600 hover:bg-green-700"
            >
              Start Lesson
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start Notification Dialog */}
      <NotificationDialog
        type="start"
        data={notificationData}
        open={showNotification}
        onOpenChange={setShowNotification}
      />

      {/* End Notification Dialog */}
      <NotificationDialog
        type="end"
        data={endNotificationData}
        open={showEndNotification}
        onOpenChange={setShowEndNotification}
      />
    </div>
  );
}

function NavItem({ to, icon: Icon, children, collapsed }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={cn(
        "flex items-center rounded-lg transition-all hover:bg-gray-200 font-bold text-base",
        collapsed ? "justify-center p-2" : "space-x-3 px-4 py-3",
        isActive && "bg-gray-200"
      )}
    >
      <Icon className="h-5 w-5" />
      {!collapsed && <span>{children}</span>}
    </Link>
  );
}
