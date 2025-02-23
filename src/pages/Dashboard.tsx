
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

export default function Dashboard() {
  const challenges = [
    {
      lessonTitle: "Neural Networks Basics",
      challenge: "Build a Simple Perceptron",
      points: 100,
      completed: false,
    },
    {
      lessonTitle: "Activation Functions",
      challenge: "Implement ReLU Function",
      points: 150,
      completed: false,
    },
    {
      lessonTitle: "Backpropagation",
      challenge: "Calculate Gradients",
      points: 200,
      completed: true,
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Welcome to AI School</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Course completion: 15%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Current Challenges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {challenges.map((challenge, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{challenge.challenge}</p>
                    <p className="text-sm text-gray-500">
                      {challenge.lessonTitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {challenge.points} pts
                    </span>
                    {challenge.completed && (
                      <Trophy className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
