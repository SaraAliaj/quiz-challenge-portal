import { Link } from "react-router-dom";
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
} from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/server/api";

interface Lesson {
  id: string;
  name: string;
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
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<{courseId: number, weekId: number} | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className={`h-screen ${collapsed ? 'w-16' : 'w-64'} bg-white border-r flex flex-col transition-all duration-300 ease-in-out relative`}>
      <div className="p-4 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <GraduationCap className={`h-6 w-6 ${collapsed ? 'mx-auto' : ''}`} />
          <span className={`font-bold text-xl transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
            AI School
          </span>
        </Link>
        <button 
          onClick={toggleSidebar}
          className={`absolute -right-3 top-6 bg-white border rounded-full p-1.5 hover:bg-gray-100 transition-all duration-300 ${collapsed ? 'rotate-180' : ''}`}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
      
      <nav className="flex-1 overflow-y-auto px-2">
        <div className="space-y-2">
          <div className={`font-semibold text-sm text-gray-500 uppercase tracking-wider px-2 ${collapsed ? 'text-center' : ''}`}>
            {!collapsed && "Curriculum"}
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="text-sm text-red-500 px-2 py-2">
              {!collapsed && error}
            </div>
          ) : (
            courses.map((course) => (
              <div key={course.id} className="space-y-1">
                <Button
                  variant="ghost"
                  className={`w-full ${collapsed ? 'justify-center' : 'justify-between'}`}
                  onClick={() => toggleCourse(parseInt(course.id))}
                >
                  <div className="flex items-center">
                    <Book className={`h-4 w-4 ${collapsed ? '' : 'mr-2'}`} />
                    <span className={`transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                      {course.name}
                    </span>
                  </div>
                  {!collapsed && (
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        expandedCourse === parseInt(course.id) ? "transform rotate-180" : ""
                      }`}
                    />
                  )}
                </Button>
                {expandedCourse === parseInt(course.id) && (
                  <div className="ml-4 space-y-1">
                    {course.weeks.map((week) => (
                      <div key={week.id}>
                        <Button
                          variant="ghost"
                          className="w-full justify-between pl-6"
                          onClick={() => toggleWeek(parseInt(course.id), parseInt(week.id))}
                        >
                          <span>{week.name}</span>
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              expandedWeek?.courseId === parseInt(course.id) &&
                              expandedWeek?.weekId === parseInt(week.id)
                                ? "transform rotate-180"
                                : ""
                            }`}
                          />
                        </Button>
                        {expandedWeek?.courseId === parseInt(course.id) &&
                          expandedWeek?.weekId === parseInt(week.id) && (
                            <div className="ml-4 space-y-1">
                              {week.lessons.length > 0 ? (
                                week.lessons.map((lesson) => (
                                  <Link
                                    key={lesson.id}
                                    to={`/lessons/${course.id}/${week.id}/${lesson.id}`}
                                    className="flex items-center justify-between px-6 py-2 text-sm rounded-lg hover:bg-gray-100"
                                  >
                                    <div className="flex items-center space-x-2">
                                      <span>{lesson.name}</span>
                                    </div>
                                  </Link>
                                ))
                              ) : (
                                <div className="text-sm text-gray-500 px-6 py-2">
                                  No lessons available
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

        <div className="pt-4 space-y-2">
          <Link to="/challenges">
            <Button variant="ghost" className={`w-full ${collapsed ? 'justify-center' : 'justify-start'}`}>
              <Award className={`h-4 w-4 ${collapsed ? '' : 'mr-2'}`} />
              <span className={`transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                Challenges
              </span>
            </Button>
          </Link>
          <Link to="/quizzes">
            <Button variant="ghost" className={`w-full ${collapsed ? 'justify-center' : 'justify-start'}`}>
              <Trophy className={`h-4 w-4 ${collapsed ? '' : 'mr-2'}`} />
              <span className={`transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                Weekly Quizzes
              </span>
            </Button>
          </Link>
          <Link to="/chat">
            <Button variant="ghost" className={`w-full ${collapsed ? 'justify-center' : 'justify-start'}`}>
              <MessageCircle className={`h-4 w-4 ${collapsed ? '' : 'mr-2'}`} />
              <span className={`transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                AI Chat
              </span>
            </Button>
          </Link>
          <Link to="/group-chat">
            <Button variant="ghost" className={`w-full ${collapsed ? 'justify-center' : 'justify-start'}`}>
              <MessageCircle className={`h-4 w-4 ${collapsed ? '' : 'mr-2'}`} />
              <span className={`transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                Group Chat
              </span>
            </Button>
          </Link>
        </div>
      </nav>
    </div>
  );
}
