import axios from 'axios';

// Use relative URL since we're using Vite's proxy
const axiosInstance = axios.create({
  baseURL: '/api',  // Changed from absolute URL to relative
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  },
  // Add withCredentials for CORS
  withCredentials: true
});

// Add response interceptor for error handling
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout');
      throw new Error('Request timeout - server is not responding');
    }
    
    if (!error.response) {
      console.error('Network error:', error);
      throw new Error('Network error - please check your connection');
    }
    
    throw error;
  }
);

const api = {
  login: async (email: string, password: string) => {
    try {
      const response = await axiosInstance.post('/auth/login', {
        email,
        password
      });
      return response.data;
    } catch (error: any) {
      console.error('Login API error:', error.response?.data || error.message);
      throw error;
    }
  },

  register: async (userData: {
    username: string;
    surname: string;
    email: string;
    password: string;
  }) => {
    try {
      console.log('Sending registration request to:', `/auth/register`);
      const response = await axiosInstance.post('/auth/register', userData);
      return response.data;
    } catch (error: any) {
      console.error('Registration API error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  },

  // Add a health check method
  checkHealth: async () => {
    try {
      const response = await axiosInstance.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }
};

export { api }; 