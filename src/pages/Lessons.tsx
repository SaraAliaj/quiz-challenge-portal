import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Circle, Loader2 } from "lucide-react";
import { api } from "@/server/api";

interface Module {
  title: string;
  time: string;
  completed: boolean;
}

interface Lesson {
  title: string;
  time: string;
  modules: Module[];
}

export default function Lessons() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLessons = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // This is a placeholder - you'll need to implement this API endpoint
        // For now, we'll use the course structure API to simulate lessons
        const courseStructure = await api.getCourseStructure();
        
        // Transform the course structure into the lesson format
        const transformedLessons = courseStructure.flatMap(course => {
          return course.weeks.map(week => {
            return {
              title: `${course.name} - ${week.name}`,
              time: "14:00",
              modules: week.lessons.map(lesson => ({
                title: lesson.name,
                time: lesson.time,
                completed: false
              }))
            };
          });
        });
        
        setLessons(transformedLessons);
      } catch (err) {
        console.error("Failed to fetch lessons:", err);
        setError("Failed to load lessons. Please try again later.");
        // Fallback to empty array
        setLessons([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLessons();
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[300px]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-gray-500">Loading lessons...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-500">{error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (lessons.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">No lessons available.</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {lessons.map((lesson, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>{lesson.title}</span>
              <span className="text-sm text-gray-500">{lesson.time}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lesson.modules.map((module, moduleIndex) => (
                <div
                  key={moduleIndex}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-2">
                    {module.completed ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300" />
                    )}
                    <span>{module.title}</span>
                  </div>
                  <span className="text-sm text-gray-500">{module.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
