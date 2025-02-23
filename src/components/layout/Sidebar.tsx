
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Book,
  GraduationCap,
  Layout,
  MessageCircle,
  Trophy,
} from "lucide-react";

export default function Sidebar() {
  return (
    <div className="h-screen w-64 bg-white border-r flex flex-col">
      <div className="p-4">
        <Link to="/" className="flex items-center space-x-2">
          <GraduationCap className="h-6 w-6" />
          <span className="font-bold text-xl">AI School</span>
        </Link>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        <Link to="/">
          <Button variant="ghost" className="w-full justify-start">
            <Layout className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </Link>
        <Link to="/lessons">
          <Button variant="ghost" className="w-full justify-start">
            <Book className="mr-2 h-4 w-4" />
            Lessons
          </Button>
        </Link>
        <Link to="/quizzes">
          <Button variant="ghost" className="w-full justify-start">
            <Trophy className="mr-2 h-4 w-4" />
            Weekly Quizzes
          </Button>
        </Link>
        <Link to="/chat">
          <Button variant="ghost" className="w-full justify-start">
            <MessageCircle className="mr-2 h-4 w-4" />
            AI Chat
          </Button>
        </Link>
      </nav>
    </div>
  );
}
