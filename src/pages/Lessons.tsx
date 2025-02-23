
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Circle } from "lucide-react";

const lessons = [
  {
    title: "Deep Learning",
    time: "14:00",
    modules: [
      { title: "Basics of Neural Networks", time: "10:00", completed: true },
      { title: "Activation Functions", time: "11:30", completed: false },
      { title: "Backpropagation", time: "13:00", completed: false },
      { title: "Optimization", time: "14:30", completed: false },
      { title: "Model Architecture", time: "16:00", completed: false },
    ],
  },
];

export default function Lessons() {
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
