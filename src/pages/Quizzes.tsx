
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Book } from "lucide-react";
import { useNavigate } from "react-router-dom";

const upcomingQuizzes = [
  {
    id: "week-1-neural-networks",
    courseTitle: "Deep Learning Fundamentals",
    weekTitle: "Week 1",
    lessonTitle: "Neural Networks Basics",
    date: "Friday, March 15, 2024",
    time: "14:00",
    duration: "60 minutes",
  },
  {
    id: "week-1-activation",
    courseTitle: "Deep Learning Fundamentals",
    weekTitle: "Week 1",
    lessonTitle: "Activation Functions",
    date: "Friday, March 22, 2024",
    time: "14:00",
    duration: "45 minutes",
  }
];

export default function Quizzes() {
  const navigate = useNavigate();

  const handleStartQuiz = (quizId: string) => {
    navigate(`/quiz/${quizId}`);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Weekly Quizzes</h1>
      <div className="grid gap-6">
        {upcomingQuizzes.map((quiz, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle>{quiz.weekTitle}: {quiz.lessonTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center text-gray-600">
                  <Book className="h-4 w-4 mr-2" />
                  {quiz.courseTitle}
                </div>
                <div className="flex space-x-4 text-gray-600">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    {quiz.date}
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    {quiz.time}
                  </div>
                </div>
                <p className="text-sm text-gray-500">Duration: {quiz.duration}</p>
              </div>
              <Button 
                className="w-full"
                onClick={() => handleStartQuiz(quiz.id)}
              >
                Start Quiz
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
