import axios from 'axios';

// WebSocket setup
let ws: WebSocket | null = null;
let wsReconnectTimer: NodeJS.Timeout | null = null;
const WS_URL = 'ws://localhost:8000/ws';

// Create WebSocket connection
export const connectWebSocket = (userId: string, onActiveUsersUpdate: (users: any[]) => void) => {
  if (ws) {
    ws.close();
  }

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('WebSocket connected');
    // Send authentication message
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'authenticate',
        userId: userId
      }));
    }
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'active_users_update') {
        onActiveUsersUpdate(data.users);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected');
    // Attempt to reconnect after 5 seconds
    if (wsReconnectTimer) {
      clearTimeout(wsReconnectTimer);
    }
    wsReconnectTimer = setTimeout(() => {
      connectWebSocket(userId, onActiveUsersUpdate);
    }, 5000);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
};

// Disconnect WebSocket
export const disconnectWebSocket = () => {
  if (wsReconnectTimer) {
    clearTimeout(wsReconnectTimer);
  }
  if (ws) {
    ws.close();
    ws = null;
  }
};

const BASE_URL = 'http://localhost:8000';

// Create an axios instance for Node.js API calls
export const nodeAxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
  withCredentials: true
});

// Add response interceptor for better error handling
nodeAxiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused. Please ensure the backend server is running.');
      return Promise.reject(new Error('Unable to connect to the server. Please ensure the backend server is running.'));
    }
    if (!error.response) {
      console.error('Network Error:', error.message);
      return Promise.reject(new Error('Network error - please check your connection and try again.'));
    }
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Create an axios instance for the Python backend (lessons, chatbot, etc.)
const pythonAxiosInstance = axios.create({
  baseURL: 'http://localhost:8003/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Add a request interceptor to include the auth token in all requests
nodeAxiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add the same response interceptor to the Python axios instance
pythonAxiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('Server error:', error.response.data);
      return Promise.reject(error);
    } else if (error.request) {
      console.error('Network error:', error);
      return Promise.reject(new Error(`Network error - please check if the Python backend server is running. Details: ${error.message}`));
    } else {
      console.error('Request error:', error.message);
      return Promise.reject(error);
    }
  }
);

// API functions
export const api = {
  // Auth functions (Node.js backend)
  login: async (email: string, password: string) => {
    try {
      const response = await nodeAxiosInstance.post('/api/auth/login', { email, password });
      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  register: async (username: string, email: string, password: string) => {
    try {
      const response = await nodeAxiosInstance.post('/api/auth/register', { username, email, password });
      return response.data;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  },

  verifyToken: async () => {
    try {
      const response = await nodeAxiosInstance.get('/api/auth/verify');
      return response.data;
    } catch (error) {
      console.error('Token verification failed:', error);
      throw error;
    }
  },

  // Lesson functions (Python backend)
  getCourseStructure: async () => {
    interface ApiLesson {
      id: number;
      lesson_name: string;
      file_path: string;
      course_id: number;
      course_name: string;
      week_id: number;
      week_name: string;
      day_id: number;
      day_name: string;
    }

    interface CourseMapItem {
      id: string;
      name: string;
      weeks: Map<string, WeekMapItem>;
    }

    interface WeekMapItem {
      id: string;
      name: string;
      lessons: Array<{
        id: string;
        name: string;
        time?: string;
      }>;
    }

    try {
      console.log('Fetching course structure from API...');
      
      // Try the Python backend first
      try {
        const lessonsResponse = await pythonAxiosInstance.get('/lessons');
        console.log('Raw lessons response from Python backend:', lessonsResponse);
        
        // The response format is { status, message, data }
        const lessons = (lessonsResponse.data.data || []) as ApiLesson[];
        console.log('Extracted lessons data:', lessons);

        // The response format might be { data } or just the data array
        let lessonsData;
        if (lessonsResponse.data.data) {
          // Format: { data: [...] }
          lessonsData = lessonsResponse.data.data as ApiLesson[];
        } else if (Array.isArray(lessonsResponse.data)) {
          // Format: [...] (direct array)
          lessonsData = lessonsResponse.data as ApiLesson[];
        } else {
          // Unknown format, use empty array
          lessonsData = [] as ApiLesson[];
        }
        console.log('Extracted lessons data:', lessonsData);

        if (!lessonsData || lessonsData.length === 0) {
          console.warn('No lessons data returned from Python API');
          throw new Error('No lessons data');
        }

        // Process lessons data
        return processLessonsData(lessonsData);
      } catch (pythonError) {
        console.warn('Failed to fetch from Python backend, trying Node.js backend:', pythonError);
        
        // Fall back to Node.js backend
        const lessonsResponse = await nodeAxiosInstance.get('/lessons');
        console.log('Raw lessons response from Node.js backend:', lessonsResponse);
        
        const lessons = lessonsResponse.data.data || [];
        if (!lessons || lessons.length === 0) {
          console.warn('No lessons data returned from Node.js API');
          return [];
        }
        
        // Handle different response formats
        let lessonsData;
        if (lessonsResponse.data.data) {
          lessonsData = lessonsResponse.data.data;
        } else if (Array.isArray(lessonsResponse.data)) {
          lessonsData = lessonsResponse.data;
        } else {
          lessonsData = [];
        }
        
        if (!lessonsData || lessonsData.length === 0) {
          console.warn('No lessons data returned from Node.js API');
          return [];
        }
        
        return processLessonsData(lessonsData);
      }
    } catch (error) {
      console.error('Failed to fetch course structure:', error);
      // Return empty array in case of error
      return [];
    }
  },

  getLessonContent: async (lessonId: string) => {
    try {
      // Try Python backend first
      try {
        const response = await pythonAxiosInstance.get(`/lessons/${lessonId}/content`);
        return response.data;
      } catch (pythonError) {
        console.warn('Failed to fetch from Python backend, trying Node.js backend:', pythonError);
        
        // Fall back to Node.js backend
        const response = await nodeAxiosInstance.get(`/lessons/${lessonId}/content`);
        return response.data;
      }
    } catch (error) {
      console.error('Failed to fetch lesson content:', error);
      throw error;
    }
  },

  downloadLessonFile: (lessonId: string) => {
    // Try Python backend URL first, with fallback to Node.js
    return `${pythonAxiosInstance.defaults.baseURL}/lessons/${lessonId}/download`;
  },

  // Other API functions (Node.js backend)
  getQuizzes: async () => {
    try {
      const response = await nodeAxiosInstance.get('/quizzes');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch quizzes:', error);
      throw error;
    }
  },

  getQuiz: async (quizId: string) => {
    try {
      const response = await nodeAxiosInstance.get(`/quizzes/${quizId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch quiz:', error);
      throw error;
    }
  },

  submitQuiz: async (quizId: string, answers: Record<string, string>) => {
    try {
      const response = await nodeAxiosInstance.post(`/quizzes/${quizId}/submit`, { answers });
      return response.data;
    } catch (error) {
      console.error('Failed to submit quiz:', error);
      throw error;
    }
  },

  getChallenges: async () => {
    try {
      const response = await nodeAxiosInstance.get('/challenges');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch challenges:', error);
      throw error;
    }
  },

  // Grok API for chatbot
  sendMessageToGrok: async (message: string, lessonContext?: string) => {
    try {
      console.log("Sending request to Grok API with message:", message);
      
      const response = await pythonAxiosInstance.post('/chatbot/grok', {
        message,
        model: 'grok-beta',
        context: lessonContext
      });
      
      console.log("Received response from Grok API:", response.data);
      
      if (response.data && response.data.status === 'success') {
        return {
          status: 'success',
          message: response.data.message,
          model: response.data.model
        };
      } else {
        console.warn("Unexpected response format from Grok API:", response.data);
        return {
          status: 'error',
          message: response.data.message || "Received an unexpected response format from the AI service.",
          model: 'grok-beta'
        };
      }
    } catch (error) {
      console.error('Failed to send message to Grok API:', error);
      
      // Provide a more helpful error message
      let errorMessage = "Failed to connect to the AI service.";
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        errorMessage = `Server error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`;
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = "No response received from the AI service. Please check your connection.";
      } else {
        // Something happened in setting up the request that triggered an Error
        errorMessage = `Error: ${error.message}`;
      }
      
      throw new Error(errorMessage);
    }
  },

  // Admin API functions
  getCourses: async () => {
    try {
      const response = await nodeAxiosInstance.get('/courses');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      throw error;
    }
  },

  addCourse: async (courseData: { name: string }) => {
    try {
      const response = await nodeAxiosInstance.post('/courses', courseData);
      return response.data;
    } catch (error) {
      console.error('Failed to add course:', error);
      throw error;
    }
  },

  getLessons: async () => {
    try {
      const response = await nodeAxiosInstance.get('/lessons');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch lessons:', error);
      throw error;
    }
  },

  addLesson: async (lessonData: { 
    lesson_name: string; 
    course_id: number; 
    week_id: number; 
    day_id: number; 
    file_path: string;
  }) => {
    try {
      const response = await nodeAxiosInstance.post('/lessons', lessonData);
      return response.data;
    } catch (error) {
      console.error('Failed to add lesson:', error);
      throw error;
    }
  },

  getUsers: async () => {
    try {
      const response = await nodeAxiosInstance.get('/admin/students');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch users:', error);
      throw error;
    }
  },

  updateUserRole: async (userId: number, role: string) => {
    try {
      const response = await nodeAxiosInstance.put(`/admin/students/${userId}/role`, { role });
      return response.data;
    } catch (error) {
      console.error('Failed to update user role:', error);
      throw error;
    }
  },

  deleteUser: async (userId: number) => {
    try {
      const response = await nodeAxiosInstance.delete(`/admin/students/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete user:', error);
      throw error;
    }
  },

  // Functions to fetch weeks and days
  getWeeks: async () => {
    try {
      const response = await nodeAxiosInstance.get('/weeks');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch weeks:', error);
      throw error;
    }
  },

  getDays: async () => {
    try {
      const response = await nodeAxiosInstance.get('/days');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch days:', error);
      throw error;
    }
  },

  // Function to upload lesson file
  uploadLessonFile: async (formData: FormData) => {
    try {
      const response = await nodeAxiosInstance.post('/lessons', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to upload lesson file:', error);
      throw error;
    }
  },

  // Active users functions
  getActiveUsers: async () => {
    try {
      const response = await nodeAxiosInstance.get('/api/users/online');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch active users:', error);
      throw error;
    }
  },

  updateActiveStatus: async (active: boolean) => {
    try {
      const response = await nodeAxiosInstance.post('/api/users/active-status', { active });
      return response.data;
    } catch (error) {
      console.error('Failed to update active status:', error);
      throw error;
    }
  },

  logout: async (userId: string) => {
    try {
      await nodeAxiosInstance.post('/api/auth/logout', { userId });
      disconnectWebSocket();
      localStorage.removeItem('authToken');
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  },
};

// Helper function to process lessons data
function processLessonsData(lessons: any[]) {
  // Define interfaces for our data structure
  interface CourseItem {
    id: string;
    name: string;
    weeks: Map<string, WeekItem>;
  }

  interface WeekItem {
    id: string;
    name: string;
    lessons: LessonItem[];
  }

  interface LessonItem {
    id: string;
    name: string;
    time?: string;
  }

  // Group lessons by course, week, and day
  const courseMap = new Map<string, CourseItem>();

  // Process each lesson to build the course structure
  lessons.forEach(lesson => {
    const courseId = `course-${lesson.course_id || 'unknown'}`;
    const weekId = `week-${lesson.week_id || 'unknown'}`;
    const lessonId = `lesson-${lesson.id || 'unknown'}`;
    
    // Get or create course
    if (!courseMap.has(courseId)) {
      courseMap.set(courseId, {
        id: courseId,
        name: lesson.course_name || 'Unknown Course',
        weeks: new Map<string, WeekItem>()
      });
    }
    
    const course = courseMap.get(courseId) as CourseItem;
    
    // Get or create week
    if (!course.weeks.has(weekId)) {
      course.weeks.set(weekId, {
        id: weekId,
        name: lesson.week_name || `Week ${lesson.week_id || 'Unknown'}`,
        lessons: []
      });
    }
    
    // Add lesson to week
    const week = course.weeks.get(weekId) as WeekItem;
    week.lessons.push({
      id: lessonId,
      name: lesson.lesson_name || `Lesson ${lesson.id || 'Unknown'}`,
      time: `Lesson ${lesson.id}`
    });
  });

  // Convert to array format expected by the frontend
  const result = Array.from(courseMap.values()).map(course => {
    return {
      id: course.id,
      name: course.name,
      weeks: Array.from(course.weeks.values()).map(week => {
        return {
          id: week.id,
          name: week.name,
          lessons: week.lessons
        };
      })
    };
  });

  return result;
}
