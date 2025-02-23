
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginForm from "./components/auth/LoginForm";
import RegisterForm from "./components/auth/RegisterForm";
import Layout from "./components/layout/Layout";
import Lessons from "./pages/Lessons";
import Quizzes from "./pages/Quizzes";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";
import Challenges from "./pages/Challenges";
import QuizContent from "./pages/QuizContent";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/chat" replace />} />
            <Route path="lessons" element={<Lessons />} />
            <Route path="challenges" element={<Challenges />} />
            <Route path="quizzes" element={<Quizzes />} />
            <Route path="quiz/:id" element={<QuizContent />} />
            <Route path="chat" element={<Chat />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
