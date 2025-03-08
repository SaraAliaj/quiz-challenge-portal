import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/server/api';
import { FullPageLoading } from '@/components/ui/loading';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'student' | 'lead_student' | 'admin';
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: {
    username: string;
    surname: string;
    email: string;
    password: string;
  }) => Promise<void>;
  checkAuthStatus: () => Promise<boolean>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = async (): Promise<boolean> => {
    const token = localStorage.getItem('authToken');
    if (!token) return false;
    
    try {
      // Verify token validity with the server
      const response = await api.verifyToken();
      if (response.valid) {
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          // Ensure user has a role property, default to 'user' if not present
          if (!parsedUser.role) {
            parsedUser.role = 'user';
          }
          setUser(parsedUser);
          setIsAuthenticated(true);
          return true;
        }
      } else {
        // If token is invalid, clear local storage
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      // Don't clear token on network errors to allow offline access
      // Instead, trust the cached token
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        // Ensure user has a role property, default to 'user' if not present
        if (!parsedUser.role) {
          parsedUser.role = 'user';
        }
        setUser(parsedUser);
        setIsAuthenticated(true);
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('user');
      
      if (token && userData) {
        try {
          // Try to verify token, but if server is unreachable, still use cached data
          await checkAuthStatus();
        } catch (error) {
          console.error('Auth initialization error:', error);
          // If server is unreachable, still use cached credentials
          setIsAuthenticated(true);
          const parsedUser = JSON.parse(userData);
          // Ensure user has a role property, default to 'user' if not present
          if (!parsedUser.role) {
            parsedUser.role = 'user';
          }
          setUser(parsedUser);
        }
      }
      setIsLoading(false);
    };
    
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.login(email, password);
      console.log('Login response in AuthContext:', response);
      
      // Extract user and token from the response
      const userData = response.data?.user || response.user;
      const token = response.data?.token || response.token;
      
      if (!userData || !token) {
        throw new Error('Invalid response format from server');
      }
      
      // Ensure user has a role property, default to 'user' if not present
      if (!userData.role) {
        userData.role = 'user';
      }
      
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setIsAuthenticated(true);
      setUser(userData);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (userData: {
    username: string;
    surname: string;
    email: string;
    password: string;
  }) => {
    try {
      const response = await api.register(userData);
      console.log('Registration response in AuthContext:', response);
      
      // Extract user and token from the response
      const registeredUser = response.data?.user || response.user;
      const token = response.data?.token || response.token;
      
      if (!registeredUser || !token) {
        throw new Error('Invalid response format from server');
      }
      
      // Ensure user has a role property, default to 'user' if not present
      if (!registeredUser.role) {
        registeredUser.role = 'user';
      }
      
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(registeredUser));
      setIsAuthenticated(true);
      setUser(registeredUser);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      login, 
      logout, 
      register, 
      checkAuthStatus,
      isLoading 
    }}>
      {isLoading ? <FullPageLoading text="Loading your session..." /> : children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 