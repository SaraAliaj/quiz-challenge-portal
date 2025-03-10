import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Circle, Loader2, Download, BookOpen, FileText, Sparkles, ArrowLeft, XCircle, Clock } from "lucide-react";
import { api } from "@/server/api";
import { LessonLayout } from "@/components/LessonLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import LessonPopup from "@/components/LessonPopup";
import LessonChatbot from "@/components/LessonChatbot";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";

interface Module {
  title: string;
  completed: boolean;
  id: string;
}

interface Lesson {
  title: string;
  modules: Module[];
  content?: string;
}

export default function Lessons() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [pdfError, setPdfError] = useState<boolean>(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [lessonDuration, setLessonDuration] = useState<number | null>(null);
  
  const { user } = useAuth();
  const { activeLessonNotification } = useWebSocket();
  const { toast } = useToast();

  useEffect(() => {
    const fetchLessons = async () => {
      setIsLoading(true);
      setError(null);
      try {
        console.log('Fetching course structure...');
        setDebugInfo('Fetching course structure...');
        
        try {
          const courseStructure = await api.getCourseStructure();
          console.log('Course structure received:', courseStructure);
          setDebugInfo(prev => prev + '\nCourse structure received: ' + JSON.stringify(courseStructure, null, 2));
          
          if (!courseStructure || courseStructure.length === 0) {
            console.warn('Course structure is empty');
            setDebugInfo(prev => prev + '\nWarning: Course structure is empty');
            setError("No lessons found. Please contact your administrator.");
            setLessons([]);
          } else {
            const transformedLessons = courseStructure.flatMap(course => {
              console.log('Processing course:', course);
              setDebugInfo(prev => prev + '\nProcessing course: ' + JSON.stringify(course, null, 2));
              
              return course.weeks.map(week => {
                console.log('Processing week:', week);
                setDebugInfo(prev => prev + '\nProcessing week: ' + JSON.stringify(week, null, 2));
                
                return {
                  title: `${course.name} - ${week.name}`,
                  modules: week.lessons.map(lesson => ({
                    title: lesson.name,
                    completed: false,
                    id: lesson.id
                  }))
                };
              });
            });
            
            console.log('Transformed lessons:', transformedLessons);
            setDebugInfo(prev => prev + '\nTransformed lessons: ' + JSON.stringify(transformedLessons, null, 2));
            
            setLessons(transformedLessons);
          }
        } catch (err) {
          console.error("Failed to fetch course structure:", err);
          setDebugInfo(prev => prev + '\nError fetching course structure: ' + JSON.stringify(err, null, 2));
          setError("Failed to load lessons. Please try again later.");
          setLessons([]);
        }
      } catch (err) {
        console.error("Failed to fetch lessons:", err);
        setDebugInfo(prev => prev + '\nError: ' + JSON.stringify(err, null, 2));
        setError("Failed to load lessons. Please try again later.");
        setLessons([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLessons();
  }, []);

  // Listen for active lesson notifications
  useEffect(() => {
    if (activeLessonNotification) {
      setActiveLessonId(activeLessonNotification.lessonId);
      setLessonDuration(activeLessonNotification.duration);
      
      // Find the lesson in our list
      const lessonModule = lessons.flatMap(lesson => 
        lesson.modules.filter(module => module.id === activeLessonNotification.lessonId)
      )[0];
      
      if (lessonModule) {
        handleLessonClick(lessonModule);
      }
    }
  }, [activeLessonNotification, lessons]);

  const handleLessonClick = async (module: Module) => {
    // Find the parent lesson
    const parentLesson = lessons.find(lesson => 
      lesson.modules.some(m => m.id === module.id)
    );
    
    if (!parentLesson) return;
    
    const selectedLessonData = {
      title: parentLesson.title,
      modules: [module]
    };
    
    setSelectedLesson(selectedLessonData);
    setPdfError(false); // Reset PDF error state when selecting a new lesson
    
    // If this lesson is active or the user is a lead student, fetch the PDF
    if (activeLessonId === module.id || user?.role === 'lead_student') {
      try {
        console.log('Fetching lesson PDF...');
        const response = await api.getLessonContent(module.id);
        
        if (response && response.pdfUrl) {
          setPdfUrl(response.pdfUrl);
        } else {
          setPdfError(true);
          console.error('No PDF URL returned from API');
        }
      } catch (err) {
        setPdfError(true);
        console.error('Error fetching lesson PDF:', err);
      }
    }
  };

  const handleLessonStart = async (lessonId: string, duration: number) => {
    setActiveLessonId(lessonId);
    setLessonDuration(duration);
    
    try {
      console.log('Fetching lesson PDF after start...');
      const response = await api.getLessonContent(lessonId);
      
      if (response && response.pdfUrl) {
        setPdfUrl(response.pdfUrl);
        toast({
          title: "Lesson Started",
          description: `Lesson will be active for ${duration} minutes.`,
        });
      } else {
        setPdfError(true);
        console.error('No PDF URL returned from API');
      }
    } catch (err) {
      setPdfError(true);
      console.error('Error fetching lesson PDF:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading lessons...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-md">
        <h2 className="text-lg font-semibold">Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  // If a lesson is selected and active, show the lesson content with PDF and chatbot
  if (selectedLesson && activeLessonId && selectedLesson.modules[0].id === activeLessonId) {
    return (
      <div className="flex h-screen bg-slate-50">
        {/* Main content area */}
        <div className="flex-1 flex flex-col">
          <div className="p-6">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center space-x-4 mb-6"
            >
              <Button 
                onClick={() => setSelectedLesson(null)} 
                variant="ghost"
                className="text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Lessons
              </Button>
              <h1 className="text-2xl font-semibold text-slate-900">{selectedLesson.modules[0].title}</h1>
            </motion.div>

            <div className="grid grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
              {/* PDF Viewer */}
              <div className="col-span-2 bg-white rounded-lg shadow-sm border border-slate-200">
                {pdfUrl ? (
                  <iframe 
                    src={pdfUrl} 
                    className="w-full h-full rounded-lg" 
                    title={selectedLesson.modules[0].title}
                  />
                ) : pdfError ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center p-6">
                      <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 mb-2">Failed to Load PDF</h3>
                      <p className="text-slate-600">The lesson content could not be loaded. Please try again later.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
                    <span className="ml-2 text-slate-600">Loading PDF...</span>
                  </div>
                )}
              </div>

              {/* Chatbot */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <LessonChatbot 
                  lessonId={selectedLesson.modules[0].id}
                  lessonTitle={selectedLesson.modules[0].title}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If a lesson is selected but not active, show the lesson details with start button for lead students
  if (selectedLesson) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center space-x-4 mb-6"
          >
            <Button 
              onClick={() => setSelectedLesson(null)} 
              variant="ghost"
              className="text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Lessons
            </Button>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-white shadow-sm border-slate-200">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-xl text-slate-900">{selectedLesson.modules[0].title}</CardTitle>
                <p className="text-sm text-slate-600">Part of {selectedLesson.title}</p>
              </CardHeader>
              <CardContent className="p-6">
                {user?.role === 'lead_student' ? (
                  <div className="space-y-4">
                    <p className="text-slate-600">As a lead student, you can start this lesson for your class.</p>
                    <LessonPopup 
                      lessonId={selectedLesson.modules[0].id} 
                      lessonName={selectedLesson.modules[0].title}
                      onLessonStart={handleLessonStart}
                    />
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <div>
                        <h3 className="text-sm font-medium text-blue-900">Waiting for Lesson to Start</h3>
                        <p className="text-sm text-blue-700">The lead student hasn't started this lesson yet. Please wait for them to begin.</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // Default view - show all lessons
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-semibold text-slate-900">Course Lessons</h1>
          <p className="text-slate-600 mt-2">Select a lesson to begin learning</p>
        </motion.div>
        
        {lessons.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center p-12 bg-white rounded-lg border border-slate-200 shadow-sm"
          >
            <div className="max-w-sm mx-auto">
              <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No Lessons Available</h3>
              <p className="text-slate-600">Check back later for new content.</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid gap-6"
          >
            {lessons.map((lesson, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
              >
                <Card className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200 border border-slate-200">
                  <CardHeader className="border-b border-slate-100 bg-slate-50">
                    <CardTitle className="text-xl text-slate-800">{lesson.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      {lesson.modules.map((module, moduleIndex) => (
                        <motion.div
                          key={moduleIndex}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.5, delay: 0.1 * moduleIndex }}
                          className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors duration-200"
                          onClick={() => handleLessonClick(module)}
                        >
                          <div className="flex items-center space-x-4">
                            <div className="p-2 bg-slate-100 rounded-full">
                              <BookOpen className="h-5 w-5 text-slate-600" />
                            </div>
                            <div>
                              <h3 className="font-medium text-slate-900">{module.title}</h3>
                              {activeLessonId === module.id && (
                                <span className="text-sm text-primary">Currently Active</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            {module.completed ? (
                              <div className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-full">
                                <Check className="h-4 w-4 mr-1" />
                                <span className="text-sm font-medium">Completed</span>
                              </div>
                            ) : (
                              <div className="flex items-center text-slate-400">
                                <Circle className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
        
        {/* Debug information - only show in development */}
        {process.env.NODE_ENV === 'development' && debugInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="mt-8 p-6 bg-white rounded-lg border border-slate-200 shadow-sm"
          >
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Debug Information</h3>
            <pre className="text-xs text-slate-600 bg-slate-50 p-4 rounded border border-slate-200 overflow-auto">{debugInfo}</pre>
          </motion.div>
        )}
      </div>
    </div>
  );
}
