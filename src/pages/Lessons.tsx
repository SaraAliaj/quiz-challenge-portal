import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Circle, Loader2, Clock } from "lucide-react";
import { api } from "@/server/api";
import { LessonLayout } from "@/components/LessonLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Module {
  title: string;
  time: string;
  completed: boolean;
}

interface Lesson {
  title: string;
  time: string;
  modules: Module[];
  content?: string;
}

export default function Lessons() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Time state for the selected lesson
  const [selectedHour, setSelectedHour] = useState("12");
  const [selectedMinute, setSelectedMinute] = useState("00");
  const [selectedPeriod, setSelectedPeriod] = useState("AM");

  useEffect(() => {
    const fetchLessons = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const courseStructure = await api.getCourseStructure();
        
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
        setLessons([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLessons();
  }, []);

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    // Parse existing time if available
    if (lesson.time) {
      const [hours, minutes] = lesson.time.split(':');
      const hour = parseInt(hours);
      setSelectedHour(hour > 12 ? (hour - 12).toString() : hour.toString());
      setSelectedMinute(minutes);
      setSelectedPeriod(hour >= 12 ? 'PM' : 'AM');
    }
  };

  const handleTimeChange = async (hour: string, minute: string, period: string) => {
    if (!selectedLesson) return;

    // Convert to 24-hour format
    let hours = parseInt(hour);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    const timeString = `${hours.toString().padStart(2, '0')}:${minute}`;

    try {
      // Update the lesson time in the database
      await api.updateLessonTime(selectedLesson.title, timeString);
      
      // Update local state
      setLessons(prevLessons => 
        prevLessons.map(lesson => 
          lesson.title === selectedLesson.title 
            ? { ...lesson, time: timeString }
            : lesson
        )
      );
    } catch (error) {
      console.error('Failed to update lesson time:', error);
    }
  };

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

  if (selectedLesson) {
    const isLesson1 = selectedLesson.title.toLowerCase().includes('deep learning') && 
                      (selectedLesson.title.toLowerCase().includes('lesson 1') || 
                       selectedLesson.modules.some(m => 
                         m.title.toLowerCase().includes('lesson 1') && 
                         m.title.toLowerCase().includes('deep learning')));

    return (
      <LessonLayout isLesson1={isLesson1}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="space-y-4">
                <CardTitle>{selectedLesson.title}</CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <Label>Lesson Time:</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedHour}
                      onValueChange={(value) => {
                        setSelectedHour(value);
                        handleTimeChange(value, selectedMinute, selectedPeriod);
                      }}
                    >
                      <SelectTrigger className="w-[70px]">
                        <SelectValue placeholder="Hour" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(1, '0')).map((hour) => (
                          <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span>:</span>
                    <Select
                      value={selectedMinute}
                      onValueChange={(value) => {
                        setSelectedMinute(value);
                        handleTimeChange(selectedHour, value, selectedPeriod);
                      }}
                    >
                      <SelectTrigger className="w-[70px]">
                        <SelectValue placeholder="Min" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map((minute) => (
                          <SelectItem key={minute} value={minute}>{minute}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={selectedPeriod}
                      onValueChange={(value) => {
                        setSelectedPeriod(value);
                        handleTimeChange(selectedHour, selectedMinute, value);
                      }}
                    >
                      <SelectTrigger className="w-[70px]">
                        <SelectValue placeholder="AM/PM" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="PM">PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                {selectedLesson.content || (
                  <div className="space-y-4">
                    {selectedLesson.modules.map((module, index) => (
                      <div
                        key={index}
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
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </LessonLayout>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {lessons.map((lesson, index) => (
        <Card 
          key={index}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleLessonClick(lesson)}
        >
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>{lesson.title}</span>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>{lesson.time}</span>
              </div>
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
