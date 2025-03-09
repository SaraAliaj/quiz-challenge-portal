import axios from 'axios';

// Create an axios instance with a base URL
const axiosInstance = axios.create({
  baseURL: 'http://localhost:8000/api',  // Point to the Python backend
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: false // Don't use credentials for CORS
});

// Add a request interceptor to include the auth token in all requests
axiosInstance.interceptors.request.use(
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
      // For development, provide more detailed error information
      if (process.env.NODE_ENV === 'development') {
        throw new Error(`Network error - please check if the backend server is running. Details: ${error.message}`);
      } else {
        throw new Error('Network error - please check your connection');
      }
    }

    throw error;
  }
);

const api = {
  login: async (email: string, password: string) => {
    try {
      console.log('Attempting login with:', { email });
      const response = await axiosInstance.post('/auth/login', { email, password });
      console.log('Login response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Login API error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  },

  register: async (userData: { username: string, surname: string, email: string, password: string }) => {
    try {
      console.log('Sending registration request');
      const response = await axiosInstance.post('/auth/register', userData);
      console.log('Registration response:', response.data);
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

  createCourse: async (name: string) => {
    try {
      const response = await axiosInstance.post('/courses', { name }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create course:', error);
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

  getLessons: async () => {
    try {
      const response = await axiosInstance.get('/lessons');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch lessons:', error);
      throw error;
    }
  },

  getLessonContent: async (lessonId: string) => {
    try {
      const response = await axiosInstance.get(`/lessons/${lessonId}/content`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch lesson content:', error);
      throw error;
    }
  },

  downloadLessonFile: (lessonId: string) => {
    // Return the URL for direct download
    return `${axiosInstance.defaults.baseURL}/lessons/${lessonId}/download`;
  },

  // New method to fetch the full course structure with weeks and lessons
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
      // Fetch lessons which include course, week, and day information
      console.log('Fetching course structure from API...');
      const lessonsResponse = await axiosInstance.get('/lessons');
      console.log('Raw lessons response:', lessonsResponse);
      
      // The response format is { status, message, data }
      const lessons = (lessonsResponse.data.data || []) as ApiLesson[];
      console.log('Extracted lessons data:', lessons);

      if (!lessons || lessons.length === 0) {
        console.warn('No lessons data returned from API');
        return [];
      }

      // Group lessons by course, week, and day
      const courseMap = new Map<string, CourseMapItem>();

      // Process each lesson to build the course structure
      lessons.forEach(lesson => {
        console.log('Processing lesson:', lesson);
        
        // Ensure all required fields are present
        if (!lesson.course_id || !lesson.week_id || !lesson.id) {
          console.warn('Lesson missing required fields:', lesson);
          return; // Skip this lesson
        }
        
        const courseId = lesson.course_id.toString();
        const weekId = lesson.week_id.toString();
        const dayId = lesson.day_id ? lesson.day_id.toString() : '0';
        
        // Initialize course if not exists
        if (!courseMap.has(courseId)) {
          courseMap.set(courseId, {
            id: courseId,
            name: lesson.course_name || `Course ${courseId}`,
            weeks: new Map<string, WeekMapItem>()
          });
        }
        
        const course = courseMap.get(courseId)!;
        
        // Initialize week if not exists
        if (!course.weeks.has(weekId)) {
          course.weeks.set(weekId, {
            id: weekId,
            name: lesson.week_name || `Week ${weekId}`,
            lessons: []
          });
        }
        
        // Add lesson to week
        const week = course.weeks.get(weekId)!;
        week.lessons.push({
          id: lesson.id.toString(),
          name: lesson.lesson_name || `Lesson ${lesson.id}`,
          time: lesson.day_name || `Day ${dayId}`
        });
      });
      
      // Convert maps to arrays for easier consumption
      const courses = Array.from(courseMap.values()).map(course => {
        return {
          id: course.id,
          name: course.name,
          weeks: Array.from(course.weeks.values()).map(week => {
            return {
              id: week.id,
              name: week.name,
              lessons: [...week.lessons].sort((a, b) => {
                // Try to extract day numbers from time strings
                const dayA = a.time?.match(/Day (\d+)/)?.[1] || a.time || '';
                const dayB = b.time?.match(/Day (\d+)/)?.[1] || b.time || '';
                return dayA.localeCompare(dayB);
              })
            };
          })
        };
      });
      
      console.log('Processed course structure:', courses);
      return courses;
    } catch (error) {
      console.error('Failed to fetch course structure:', error);
      // Return empty array in case of error
      return [];
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
  },

  // New method to upload a PDF file as a lesson
  uploadPDFLesson: async (formData: FormData) => {
    try {
      console.log('Starting PDF lesson upload request');
      
      // Log FormData entries for debugging
      console.log('FormData entries:');
      for (const pair of (formData as any).entries()) {
        const [key, value] = pair;
        if (key === 'pdfFile') {
          console.log(`File entry: ${key}, filename: ${value instanceof File ? value.name : 'not a file'}`);
        } else {
          console.log(`Form field: ${key}=${value}`);
        }
      }
      
      // Create a separate axios instance without auth interceptors for this request
      const noAuthAxios = axios.create({
        baseURL: '/api',
        timeout: 120000, // Increase timeout for PDF processing (120 seconds)
        withCredentials: true
      });
      
      console.log('Sending POST request to /lessons/pdf');
      
      // Use the original FormData directly
      const response = await noAuthAxios.post('/lessons/pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      
      console.log('PDF lesson upload successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to upload PDF lesson:', error);
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
  },

  // New methods for student management
  getStudents: async () => {
    try {
      const response = await axiosInstance.get('/admin/students');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch students:', error);
      throw error;
    }
  },

  updateStudentRole: async (userId: string) => {
    try {
      const response = await axiosInstance.put(`/admin/students/${userId}/role`);
      return response.data;
    } catch (error) {
      console.error('Failed to update student role:', error);
      throw error;
    }
  },

  // Get lesson status
  getLessonStatus: async (lessonId: string) => {
    try {
      const response = await axiosInstance.get(`/lessons/${lessonId}/status`);
      return response.data;
    } catch (error) {
      console.error('Error getting lesson status:', error);
      throw error;
    }
  },
  
  // Get lesson PDF URL
  getLessonPdf: async (lessonId: string) => {
    try {
      const response = await axiosInstance.get(`/lessons/${lessonId}/pdf`);
      return response.data;
    } catch (error) {
      console.error('Error getting lesson PDF:', error);
      throw error;
    }
  },
};
export { api };
