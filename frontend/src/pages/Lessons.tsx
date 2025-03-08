import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Circle, Loader2, Download, BookOpen, FileText, Sparkles } from "lucide-react";
import { api } from "@/server/api";
import { LessonLayout } from "@/components/LessonLayout";
import { Button } from "@/components/ui/button";

interface Module {
  title: string;
  completed: boolean;
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

  useEffect(() => {
    const fetchLessons = async () => {
      setIsLoading(true);
      setError(null);
      try {
        console.log('Fetching course structure...');
        setDebugInfo('Fetching course structure...');
        
        // Always include the Deep Learning lesson
        const deepLearningLesson = {
          title: "Monday: Lesson 1 - Introduction to Deep Learning",
          modules: [{
            title: "Introduction to Deep Learning",
            completed: false
          }]
        };
        
        try {
          const courseStructure = await api.getCourseStructure();
          console.log('Course structure received:', courseStructure);
          setDebugInfo(prev => prev + '\nCourse structure received: ' + JSON.stringify(courseStructure, null, 2));
          
          if (!courseStructure || courseStructure.length === 0) {
            console.warn('Course structure is empty');
            setDebugInfo(prev => prev + '\nWarning: Course structure is empty');
            
            // If no lessons are found, just use the Deep Learning lesson
            setLessons([deepLearningLesson]);
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
                    completed: false
                  }))
                };
              });
            });
            
            console.log('Transformed lessons:', transformedLessons);
            setDebugInfo(prev => prev + '\nTransformed lessons: ' + JSON.stringify(transformedLessons, null, 2));
            
            // Add the Deep Learning lesson at the beginning
            setLessons([deepLearningLesson, ...transformedLessons]);
          }
        } catch (err) {
          console.error("Failed to fetch course structure:", err);
          setDebugInfo(prev => prev + '\nError fetching course structure: ' + JSON.stringify(err, null, 2));
          
          // If there's an error, just use the Deep Learning lesson
          setLessons([deepLearningLesson]);
        }
      } catch (err) {
        console.error("Failed to fetch lessons:", err);
        setDebugInfo(prev => prev + '\nError: ' + JSON.stringify(err, null, 2));
        setError("Failed to load lessons. Please try again later.");
        
        // Add a default Deep Learning lesson if there's an error
        setLessons([{
          title: "Monday: Lesson 1 - Introduction to Deep Learning",
          modules: [{
            title: "Introduction to Deep Learning",
            completed: false
          }]
        }]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLessons();
  }, []);

  const handleLessonClick = async (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setPdfError(false); // Reset PDF error state when selecting a new lesson
    
    // If this is the Deep Learning lesson, prepare its content
    if (lesson.title.toLowerCase().includes('deep learning')) {
      try {
        console.log('Preparing Deep Learning content...');
        
        // Set the content directly for the Deep Learning lesson
        const deepLearningContent = `# Introduction to Deep Learning

## What is Deep Learning?

Deep learning is a subset of machine learning that uses neural networks with multiple layers (deep neural networks) to analyze various factors of data.

Key characteristics of deep learning:
- Uses neural networks with many layers (hence "deep")
- Can automatically discover features from raw data
- Excels at processing unstructured data like images, text, and audio
- Requires large amounts of data and computational power
- Has achieved state-of-the-art results in many domains

## History of Deep Learning

The concept of artificial neural networks has been around since the 1940s, but deep learning as we know it today began to take shape in the 1980s and 1990s. However, it wasn't until the 2010s that deep learning experienced a renaissance due to:

1. Increased computational power (especially GPUs)
2. Availability of large datasets
3. Algorithmic improvements (like better activation functions)
4. Development of open-source frameworks

## Key Concepts in Deep Learning

### Neural Networks
Neural networks are the foundation of deep learning. They consist of:
- Input layer: Receives the raw data
- Hidden layers: Process the data through weighted connections
- Output layer: Produces the final result

### Activation Functions
Activation functions introduce non-linearity into the network, allowing it to learn complex patterns:
- ReLU (Rectified Linear Unit): Most commonly used
- Sigmoid: Used for binary classification
- Tanh: Similar to sigmoid but with output range [-1, 1]

### Backpropagation
Backpropagation is the algorithm used to train neural networks by:
1. Calculating the error at the output
2. Propagating it backward through the network
3. Adjusting weights to minimize the error

## Applications of Deep Learning

Deep learning has revolutionized many fields:

- Computer Vision: Image classification, object detection, facial recognition
- Natural Language Processing: Translation, sentiment analysis, chatbots
- Speech Recognition: Voice assistants, transcription services
- Healthcare: Disease diagnosis, drug discovery
- Autonomous Vehicles: Self-driving cars, drones
- Gaming: AlphaGo, game-playing agents

## Challenges in Deep Learning

Despite its success, deep learning faces several challenges:
- Requires large amounts of labeled data
- Computationally intensive and energy-consuming
- Models can be difficult to interpret (black box problem)
- Vulnerable to adversarial attacks
- May amplify biases present in training data

## Getting Started with Deep Learning

To begin working with deep learning:
1. Learn the mathematical foundations (linear algebra, calculus, probability)
2. Master a programming language (Python is most common)
3. Study frameworks like TensorFlow or PyTorch
4. Start with simple projects and gradually increase complexity
5. Stay updated with the latest research and developments`;
        
        // Update the lesson with the content
        setSelectedLesson(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            content: deepLearningContent
          };
        });
      } catch (error) {
        console.error('Failed to prepare Deep Learning content:', error);
        setPdfError(true);
      }
    }
  };

  const handleDownloadPDF = () => {
    // Create a simple PDF-like content for download
    const content = selectedLesson?.content || "Introduction to Deep Learning";
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'introduction-to-deep-learning.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[300px]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-primary/70">Loading lessons...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">{error}</div>
            <div className="mt-4 p-4 bg-muted rounded text-xs whitespace-pre-wrap">
              <h3 className="font-bold mb-2">Debug Information:</h3>
              {debugInfo}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedLesson) {
    const isDeepLearningLesson = selectedLesson.title.toLowerCase().includes('deep learning');

    return (
      <LessonLayout isLesson1={isDeepLearningLesson}>
        <div className="space-y-6">
          <Card className="border-primary/20 shadow-md overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-gradient-start via-gradient-middle to-gradient-end text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <div className="relative">
                  <FileText className="h-5 w-5" />
                  <Sparkles className="h-3 w-3 absolute -top-1 -right-1 text-yellow-300" />
                </div>
                {selectedLesson.title}
              </CardTitle>
              {isDeepLearningLesson && (
                <Button variant="secondary" size="sm" onClick={handleDownloadPDF} className="bg-white text-primary hover:bg-secondary">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {isDeepLearningLesson ? (
                <div className="space-y-4 p-6 bg-gradient-to-b from-secondary/30 to-white">
                  <div className="overflow-hidden rounded-md bg-white shadow-sm">
                    <div className="prose max-w-none p-6">
                      {selectedLesson.content ? (
                        <div className="pdf-content" dangerouslySetInnerHTML={{ 
                          __html: selectedLesson.content
                            .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-gradient-start mb-4">$1</h1>')
                            .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-primary mt-6 mb-3">$1</h2>')
                            .replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold text-accent mt-4 mb-2">$1</h3>')
                            .replace(/^- (.*$)/gm, '<li class="ml-6 mb-1 text-lesson-text">$1</li>')
                            .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-6 mb-1 text-lesson-text"><span class="font-bold text-lesson-highlight">$1.</span> $2</li>')
                            .replace(/\n\n/g, '</p><p class="mb-4 text-lesson-text">')
                            .replace(/<\/p><p class="mb-4 text-lesson-text">- /g, '</p><ul class="my-4 list-disc"><li class="ml-6 mb-1 text-lesson-text">')
                            .replace(/<\/p><p class="mb-4 text-lesson-text">(\d+)\. /g, '</p><ol class="my-4 list-decimal"><li class="ml-6 mb-1 text-lesson-text">')
                            .replace(/<\/li>\n<\/p><p class="mb-4 text-lesson-text">/g, '</li></ul><p class="mb-4 text-lesson-text">')
                            .replace(/<\/li>\n<\/p><p class="mb-4 text-lesson-text">(\d+)\. /g, '</li></ol><p class="mb-4 text-lesson-text">')
                        }} />
                      ) : (
                        <div className="pdf-content">
                          <h1 className="text-2xl font-bold text-gradient-start mb-4">Introduction to Deep Learning</h1>
                          <h2 className="text-xl font-bold text-primary mt-6 mb-3">What is Deep Learning?</h2>
                          <p className="mb-4 text-lesson-text">
                            Deep learning is a subset of machine learning that uses neural networks with multiple layers 
                            (deep neural networks) to analyze various factors of data.
                          </p>
                          <p className="mb-4 text-lesson-text">Key characteristics of deep learning:</p>
                          <ul className="my-4 list-disc">
                            <li className="ml-6 mb-1 text-lesson-text">Uses neural networks with many layers (hence "deep")</li>
                            <li className="ml-6 mb-1 text-lesson-text">Can automatically discover features from raw data</li>
                            <li className="ml-6 mb-1 text-lesson-text">Excels at processing unstructured data like images, text, and audio</li>
                            <li className="ml-6 mb-1 text-lesson-text">Requires large amounts of data and computational power</li>
                            <li className="ml-6 mb-1 text-lesson-text">Has achieved state-of-the-art results in many domains</li>
                          </ul>
                          <h2 className="text-xl font-bold text-primary mt-6 mb-3">Applications of Deep Learning</h2>
                          <p className="mb-4 text-lesson-text">Deep learning has revolutionized many fields:</p>
                          <ul className="my-4 list-disc">
                            <li className="ml-6 mb-1 text-lesson-text">Computer Vision: Image classification, object detection, facial recognition</li>
                            <li className="ml-6 mb-1 text-lesson-text">Natural Language Processing: Translation, sentiment analysis, chatbots</li>
                            <li className="ml-6 mb-1 text-lesson-text">Speech Recognition: Voice assistants, transcription services</li>
                            <li className="ml-6 mb-1 text-lesson-text">Healthcare: Disease diagnosis, drug discovery</li>
                            <li className="ml-6 mb-1 text-lesson-text">Autonomous Vehicles: Self-driving cars, drones</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="prose max-w-none p-6">
                  {selectedLesson.content || (
                    <div className="space-y-4">
                      {selectedLesson.modules.map((module, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 hover:bg-secondary/30 rounded-lg transition-colors"
                        >
                          <div className="flex items-center space-x-2">
                            {module.completed ? (
                              <Check className="h-5 w-5 text-green-500" />
                            ) : (
                              <Circle className="h-5 w-5 text-primary/50" />
                            )}
                            <span className="text-lesson-text">{module.title}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </LessonLayout>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gradient-to-b from-secondary/30 to-white min-h-screen">
      {lessons.map((lesson, index) => (
        <Card 
          key={index}
          className="cursor-pointer hover:shadow-lg transition-all transform hover:-translate-y-1 border-primary/20 overflow-hidden"
          onClick={() => handleLessonClick(lesson)}
        >
          <CardHeader className="bg-gradient-to-r from-gradient-start via-gradient-middle to-gradient-end text-white">
            <CardTitle className="flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              {lesson.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 bg-white">
            <div className="space-y-4">
              {lesson.modules.map((module, moduleIndex) => (
                <div
                  key={moduleIndex}
                  className="flex items-center justify-between p-2 hover:bg-secondary/30 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    {module.completed ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-primary/50" />
                    )}
                    <span className="text-lesson-text">{module.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
