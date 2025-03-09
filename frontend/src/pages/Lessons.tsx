import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Circle, Loader2, Download, BookOpen, FileText, Sparkles } from "lucide-react";
import { api } from "@/server/api";
import { LessonLayout } from "@/components/LessonLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useWebSocket } from "@/contexts/WebSocketContext";
import LessonPopup from "@/components/LessonPopup";
import { LessonChatbot } from "@/components/LessonChatbot";
import { useToast } from "@/components/ui/use-toast";

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
        const response = await api.getLessonPdf(module.id);
        
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
      const response = await api.getLessonPdf(lessonId);
      
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
      <LessonLayout isLesson1={true}>
        <div className="flex flex-col h-full">
          <h1 className="text-2xl font-bold mb-4">{selectedLesson.modules[0].title}</h1>
          
          {pdfUrl ? (
            <div className="flex-grow">
              <iframe 
                src={pdfUrl} 
                className="w-full h-[calc(100vh-200px)]" 
                title={selectedLesson.modules[0].title}
              />
            </div>
          ) : pdfError ? (
            <div className="p-4 bg-red-50 text-red-800 rounded-md">
              <h2 className="text-lg font-semibold">Error Loading PDF</h2>
              <p>The lesson PDF could not be loaded. Please try again later.</p>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading PDF...</span>
            </div>
          )}
        </div>
      </LessonLayout>
    );
  }

  // If a lesson is selected but not active, show the lesson details with start button for lead students
  if (selectedLesson) {
    return (
      <div className="container mx-auto p-4">
        <Button 
          onClick={() => setSelectedLesson(null)} 
          variant="outline" 
          className="mb-4"
        >
          Back to Lessons
        </Button>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{selectedLesson.modules[0].title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">This lesson is part of {selectedLesson.title}.</p>
            
            {user?.role === 'lead_student' && (
              <LessonPopup 
                lessonId={selectedLesson.modules[0].id} 
                lessonName={selectedLesson.modules[0].title}
                onLessonStart={handleLessonStart}
              />
            )}
            
            {user?.role !== 'lead_student' && (
              <div className="p-4 bg-blue-50 text-blue-800 rounded-md">
                <h2 className="text-lg font-semibold">Waiting for Lesson</h2>
                <p>The lead student hasn't started this lesson yet. Please wait for them to begin.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default view - show all lessons
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Lessons</h1>
      
      {lessons.length === 0 ? (
        <div className="text-center p-8">
          <p className="text-gray-500">No lessons available.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {lessons.map((lesson, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle>{lesson.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {lesson.modules.map((module, moduleIndex) => (
                    <div 
                      key={moduleIndex} 
                      className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleLessonClick(module)}
                    >
                      <div className="flex items-center">
                        <BookOpen className="h-5 w-5 text-primary mr-2" />
                        <span>{module.title}</span>
                      </div>
                      <div className="flex items-center">
                        {module.completed ? (
                          <Check className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-300" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Debug information - only show in development */}
      {process.env.NODE_ENV === 'development' && debugInfo && (
        <div className="mt-8 p-4 bg-gray-100 rounded-md">
          <h3 className="font-semibold mb-2">Debug Information</h3>
          <pre className="text-xs whitespace-pre-wrap">{debugInfo}</pre>
        </div>
      )}
    </div>
  );
}
