import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from '@/contexts/AuthContext';
import { motion } from "framer-motion";

// Local AuthForm component to avoid import issues
const AuthForm = ({ children, title, footer }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-full max-w-md mx-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center mb-6"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-2"
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-slate-800"
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
                fill="currentColor"
              />
              <path
                d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"
                fill="currentColor"
              />
            </svg>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-2xl font-bold text-slate-800"
          >
            AI School
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-sm text-slate-500 italic"
          >
            Learn. Challenge. Grow.
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="bg-white rounded-lg shadow-md p-6"
        >
          <h2 className="text-xl font-semibold text-center mb-6">{title}</h2>
          {children}
        </motion.div>

        {footer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="mt-4 text-center text-sm text-slate-600"
          >
            {footer}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-8 text-center text-xs text-slate-500"
        >
          © 2025 AI School. All rights reserved.
        </motion.div>
      </div>
    </div>
  );
};

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    username: "",
    surname: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { register, isAuthenticated, checkAuthStatus } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      if (isAuthenticated) {
        navigate('/chat', { replace: true });
        return;
      }
      
      // Check if we have a valid session
      try {
        const isValid = await checkAuthStatus();
        if (isValid) {
          navigate('/chat', { replace: true });
        }
      } catch (error) {
        console.error("Auth check error:", error);
      }
    };
    
    checkAuth();
  }, [isAuthenticated, navigate, checkAuthStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Basic validation
      if (!formData.username.trim() || !formData.email.trim() || !formData.password.trim()) {
        setError("Please fill in all required fields");
        setIsLoading(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        setIsLoading(false);
        return;
      }

      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters long");
        setIsLoading(false);
        return;
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError("Please enter a valid email address");
        setIsLoading(false);
        return;
      }

      const { confirmPassword, ...registerData } = formData;
      
      console.log('Attempting registration with:', {
        ...registerData,
        password: '[HIDDEN]'
      });

      await register(registerData);
      navigate('/chat');
    } catch (err: any) {
      console.error('Registration error:', err);
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.details ||
                          err.message || 
                          "Registration failed. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const inputVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: custom * 0.1 + 0.5, duration: 0.3 }
    })
  };

  return (
    <AuthForm 
      title="Create Account" 
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 hover:underline font-medium">
            Login
          </Link>
        </>
      }
    >
      {error && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4 p-3 text-red-500 bg-red-50 rounded-md text-sm"
        >
          {error}
        </motion.div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <motion.div 
            className="space-y-1"
            variants={inputVariants}
            initial="hidden"
            animate="visible"
            custom={1}
          >
            <div className="relative">
              <Input
                name="username"
                placeholder="First name"
                value={formData.username}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="pl-10 py-5"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="space-y-1"
            variants={inputVariants}
            initial="hidden"
            animate="visible"
            custom={2}
          >
            <div className="relative">
              <Input
                name="surname"
                placeholder="Last name"
                value={formData.surname}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="pl-10 py-5"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
            </div>
          </motion.div>
        </div>
        
        <motion.div 
          className="space-y-1"
          variants={inputVariants}
          initial="hidden"
          animate="visible"
          custom={3}
        >
          <div className="relative">
            <Input
              type="email"
              name="email"
              placeholder="Email address"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isLoading}
              className="pl-10 py-5"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6z"></path>
                <path d="m22 6-10 7L2 6"></path>
              </svg>
            </div>
          </div>
        </motion.div>
        
        <div className="grid grid-cols-2 gap-3">
          <motion.div 
            className="space-y-1"
            variants={inputVariants}
            initial="hidden"
            animate="visible"
            custom={4}
          >
            <div className="relative">
              <Input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="pl-10 py-5"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="space-y-1"
            variants={inputVariants}
            initial="hidden"
            animate="visible"
            custom={5}
          >
            <div className="relative">
              <Input
                type="password"
                name="confirmPassword"
                placeholder="Confirm"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="pl-10 py-5"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
              </div>
            </div>
          </motion.div>
        </div>
        
        <motion.div
          variants={inputVariants}
          initial="hidden"
          animate="visible"
          custom={6}
          className="pt-2"
        >
          <Button 
            type="submit" 
            className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing up...
              </div>
            ) : "Sign up"}
          </Button>
        </motion.div>
      </form>
    </AuthForm>
  );
}
