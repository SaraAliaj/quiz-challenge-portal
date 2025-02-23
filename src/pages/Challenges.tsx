
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Challenges() {
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
      <h1 className="text-2xl font-bold mb-6">Lesson Challenges</h1>
      <div className="grid gap-6">
        {challenges.map((challenge, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle>{challenge.lessonTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">{challenge.challenge}</p>
                  <p className="text-sm text-gray-500">{challenge.points} points</p>
                </div>
                <div className="flex items-center gap-4">
                  {challenge.completed ? (
                    <Trophy className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <Button>Start Challenge</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
