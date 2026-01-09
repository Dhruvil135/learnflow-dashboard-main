import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { WebSocketProvider } from "./components/WebSocketProvider";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import StudentDashboard from "./pages/StudentDashboard";
import InstructorDashboard from "./pages/InstructorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import CourseDetail from "./pages/CourseDetail";
import LessonDetail from "./pages/LessonDetail";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Courses from './pages/Courses';
import CreateCourse from '@/pages/CreateCourse';
import TakeExam from "./pages/TakeExam";
import EditCourse from '@/pages/EditCourse';
import AddLesson from '@/pages/AddLesson';
import EditLesson from '@/pages/EditLesson';
import CreateExam from './pages/CreateExam';
import ExamSubmissions from '@/pages/ExamSubmissions';
import AnalyticsDashboard from '@/pages/AnalyticsDashboard'; // ✅ NEW
import ForgotPassword from '@/pages/ForgotPassword'; // ✅ NEW
import ResetPassword from '@/pages/ResetPassword'; // ✅ NEW

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <WebSocketProvider>
      <Routes>
        <Route path="/" element={user ? <Navigate to={`/${user.role}`} replace /> : <Index />} />
        <Route path="/auth" element={user ? <Navigate to={`/${user.role}`} replace /> : <Auth />} />

        {/* ✅ NEW: Password Reset Routes (Public) */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Student Routes */}
        <Route path="/student" element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentDashboard />
          </ProtectedRoute>
        } />

        {/* Take Exam Route */}
        <Route path="/take-exam/:examId" element={
          <ProtectedRoute allowedRoles={['student']}>
            <TakeExam />
          </ProtectedRoute>
        } />

        {/* Instructor Routes */}
        <Route path="/instructor" element={
          <ProtectedRoute allowedRoles={['instructor']}>
            <InstructorDashboard />
          </ProtectedRoute>
        } />

        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        {/* Courses Page */}
        <Route path="/courses" element={
          <ProtectedRoute>
            <Courses />
          </ProtectedRoute>
        } />

        {/* Course Management Routes */}
        <Route path="/courses/create" element={
          <ProtectedRoute allowedRoles={['instructor', 'admin']}>
            <CreateCourse />
          </ProtectedRoute>
        } />

        <Route path="/courses/:id/edit" element={
          <ProtectedRoute allowedRoles={['instructor', 'admin']}>
            <EditCourse />
          </ProtectedRoute>
        } />

        {/* Lesson Management Routes */}
        <Route path="/courses/:id/lessons/add" element={
          <ProtectedRoute allowedRoles={['instructor', 'admin']}>
            <AddLesson />
          </ProtectedRoute>
        } />

        <Route path="/courses/:courseId/lessons/:id/edit" element={
          <ProtectedRoute allowedRoles={['instructor', 'admin']}>
            <EditLesson />
          </ProtectedRoute>
        } />

        {/* Course Detail Page */}
        <Route path="/courses/:id" element={
          <ProtectedRoute>
            <CourseDetail />
          </ProtectedRoute>
        } />

        {/* Redirect old /lessons to /courses */}
        <Route path="/lessons" element={<Navigate to="/courses" replace />} />

        {/* Lesson Detail Page */}
        <Route path="/lesson/:id" element={
          <ProtectedRoute>
            <LessonDetail />
          </ProtectedRoute>
        } />

        {/* Profile Page */}
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />

        {/* Create Exam Route */}
        <Route path="/exams/create" element={
          <ProtectedRoute allowedRoles={['instructor', 'admin']}>
            <CreateExam />
          </ProtectedRoute>
        } />

        {/* Exam Submissions Route */}
        <Route path="/exams/:id/submissions" element={
          <ProtectedRoute allowedRoles={['instructor', 'admin']}>
            <ExamSubmissions />
          </ProtectedRoute>
        } />

        {/* ✅ NEW: Analytics Dashboard Route */}
        <Route path="/analytics" element={
          <ProtectedRoute allowedRoles={['instructor', 'admin']}>
            <AnalyticsDashboard />
          </ProtectedRoute>
        } />

        {/* 404 Page */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </WebSocketProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
