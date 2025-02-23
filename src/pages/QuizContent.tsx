
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useParams } from "react-router-dom";

export default function QuizContent() {
  const { id } = useParams();

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 border-r bg-gray-50 p-4">
        <h2 className="font-semibold mb-4">Curriculum: {id}</h2>
        <div className="space-y-2">
          <button className="w-full text-left p-2 hover:bg-gray-100 rounded">
            Introduction
          </button>
          <button className="w-full text-left p-2 hover:bg-gray-100 rounded">
            Basic Concepts
          </button>
          <button className="w-full text-left p-2 hover:bg-gray-100 rounded">
            Advanced Topics
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <h1 className="text-2xl font-bold">Quiz Overview</h1>
              <p className="text-gray-600">
                This quiz will test your understanding of the key concepts covered
                in this module. Take your time to answer each question carefully.
              </p>
              <div className="space-y-2">
                <p className="font-medium">Guidelines:</p>
                <ul className="list-disc list-inside text-gray-600">
                  <li>You have 60 minutes to complete this quiz</li>
                  <li>Each question is worth equal points</li>
                  <li>You can review your answers before submission</li>
                </ul>
              </div>
              <Button className="mt-4">Begin Quiz</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
