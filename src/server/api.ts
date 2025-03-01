import axios from 'axios';

// Use relative URL since we're using Vite's proxy
const axiosInstance = axios.create({
  baseURL: '/api',  // Changed from absolute URL to relative
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // Add withCredentials for CORS
});

// Add request interceptor to include auth token
axiosInstance.interceptors.request.use(
  config => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

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
      const response = await axiosInstance.post('/auth/login', { email, password });
      return response.data;
    } catch (error: any) {
      console.error('Login API error:', error.response?.data || error.message);
      throw error;
    }
  },

  register: async (userData: { username: string, surname: string, email: string, password: string }) => {
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

  verifyToken: async () => {
    try {
      const response = await axiosInstance.get('/auth/verify');
      return response.data;
    } catch (error) {
      console.error('Token verification failed:', error);
      throw error;
    }
  },

  checkHealth: async () => {
    try {
      const response = await axiosInstance.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  },

  getCourses: async () => {
    try {
      const response = await axiosInstance.get('/courses');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      throw error;
    }
  },

  getWeeks: async () => {
    try {
      const response = await axiosInstance.get('/weeks');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch weeks:', error);
      throw error;
    }
  },

  getDays: async () => {
    try {
      const response = await axiosInstance.get('/days');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch days:', error);
      throw error;
    }
  },

  uploadLesson: async (formData: FormData) => {
    try {
      console.log('Starting lesson upload request');
      
      // Log FormData entries for debugging
      console.log('FormData entries:');
      for (const pair of (formData as any).entries()) {
        const [key, value] = pair;
        if (key === 'files') {
          console.log(`File entry: ${key}, filename: ${value instanceof File ? value.name : 'not a file'}`);
        } else {
          console.log(`Form field: ${key}=${value}`);
        }
      }
      
      // Create a separate axios instance without auth interceptors for this request
      const noAuthAxios = axios.create({
        baseURL: '/api',
        timeout: 60000, // Increase timeout for file uploads (60 seconds)
        withCredentials: true
      });
      
      console.log('Sending POST request to /lessons');
      
      // Use the original FormData directly
      const response = await noAuthAxios.post('/lessons', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      
      console.log('Lesson upload successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to upload lesson:', error);
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers
        });
      }
      throw error;
    }
  }
};

export { api };
