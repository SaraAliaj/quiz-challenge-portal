import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";
import Layout from "./components/layout/Layout";
import Lessons from "./pages/Lessons";
import Quizzes from "./pages/Quizzes";
import Chat from "@/pages/Chat";
import NotFound from "./pages/NotFound";
import Challenges from "./pages/Challenges";
import QuizContent from "./pages/QuizContent";
import Dashboard from '@/pages/Dashboard';
import GroupChat from "@/pages/GroupChat";
import Admin from "@/pages/Admin";
import LessonPage from "@/pages/LessonPage";
import { ManageCourses, ManageLessons, ManageStudents } from "@/pages/admin/index";

const queryClient = new QueryClient();

// Admin route wrapper component
const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  
  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginForm />} />
            <Route path="/register" element={<RegisterForm />} />

            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/chat" replace />} />
              <Route path="chat" element={<Chat />} />
              <Route path="group-chat" element={<GroupChat />} />
              <Route path="lessons" element={<Lessons />} />
              <Route path="lesson/:id" element={<LessonPage />} />
              <Route path="challenges" element={<Challenges />} />
              <Route path="quizzes" element={<Quizzes />} />
              <Route path="quiz/:id" element={<QuizContent />} />
              
              {/* Admin routes */}
              <Route path="admin" element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              } />
              <Route path="admin/courses" element={
                <AdminRoute>
                  <ManageCourses />
                </AdminRoute>
              } />
              <Route path="admin/lessons" element={
                <AdminRoute>
                  <ManageLessons />
                </AdminRoute>
              } />
              <Route path="admin/students" element={
                <AdminRoute>
                  <ManageStudents />
                </AdminRoute>
              } />
            </Route>

            {/* 404 route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
