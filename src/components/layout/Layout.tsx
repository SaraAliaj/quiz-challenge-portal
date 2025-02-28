import { useState } from "react";
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
  Clock,
  Brain,
  Users,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import LessonChatbot from "@/components/LessonChatbot";

export default function Layout() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [openCourses, setOpenCourses] = useState<string[]>([]);
  const [openWeeks, setOpenWeeks] = useState<string[]>([]);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [isCurriculumOpen, setIsCurriculumOpen] = useState(false);
  const [activeLesson, setActiveLesson] = useState<string | null>(null);

  const courses = [
    {
      id: "react",
      name: "React Development",
      weeks: [
        {
          id: "week1",
          name: "Week 1",
          lessons: [
            { id: "lesson1", name: "Introduction to React", time: "02:00 PM" },
            { id: "lesson2", name: "Components & Props", time: "03:30 PM" },
          ]
        },
        {
          id: "week2",
          name: "Week 2",
          lessons: [
            { id: "lesson3", name: "State & Lifecycle", time: "02:00 PM" },
            { id: "lesson4", name: "Hooks", time: "03:30 PM" },
          ]
        }
      ]
    },
    {
      id: "sql",
      name: "SQL Mastery",
      weeks: [
        {
          id: "week1",
          name: "Week 1",
          lessons: [
            { id: "lesson1", name: "Basic Queries", time: "02:00 PM" },
            { id: "lesson2", name: "Joins & Relations", time: "03:30 PM" },
          ]
        }
      ]
    }
  ];

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

  const handleLessonClick = (lessonName: string) => {
    // Reset scroll position to top
    window.scrollTo(0, 0);
    
    setActiveLesson(lessonName);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-72 min-h-screen bg-gray-100 border-r">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-center gap-2">
                <Brain className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-primary">AI School</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-2 italic">
                Learn. Challenge. Grow.
              </p>
            </div>
            
            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4">
              <div className="space-y-6">
                {/* AI Chat */}
                <NavItem to="/chat" icon={MessageSquare}>
                  AI Chat
                </NavItem>

                {/* Curriculum Dropdown */}
                <Collapsible open={isCurriculumOpen} onOpenChange={setIsCurriculumOpen}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-gray-900 transition-all hover:bg-gray-200 font-bold text-base rounded-lg">
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
                    {courses.map(course => (
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
                                    {week.lessons.map(lesson => (
                                      <div
                                        key={lesson.id}
                                        className={cn(
                                          "flex items-center justify-between px-3 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg cursor-pointer",
                                          activeLesson === lesson.name && "bg-gray-200 font-semibold"
                                        )}
                                        onClick={() => handleLessonClick(lesson.name)}
                                      >
                                        <span className={cn(
                                          "font-medium",
                                          completedLessons.includes(lesson.id) && "line-through"
                                        )}>
                                          {lesson.name}
                                        </span>
                                        <div className="flex items-center gap-2">
                                          <Clock className="h-3 w-3" />
                                          <span className="text-xs">{lesson.time}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </CollapsibleContent>
                </Collapsible>

                {/* Other navigation items */}
                <NavItem to="/challenges" icon={Code}>
                  Challenges
                </NavItem>
                <NavItem to="/quizzes" icon={CheckSquare}>
                  Quizzes
                </NavItem>
                <NavItem to="/group-chat" icon={Users}>
                  Group Chat
                </NavItem>
                <NavItem to="/admin" icon={Settings}>
                  Admin
                </NavItem>
              </div>
            </nav>

            {/* Sign Out Button */}
            <div className="p-4 border-t">
              <Button 
                variant="ghost" 
                className="w-full flex items-center justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-screen bg-gray-50">
          <div className="h-full flex flex-col">
            {activeLesson ? (
              <div className="flex-1 h-screen overflow-hidden">
                <LessonChatbot lessonTitle={activeLesson} />
              </div>
            ) : (
              <div className="container mx-auto p-6">
                <Outlet />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NavItem({ to, icon: Icon, children }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={cn(
        "flex items-center space-x-3 rounded-lg px-4 py-3 text-gray-900 transition-all hover:bg-gray-200 font-bold text-base",
        isActive && "bg-gray-200"
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{children}</span>
    </Link>
  );
}
