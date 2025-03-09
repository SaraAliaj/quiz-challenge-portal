import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Book,
  GraduationCap,
  Layout,
  MessageCircle,
  Trophy,
  Award,
  ChevronDown,
  Check,
  ChevronLeft,
  Loader2,
  Users,
  Calendar,
} from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/server/api";
import ActiveUsersSidebar from "@/components/ActiveUsersSidebar";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Lesson {
  id: string;
  name: string;
  time?: string;
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

export default function Sidebar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<{courseId: number, weekId: number} | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDurationDialog, setShowDurationDialog] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<string>("");
  const [selectedLessonToStart, setSelectedLessonToStart] = useState<{id: string, name: string} | null>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const courseStructure = await api.getCourseStructure();
        if (courseStructure && courseStructure.length > 0) {
          setCourses(courseStructure);
        } else {
          setError("No courses found");
        }
      } catch (err) {
        console.error("Failed to fetch courses:", err);
        setError("Failed to load courses");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const toggleCourse = (courseId: number) => {
    setExpandedCourse(expandedCourse === courseId ? null : courseId);
    setExpandedWeek(null);
  };

  const toggleWeek = (courseId: number, weekId: number) => {
    setExpandedWeek(
      expandedWeek?.courseId === courseId && expandedWeek?.weekId === weekId
        ? null
        : { courseId, weekId }
    );
  };

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };
  
  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLessonToStart({ id: lesson.id, name: lesson.name });
    setShowDurationDialog(true);
  };
  
  const startLesson = () => {
    if (!selectedLessonToStart || !selectedDuration) return;
    
    // Navigate to the lesson page
    navigate(`/lesson/${selectedLessonToStart.id}`);
    
    // Close the dialog and reset state
    setShowDurationDialog(false);
    setSelectedDuration("");
    setSelectedLessonToStart(null);
    
    // Show success toast
    toast({
      title: "Lesson Started",
      description: `You've started ${selectedLessonToStart.name}`,
    });
  };

  return (
    <div className={`h-screen ${collapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out relative`}>
      <div className="p-4 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <GraduationCap className={`h-6 w-6 text-black ${collapsed ? 'mx-auto' : ''}`} />
          <span className={`font-bold text-xl text-black transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
            AI School
          </span>
        </Link>
        <button 
          onClick={toggleSidebar}
          className={`absolute -right-3 top-6 bg-white border rounded-full p-1.5 hover:bg-gray-100 transition-all duration-300 ${collapsed ? 'rotate-180' : ''}`}
        >
          <ChevronLeft className="h-4 w-4 text-black" />
        </button>
      </div>
      
      {/* User Info Section - Placeholder */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-600 font-medium">U</span>
          </div>
          {!collapsed && (
            <div>
              <p className="font-medium text-black">User Name</p>
              <p className="text-xs text-gray-500">Student</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Active Users Section */}
      <div className="border-b border-gray-200">
        <div className={`p-4 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center">
            <Users className={`h-5 w-5 text-black ${collapsed ? '' : 'mr-2'}`} />
            {!collapsed && <span className="font-semibold text-sm text-black">Active Users</span>}
          </div>
        </div>
        <div className={`${collapsed ? 'px-2' : 'px-4'} pb-4 max-h-40 overflow-y-auto`}>
          <ActiveUsersSidebar collapsed={collapsed} />
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <div className="space-y-2">
          {/* AI Chat */}
          <Link to="/chat" className={`flex items-center ${collapsed ? 'justify-center' : 'justify-start'} px-3 py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors`}>
            <MessageCircle className={`h-5 w-5 text-black ${collapsed ? '' : 'mr-2'}`} />
            {!collapsed && <span className="text-black">AI Chat</span>}
          </Link>
          
          {/* Curriculum Section */}
          <div>
            <button
              onClick={() => setExpandedCourse(expandedCourse === null ? 0 : null)}
              className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors`}
            >
              <div className="flex items-center">
                <Book className={`h-5 w-5 text-black ${collapsed ? '' : 'mr-2'}`} />
                {!collapsed && <span className="text-black">Curriculum</span>}
              </div>
              {!collapsed && (
                <ChevronDown
                  className={`h-4 w-4 text-black transition-transform ${
                    expandedCourse !== null ? "transform rotate-180" : ""
                  }`}
                />
              )}
            </button>
            
            {expandedCourse !== null && (
              <div className={`mt-1 ${collapsed ? 'px-1' : 'pl-6'} space-y-1`}>
                {isLoading ? (
                  <div className="flex justify-center py-2">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : error ? (
                  <div className="text-sm text-gray-500 px-2 py-2">
                    {!collapsed && error}
                  </div>
                ) : (
                  courses.map((course) => (
                    <div key={course.id} className="space-y-1">
                      <button
                        className={`w-full flex items-center ${collapsed ? 'justify-center px-1' : 'justify-between px-3'} py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors`}
                        onClick={() => toggleCourse(parseInt(course.id))}
                      >
                        <span className={`text-black ${collapsed ? 'sr-only' : ''}`}>
                          {course.name}
                        </span>
                        {!collapsed && (
                          <ChevronDown
                            className={`h-4 w-4 text-black transition-transform ${
                              expandedCourse === parseInt(course.id) ? "transform rotate-180" : ""
                            }`}
                          />
                        )}
                      </button>
                      
                      {expandedCourse === parseInt(course.id) && (
                        <div className={`space-y-1 ${collapsed ? 'px-0' : 'pl-3'}`}>
                          {course.weeks.map((week) => (
                            <div key={week.id} className="space-y-1">
                              <button
                                className={`w-full flex items-center ${collapsed ? 'justify-center px-1' : 'justify-between px-3'} py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors`}
                                onClick={() => toggleWeek(parseInt(course.id), parseInt(week.id))}
                              >
                                <span className={`text-black ${collapsed ? 'sr-only' : ''}`}>
                                  {week.name}
                                </span>
                                {!collapsed && (
                                  <ChevronDown
                                    className={`h-4 w-4 text-black transition-transform ${
                                      expandedWeek?.courseId === parseInt(course.id) &&
                                      expandedWeek?.weekId === parseInt(week.id)
                                        ? "transform rotate-180"
                                        : ""
                                    }`}
                                  />
                                )}
                              </button>
                              
                              {expandedWeek?.courseId === parseInt(course.id) &&
                                expandedWeek?.weekId === parseInt(week.id) && (
                                  <div className={`space-y-1 ${collapsed ? 'px-0' : 'pl-3'}`}>
                                    {week.lessons.length > 0 ? (
                                      week.lessons.map((lesson) => (
                                        <button
                                          key={lesson.id}
                                          onClick={() => handleLessonClick(lesson)}
                                          className={`w-full flex items-center ${collapsed ? 'justify-center px-1' : 'px-3'} py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors`}
                                        >
                                          <div className="flex items-center">
                                            {!collapsed && lesson.time && (
                                              <span className="text-xs text-gray-500 mr-2 flex items-center">
                                                <Calendar className="h-3 w-3 mr-1" />
                                                {lesson.time}
                                              </span>
                                            )}
                                            <span className={`text-black ${collapsed ? 'sr-only' : ''}`}>
                                              {lesson.name}
                                            </span>
                                          </div>
                                        </button>
                                      ))
                                    ) : (
                                      <div className="text-sm text-gray-500 px-6 py-2">
                                        {!collapsed && "No lessons available"}
                                      </div>
                                    )}
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
          <Link to="/group-chat" className={`flex items-center ${collapsed ? 'justify-center' : 'justify-start'} px-3 py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors`}>
            <Users className={`h-5 w-5 text-black ${collapsed ? '' : 'mr-2'}`} />
            {!collapsed && <span className="text-black">Group Chat</span>}
          </Link>
          
          {/* Challenges */}
          <Link to="/challenges" className={`flex items-center ${collapsed ? 'justify-center' : 'justify-start'} px-3 py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors`}>
            <Award className={`h-5 w-5 text-black ${collapsed ? '' : 'mr-2'}`} />
            {!collapsed && <span className="text-black">Challenges</span>}
          </Link>
          
          {/* Quizzes */}
          <Link to="/quizzes" className={`flex items-center ${collapsed ? 'justify-center' : 'justify-start'} px-3 py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors`}>
            <Trophy className={`h-5 w-5 text-black ${collapsed ? '' : 'mr-2'}`} />
            {!collapsed && <span className="text-black">Weekly Quizzes</span>}
          </Link>
        </div>
      </nav>
      
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
  );
}
