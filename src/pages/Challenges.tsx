
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

const challenges = [
  {
    courseTitle: "Deep Learning Fundamentals",
    weekTitle: "Week 1",
    lessonTitle: "Neural Networks Basics",
    challenges: [
      {
        title: "Build a Simple Perceptron",
        question: "Implement a single-layer perceptron for binary classification",
        points: 100,
        completed: false,
      },
      {
        title: "Forward Propagation",
        question: "Calculate the output of a neural network given input values",
        points: 150,
        completed: true,
      }
    ]
  },
  {
    courseTitle: "Deep Learning Fundamentals",
    weekTitle: "Week 1",
    lessonTitle: "Activation Functions",
    challenges: [
      {
        title: "Implement ReLU",
        question: "Code the ReLU activation function and its derivative",
        points: 100,
        completed: false,
      }
    ]
  }
];

export default function Challenges() {
  return (
    <div className="p-6 space-y-8">
      {challenges.map((lesson, lessonIndex) => (
        <div key={lessonIndex} className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold">{lesson.courseTitle}</h2>
            <p className="text-gray-500">
              {lesson.weekTitle} - {lesson.lessonTitle}
            </p>
          </div>
          <div className="grid gap-4">
            {lesson.challenges.map((challenge, challengeIndex) => (
              <Card key={challengeIndex}>
                <CardHeader>
                  <CardTitle>{challenge.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-gray-600">{challenge.question}</p>
                      <p className="text-sm text-gray-500">
                        {challenge.points} points
                      </p>
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
      ))}
    </div>
  );
}
