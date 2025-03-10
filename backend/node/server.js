import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pdfIntegration from './pdf_integration.js';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import adminRoutes from './routes/admin.js';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Configure CORS
app.use(cors({
  origin: 'http://localhost:5173', // Vite's default dev server port
  credentials: true
}));

app.use(express.json());

// Initialize WebSocket server with proper configuration
const wss = new WebSocketServer({
  server: httpServer,
  path: '/ws',
  clientTracking: true,
  // Add WebSocket server options
  verifyClient: (info, callback) => {
    // Allow all connections initially, authentication happens after connection
    callback(true);
  }
});

// Store connected clients with their user info
const clients = new Map();

// Use port 8000 directly
const PORT = 8000;

// At the beginning of the file, check for required environment variables
if (!process.env.JWT_SECRET) {
  console.error('Warning: JWT_SECRET is not set. Using a fallback value for development only.');
  process.env.JWT_SECRET = 'fallback_jwt_secret_for_development_only';
}

// Validate database connection parameters
const dbHost = process.env.DB_HOST || 'localhost';
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbName = process.env.DB_NAME || 'aischool';

if (!dbUser || !dbPassword) {
  console.error('Error: DB_USER and DB_PASSWORD must be set in environment variables.');
  process.exit(1);
}

// Create a connection pool with validated parameters
const pool = mysql.createPool({
  host: dbHost,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// The pool is already promise-based since we're using mysql2/promise
const promisePool = pool;

console.log('Database configuration:', {
  host: dbHost,
  user: dbUser,
  database: dbName,
  hasPassword: !!dbPassword,
  connectionLimit: 10
});

// Function to initialize database
const initializeDatabase = async () => {
  try {
    // Create database if it doesn't exist
    await promisePool.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'aischool'}`);
    console.log('Database initialized');

    // Create users table if it doesn't exist
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        surname VARCHAR(255),
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('user', 'lead_student', 'admin') DEFAULT 'user',
        active BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Users table initialized');

    // Create courses table if it doesn't exist
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Courses table initialized');

    // Create weeks table if it doesn't exist
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS weeks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Weeks table initialized');

    // Create days table if it doesn't exist
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS days (
        id INT AUTO_INCREMENT PRIMARY KEY,
        day_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Days table initialized');

    // Create lessons table if it doesn't exist
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS lessons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lesson_name VARCHAR(255) NOT NULL,
        course_id INT,
        week_id INT,
        day_id INT,
        file_path VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id),
        FOREIGN KEY (week_id) REFERENCES weeks(id),
        FOREIGN KEY (day_id) REFERENCES days(id)
      )
    `);
    console.log('Lessons table initialized');

    // Create user_courses table if it doesn't exist
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS user_courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        course_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_course (user_id, course_id)
      )
    `);
    console.log('User courses table initialized');

    // Create lesson_progress table if it doesn't exist
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS lesson_progress (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        lesson_id INT NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_lesson (user_id, lesson_id)
      )
    `);
    console.log('Lesson progress table initialized');

    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

// Function to create test admin user
const createTestAdminUser = async () => {
  try {
    // Check if any users exist
    const [users] = await promisePool.query('SELECT COUNT(*) as count FROM users');
    if (users[0].count === 0) {
      console.log('No users found, creating test admin user...');
      
      // Create test admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await promisePool.query(
        'INSERT INTO users (username, surname, email, password, role) VALUES (?, ?, ?, ?, ?)',
        ['Admin', 'User', 'admin@example.com', hashedPassword, 'admin']
      );
      
      console.log('Test admin user created successfully');
      console.log('Email: admin@example.com');
      console.log('Password: admin123');
    }
  } catch (error) {
    console.error('Error creating test admin user:', error);
    throw error; // Ensure the error is thrown to be handled by the caller
  }
};

// Update the connectToDatabase function
const connectToDatabase = async () => {
  try {
    // Test the connection with a simple query
    const [results] = await promisePool.query('SELECT 1 + 1 AS result');
    console.log('Successfully connected to MySQL');
    console.log('Database test query successful:', results);
    
    // Initialize database and tables
    await initializeDatabase();
    
    // Ensure required tables exist and have correct structure
    await ensureTablesExist();
    
    // Create test admin user if no users exist
    await createTestAdminUser();
    
    return true;
  } catch (error) {
    console.error('Database connection error:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      stack: error.stack
    });
    
    // Check for specific error types and provide more helpful messages
    if (error.code === 'ECONNREFUSED') {
      console.error('Could not connect to MySQL server. Please check if the server is running and the connection details are correct.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Access denied to MySQL. Please check your username and password.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error(`Database '${dbName}' does not exist. It will be created automatically.`);
      // Try to create the database
      try {
        const tempPool = mysql.createPool({
          host: dbHost,
          user: dbUser,
          password: dbPassword,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
        });
        const tempPromisePool = tempPool.promise();
        await tempPromisePool.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
        console.log(`Database '${dbName}' created successfully.`);
        // Try connecting again
        return connectToDatabase();
      } catch (createError) {
        console.error('Failed to create database:', createError);
      }
    }
    
    throw error; // Ensure the error is thrown to be handled by the caller
  }
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Database check endpoint
app.get('/api/db-check', async (req, res) => {
  try {
    console.log('Running database check...');
    
    // Check database connection
    const [connectionTest] = await promisePool.query('SELECT 1 + 1 AS result');
    console.log('Database connection test:', connectionTest);
    
    // Check if lessons table exists
    const [tablesCheck] = await promisePool.query('SHOW TABLES');
    const tables = tablesCheck.map(row => Object.values(row)[0]);
    console.log('Tables in database:', tables);
    
    // Use the utility function to ensure tables exist
    await ensureTablesExist();
    
    // Get the current structure of the lessons table
    const [lessonsStructure] = await promisePool.query('DESCRIBE lessons');
    
    // Check related tables
    const relatedTables = ['courses', 'weeks', 'days'];
    const relatedTablesStatus = {};
    
    for (const table of relatedTables) {
      const exists = tables.includes(table);
      relatedTablesStatus[table] = { exists };
      
      if (exists) {
        const [count] = await promisePool.query(`SELECT COUNT(*) as count FROM ${table}`);
        relatedTablesStatus[table].count = count[0].count;
      }
    }
    
    sendSuccessResponse(res, {
      databaseConnection: true,
      tables,
      lessons: {
        exists: tables.includes('lessons'),
        structure: lessonsStructure
      },
      relatedTables: relatedTablesStatus
    }, 'Database check completed successfully');
  } catch (error) {
    console.error('Database check error:', error);
    sendErrorResponse(res, 500, 'Database check failed', error);
  }
});

// Configure rate limiters for sensitive endpoints
const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window (increased from 15 minutes)
  max: 100, // Increased from 30 to 100 attempts
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true, // Don't count failed requests
  skipSuccessfulRequests: true, // Don't count successful logins
  message: {
    status: 'error',
    code: 429,
    message: 'Too many login attempts',
    details: 'Please wait before trying again or contact support if you need immediate assistance.',
    remainingTime: 'Try again in a few minutes'
  }
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Increased from 5 to 20
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    code: 429,
    message: 'Too many registration attempts',
    details: 'Please try again later'
  }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased from 100 to 500
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    code: 429,
    message: 'Too many requests',
    details: 'Please try again later'
  }
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Mount admin routes
app.use('/api/admin', adminRoutes);

// User login endpoint
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return sendErrorResponse(res, 400, 'Email and password are required');
    }
    
    // Find user by email
    const [users] = await promisePool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    // Check if user exists
    if (users.length === 0) {
      return sendErrorResponse(res, 401, 'Invalid email or password');
    }
    
    const user = users[0];
    
    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return sendErrorResponse(res, 401, 'Invalid email or password');
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'fallback_jwt_secret_for_development_only',
      { expiresIn: '24h' }
    );
    
    // Update user's active status
    await promisePool.query(
      'UPDATE users SET active = ? WHERE id = ?',
      [user.active ? 1 : 0, user.id]
    );
    // Return user data and token
    sendSuccessResponse(res, {
      user: {
        id: user.id,
        username: user.username,
        surname: user.surname,
        email: user.email,
        role: user.role || 'user'
      },
      token
    }, 'Login successful');
  } catch (error) {
    console.error('Login error:', error);
    sendErrorResponse(res, 500, 'Server error during login', error);
  }
});

// User registration endpoint
app.post('/api/auth/register', registrationLimiter, async (req, res) => {
  try {
    const { username, surname, email, password } = req.body;
    
    // Validate input
    if (!username || !email || !password) {
      return sendErrorResponse(res, 400, 'Username, email, and password are required');
    }
    
    // Check if email already exists
    const [existingUsers] = await promisePool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUsers.length > 0) {
      return sendErrorResponse(res, 409, 'Email already in use');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert new user
    const [result] = await promisePool.query(
      'INSERT INTO users (username, surname, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [username, surname || '', email, hashedPassword, 'user']
    );
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: result.insertId, role: 'user' },
      process.env.JWT_SECRET || 'fallback_jwt_secret_for_development_only',
      { expiresIn: '24h' }
    );
    
    // Return user data and token
    sendSuccessResponse(res, {
      user: {
        id: result.insertId,
        username,
        surname: surname || '',
        email,
        role: 'user'
      },
      token
    }, 'Registration successful');
  } catch (error) {
    console.error('Registration error:', error);
    sendErrorResponse(res, 500, 'Server error during registration', error);
  }
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendErrorResponse(res, 401, 'No token provided');
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_jwt_secret_for_development_only');
    // Set the decoded token data directly as req.user
    req.user = {
      userId: decoded.userId,
      role: decoded.role // Make sure to include the role
    };
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return sendErrorResponse(res, 401, 'Invalid token', error);
  }
};

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId) {
      return sendErrorResponse(res, 401, 'User not authenticated');
    }

    const [user] = await promisePool.query(
      'SELECT role FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (user.length === 0 || user[0].role !== 'admin') {
      return sendErrorResponse(res, 403, 'Access denied. Admin privileges required.');
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return sendErrorResponse(res, 500, 'Server error during admin check', error);
  }
};

// Token verification endpoint
app.get('/api/auth/verify', verifyToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use the shared uploads directory
    const uploadDir = path.join(__dirname, '../../shared/uploads/pdfs');
    // Ensure the directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only PDF files
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  }
});

// Helper function for consistent error responses
const sendErrorResponse = (res, statusCode, message, error = null) => {
  const response = {
    status: 'error',
    message
  };
  
  // Include error details in development mode
  if (process.env.NODE_ENV !== 'production' && error) {
    response.error = error.message;
    response.stack = error.stack;
  }
  
  return res.status(statusCode).json(response);
};

// Helper function for consistent success responses
const sendSuccessResponse = (res, data, message = 'Success') => {
  return res.status(200).json({
    status: 'success',
    message,
    data
  });
};

// API endpoints for course management
// Get all courses
app.get('/api/courses', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT id, name FROM courses ORDER BY name');
    sendSuccessResponse(res, rows, 'Courses retrieved successfully');
  } catch (error) {
    console.error('Error fetching courses:', error);
    sendErrorResponse(res, 500, 'Failed to fetch courses', error);
  }
});

// Create a new course
app.post('/api/courses', verifyToken, isAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return sendErrorResponse(res, 400, 'Course name is required');
    }
    
    const [result] = await promisePool.query(
      'INSERT INTO courses (name) VALUES (?)',
      [name]
    );
    
    sendSuccessResponse(res, {
      id: result.insertId,
      name
    }, 'Course created successfully');
  } catch (error) {
    console.error('Error creating course:', error);
    sendErrorResponse(res, 500, 'Failed to create course', error);
  }
});

app.get('/api/weeks', async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      'SELECT id, name FROM weeks'
    );
    sendSuccessResponse(res, rows, 'Weeks retrieved successfully');
  } catch (error) {
    console.error('Error fetching weeks:', error);
    sendErrorResponse(res, 500, 'Failed to fetch weeks', error);
  }
});

// Get all days
app.get('/api/days', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM days');
    sendSuccessResponse(res, rows, 'Days retrieved successfully');
  } catch (error) {
    console.error('Error fetching days:', error);
    sendErrorResponse(res, 500, 'Failed to fetch days', error);
  }
});

// New endpoint to fetch lessons
app.get('/api/lessons', async (req, res) => {
  try {
    console.log('Fetching lessons from database...');
    
    // First check if we have any lessons
    const [countResult] = await promisePool.query('SELECT COUNT(*) as count FROM lessons');
    console.log('Total lessons in database:', countResult[0].count);
    
    // Check if we have courses
    const [coursesResult] = await promisePool.query('SELECT COUNT(*) as count FROM courses');
    console.log('Total courses in database:', coursesResult[0].count);
    
    // Check if we have weeks
    const [weeksResult] = await promisePool.query('SELECT COUNT(*) as count FROM weeks');
    console.log('Total weeks in database:', weeksResult[0].count);
    
    // Check if we have days
    const [daysResult] = await promisePool.query('SELECT COUNT(*) as count FROM days');
    console.log('Total days in database:', daysResult[0].count);
    
    const [rows] = await promisePool.query(`
      SELECT l.id, l.lesson_name as title, l.course_id, l.week_id, l.day_id, 
             c.name as course_name, w.name as week_name, d.day_name as day_name
      FROM lessons l
      JOIN courses c ON l.course_id = c.id
      JOIN weeks w ON l.week_id = w.id
      JOIN days d ON l.day_id = d.id
      ORDER BY c.id, w.id, d.id
    `);
    
    console.log('Lessons retrieved:', rows.length);
    if (rows.length > 0) {
      console.log('Sample lesson:', rows[0]);
    }
    
    sendSuccessResponse(res, rows, 'Lessons retrieved successfully');
  } catch (error) {
    console.error('Error fetching lessons:', error);
    sendErrorResponse(res, 500, 'Failed to fetch lessons', error);
  }
});

// New endpoint to fetch lesson content by ID
app.get('/api/lessons/:id/content', async (req, res) => {
  try {
    const lessonId = req.params.id;
    
    // Get the lesson details including file path
    const [lessons] = await promisePool.query(
      'SELECT * FROM lessons WHERE id = ?',
      [lessonId]
    );
    
    if (lessons.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    
    const lesson = lessons[0];
    const filePath = lesson.file_path;
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Lesson file not found' });
    }
    
    // For PDF files, return file info but not the content
    if (filePath.toLowerCase().endsWith('.pdf')) {
      return res.json({
        id: lesson.id,
        title: lesson.lesson_name,
        fileType: 'pdf',
        fileName: path.basename(filePath)
      });
    }
    
    // For non-PDF files, return the content as before
    const fileContent = fs.readFileSync(filePath, 'utf8');
    sendSuccessResponse(res, {
      id: lesson.id,
      title: lesson.lesson_name,
      content: fileContent,
      fileType: path.extname(filePath).substring(1) || 'txt',
      fileName: path.basename(filePath)
    }, 'Lesson content retrieved successfully');
  } catch (error) {
    console.error('Error fetching lesson content:', error);
    sendErrorResponse(res, 500, 'Failed to fetch lesson content', error);
  }
});

// Upload lesson with materials - Simplified approach
app.post('/api/lessons', (req, res) => {
  console.log('Received lesson upload request');
  console.log('Request headers:', req.headers);
  
  // Use single middleware function for file upload
  upload.array('files', 10)(req, res, async function(err) {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ message: 'File upload error', error: err.message });
    }
    
    console.log('Files received:', req.files?.length || 0);
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        console.log(`File ${index + 1}:`, {
          originalname: file.originalname,
          filename: file.filename,
          path: file.path,
          mimetype: file.mimetype,
          size: file.size
        });
      });
    } else {
      console.error('No files were received by multer');
      // Check if files field exists in the request
      console.log('Request body keys:', Object.keys(req.body));
      console.log('Request files field:', req.body.files);
      console.log('Request content-type:', req.headers['content-type']);
      
      // Check if the request is multipart/form-data
      if (!req.headers['content-type'] || !req.headers['content-type'].includes('multipart/form-data')) {
        return res.status(400).json({
          message: 'Invalid content type',
          expected: 'multipart/form-data',
          received: req.headers['content-type']
        });
      }
    }
    
    console.log('Body fields:', req.body);
    
    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      console.error('No files were uploaded');
      return res.status(400).json({ 
        message: 'Missing required fields', 
        missingFields: ['files'] 
      });
    }
    
    const { courseId, weekId, dayId, title } = req.body;
    
    // Validate other required fields
    const missingFields = [];
    if (!courseId) missingFields.push('courseId');
    if (!weekId) missingFields.push('weekId');
    if (!dayId) missingFields.push('dayId');
    if (!title) missingFields.push('title');
    
    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields);
      return res.status(400).json({ 
        message: 'Missing required fields', 
        missingFields 
      });
    }
    
    // Convert IDs to integers
    const courseIdInt = parseInt(courseId, 10);
    const weekIdInt = parseInt(weekId, 10);
    const dayIdInt = parseInt(dayId, 10);
    
    if (isNaN(courseIdInt) || isNaN(weekIdInt) || isNaN(dayIdInt)) {
      return res.status(400).json({ 
        message: 'Invalid ID values', 
        details: {
          courseId: isNaN(courseIdInt) ? 'Invalid' : 'Valid',
          weekId: isNaN(weekIdInt) ? 'Invalid' : 'Valid',
          dayId: isNaN(dayIdInt) ? 'Invalid' : 'Valid'
        }
      });
    }
    
    let connection;
    try {
      // Ensure required tables exist
      await ensureTablesExist();
      
      // Check if the related tables exist and have data
      try {
        const relatedTables = ['courses', 'weeks', 'days'];
        for (const table of relatedTables) {
          const [tableCheck] = await promisePool.query(`SHOW TABLES LIKE '${table}'`);
          if (tableCheck.length === 0) {
            console.error(`ERROR: ${table} table does not exist!`);
            return res.status(500).json({
              message: 'Database error',
              error: `${table} table does not exist`
            });
          }
          
          // Check if the ID exists in the related table
          let idToCheck;
          let columnName;
          
          if (table === 'courses') {
            idToCheck = courseIdInt;
            columnName = 'id';
          } else if (table === 'weeks') {
            idToCheck = weekIdInt;
            columnName = 'id';
          } else if (table === 'days') {
            idToCheck = dayIdInt;
            columnName = 'id';
          }
          
          const [idCheck] = await promisePool.query(
            `SELECT * FROM ${table} WHERE ${columnName} = ?`,
            [idToCheck]
          );
          
          if (idCheck.length === 0) {
            console.error(`ERROR: ${table} with ID ${idToCheck} does not exist!`);
            return res.status(500).json({
              message: 'Database error',
              error: `${table} with ID ${idToCheck} does not exist`
            });
          }
        }
      } catch (relatedTableError) {
        console.error('Error checking related tables:', relatedTableError);
        return res.status(500).json({
          message: 'Database error',
          error: 'Failed to check related tables',
          details: relatedTableError.message
        });
      }
      
      // Get a connection from the pool for transaction
      connection = await promisePool.getConnection();
      
      // Start transaction
      await connection.beginTransaction();
      
      // Process each file as a separate lesson
      for (const file of req.files) {
        console.log(`Processing file for database insertion:`, {
          originalname: file.originalname,
          path: file.path
        });
        
        try {
          // Normalize the file path for database storage
          const normalizedPath = file.path.replace(/\\/g, '/');
          console.log(`Normalized file path: ${normalizedPath}`);
          
          // Insert lesson with the new table structure
          const [result] = await connection.query(
            'INSERT INTO lessons (course_id, week_id, day_id, lesson_name, file_path) VALUES (?, ?, ?, ?, ?)',
            [
              courseIdInt,
              weekIdInt,
              dayIdInt,
              title,
              normalizedPath // Save the normalized file path in the database
            ]
          );
          
          console.log(`Lesson record inserted for file: ${file.originalname}`, {
            insertId: result.insertId,
            affectedRows: result.affectedRows
          });
        } catch (insertError) {
          console.error(`Error inserting lesson for file ${file.originalname}:`, {
            error: insertError.message,
            code: insertError.code,
            sqlMessage: insertError.sqlMessage,
            sql: insertError.sql
          });
          throw insertError; // Re-throw to trigger rollback
        }
      }
      
      await connection.commit();
      console.log('Transaction committed successfully');
      
      res.status(201).json({ 
        message: 'Lesson uploaded successfully',
        fileCount: req.files.length
      });
    } catch (error) {
      console.error('Database error:', {
        message: error.message,
        code: error.code,
        sqlMessage: error.sqlMessage,
        sql: error.sql,
        stack: error.stack
      });
      
      if (connection) {
        try {
          await connection.rollback();
          console.log('Transaction rolled back due to error');
        } catch (rollbackError) {
          console.error('Error during rollback:', rollbackError);
        } finally {
          connection.release(); // Release the connection back to the pool
        }
      }
      
      res.status(500).json({ 
        message: 'Failed to upload lesson',
        error: error.message,
        sqlError: error.sqlMessage
      });
    }
  });
});

// New endpoint for uploading and processing PDF lessons
app.post('/api/lessons/pdf', (req, res) => {
  console.log('Received PDF lesson upload request');
  
  // Use single middleware function for file upload
  upload.single('pdfFile')(req, res, async function(err) {
    if (err) {
      console.error('Multer error:', err);
      return sendErrorResponse(res, 400, 'File upload error', err);
    }
    
    console.log('File received:', req.file);
    if (!req.file) {
      console.error('No file was uploaded');
      return sendErrorResponse(res, 400, 'Missing required file', { missingFields: ['pdfFile'] });
    }
    
    const { courseId, weekId, dayId, title } = req.body;
    
    // Validate other required fields
    const missingFields = [];
    if (!courseId) missingFields.push('courseId');
    if (!weekId) missingFields.push('weekId');
    if (!dayId) missingFields.push('dayId');
    if (!title) missingFields.push('title');
    
    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields);
      return sendErrorResponse(res, 400, 'Missing required fields', { missingFields });
    }
    
    // Convert IDs to integers
    const courseIdInt = parseInt(courseId, 10);
    const weekIdInt = parseInt(weekId, 10);
    const dayIdInt = parseInt(dayId, 10);
    
    if (isNaN(courseIdInt) || isNaN(weekIdInt) || isNaN(dayIdInt)) {
      return sendErrorResponse(res, 400, 'Invalid ID values', {
        details: {
          courseId: isNaN(courseIdInt) ? 'Invalid' : 'Valid',
          weekId: isNaN(weekIdInt) ? 'Invalid' : 'Valid',
          dayId: isNaN(dayIdInt) ? 'Invalid' : 'Valid'
        }
      });
    }
    
    try {
      // Process the PDF file
      const result = await pdfIntegration.processAndAddLesson(req.file.path, {
        title,
        courseId: courseIdInt,
        weekId: weekIdInt,
        dayId: dayIdInt
      });
      
      sendSuccessResponse(res, result, 'Lesson uploaded successfully');
    } catch (error) {
      console.error('Error processing PDF:', error);
      sendErrorResponse(res, 500, 'Failed to process PDF', error);
    }
  });
});

// Endpoint to download lesson file
app.get('/api/lessons/:id/download', async (req, res) => {
  try {
    const lessonId = req.params.id;
    
    const [lessons] = await promisePool.query(
      'SELECT * FROM lessons WHERE id = ?',
      [lessonId]
    );
    
    if (lessons.length === 0) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    
    const lesson = lessons[0];
    const filePath = lesson.file_path;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Lesson file not found' });
    }

    // Important: Set these headers to display PDF inline
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');  // This is crucial - 'inline' instead of 'attachment'
    res.setHeader('Accept-Ranges', 'bytes');
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error('Error streaming PDF:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream PDF' });
      }
    });
  } catch (error) {
    console.error('Error serving PDF:', error);
    res.status(500).json({ error: 'Failed to serve PDF' });
  }
});

// Function to broadcast active users to all connected clients
async function broadcastActiveUsers() {
  try {
    // Fetch all active users from the database
    const [activeUsers] = await promisePool.query(
      'SELECT id, username, surname, role, active FROM users WHERE active = 1'
    );
    
    console.log('Broadcasting active users:', activeUsers);
    
    const message = JSON.stringify({
      type: 'active_users_update',
      users: activeUsers
    });

    // Send to all connected clients
    for (const client of clients.values()) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  } catch (error) {
    console.error('Error broadcasting active users:', error);
  }
}

// Handle WebSocket connections
wss.on('connection', async (ws, req) => {
  console.log('New WebSocket connection established');
  
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received WebSocket message:', data);

      if (data.type === 'authenticate') {
        const userId = data.userId;
        if (!userId) {
          console.error('Authentication failed: No user ID provided');
          return;
        }

        // Store client connection with user info
        clients.set(userId, ws);
        console.log(`User ${userId} authenticated via WebSocket`);

        try {
          // Update user's active status in database
          await promisePool.query(
            'UPDATE users SET active = 1 WHERE id = ?',
            [userId]
          );

          // Broadcast updated active users list to all clients
          await broadcastActiveUsers();
        } catch (error) {
          console.error('Database error during authentication:', error);
        }
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });

  ws.on('close', async () => {
    console.log('WebSocket connection closed');
    
    // Find and remove the disconnected client
    for (const [userId, client] of clients.entries()) {
      if (client === ws) {
        console.log(`User ${userId} disconnected`);
        
        try {
          // Update user's active status in database
          await promisePool.query(
            'UPDATE users SET active = 0 WHERE id = ?',
            [userId]
          );

          // Remove from clients map
          clients.delete(userId);

          // Broadcast updated active users list to all clients
          await broadcastActiveUsers();
        } catch (error) {
          console.error('Database error during disconnection:', error);
        }
        break;
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Ping all clients every 30 seconds to keep connections alive and verify active status
const pingInterval = setInterval(async () => {
  try {
    // Check each client's connection
    for (const [userId, ws] of clients.entries()) {
      if (ws.isAlive === false) {
        console.log(`Terminating inactive connection for user ${userId}`);
        await promisePool.query(
          'UPDATE users SET active = 0 WHERE id = ?',
          [userId]
        );
        clients.delete(userId);
        ws.terminate();
        continue;
      }
      
      ws.isAlive = false;
      ws.ping();
    }

    // Broadcast updated active users list
    await broadcastActiveUsers();
  } catch (error) {
    console.error('Error in ping interval:', error);
  }
}, 30000);

// Clean up interval on server shutdown
wss.on('close', () => {
  clearInterval(pingInterval);
});

// Start the server
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  console.log(`WebSocket server available at ws://localhost:${PORT}/ws`);
  
  // Initialize the database
  connectToDatabase()
    .then(() => {
      console.log('Database connected successfully');
      ensureTablesExist()
        .then(() => {
          console.log('Database tables verified');
        })
        .catch(err => {
          console.error('Error ensuring tables exist:', err);
        });
    })
    .catch(err => {
      console.error('Failed to connect to database:', err);
    });
});

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Function to ensure required tables exist
const ensureTablesExist = async () => {
  try {
    // Create users table if it doesn't exist
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        surname VARCHAR(255),
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('user', 'lead_student', 'admin') DEFAULT 'user',
        active BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Users table verified');

    // Create courses table if it doesn't exist
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Courses table verified');

    // Create weeks table if it doesn't exist
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS weeks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Weeks table verified');

    // Create days table if it doesn't exist
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS days (
        id INT AUTO_INCREMENT PRIMARY KEY,
        day_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Days table verified');

    // Create lessons table if it doesn't exist
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS lessons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lesson_name VARCHAR(255) NOT NULL,
        course_id INT,
        week_id INT,
        day_id INT,
        file_path VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (week_id) REFERENCES weeks(id) ON DELETE CASCADE,
        FOREIGN KEY (day_id) REFERENCES days(id) ON DELETE CASCADE
      )
    `);
    console.log('Lessons table verified');

    // Create user_courses table if it doesn't exist
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS user_courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        course_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_course (user_id, course_id)
      )
    `);
    console.log('User courses table verified');

    // Create lesson_progress table if it doesn't exist
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS lesson_progress (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        lesson_id INT NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_lesson (user_id, lesson_id)
      )
    `);
    console.log('Lesson progress table verified');

    return true;
  } catch (error) {
    console.error('Error ensuring tables exist:', error);
    throw error;
  }
}; 