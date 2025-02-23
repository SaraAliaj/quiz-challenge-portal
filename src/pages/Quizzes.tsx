
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const upcomingQuiz = {
  id: "week-1-neural-networks",
  title: "Week 1: Neural Networks Fundamentals",
  date: "Friday, March 15, 2024",
  time: "14:00",
  duration: "60 minutes",
};

export default function Quizzes() {
  const navigate = useNavigate();

  const handleStartQuiz = () => {
    navigate(`/quiz/${upcomingQuiz.id}`);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Weekly Quizzes</h1>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Upcoming Quiz</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">{upcomingQuiz.title}</h3>
            <div className="flex space-x-4 text-gray-600">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                {upcomingQuiz.date}
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                {upcomingQuiz.time}
              </div>
            </div>
            <p className="text-sm text-gray-500">Duration: {upcomingQuiz.duration}</p>
          </div>
          <Button className="w-full" onClick={handleStartQuiz}>Start Quiz</Button>
        </CardContent>
      </Card>
    </div>
  );
}
