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

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Initialize WebSocket server with a specific path
const wss = new WebSocketServer({ 
  server: httpServer,
  path: '/ws'
});

// Store connected clients
const clients = new Map();

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

// Configure CORS
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON bodies
app.use(express.json());

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

// Create a promise-based wrapper for the pool
const promisePool = pool.promise();

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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many login attempts from this IP, please try again after 15 minutes'
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 registration attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many accounts created from this IP, please try again after an hour'
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

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

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  
  // Handle messages from clients
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Handle authentication
      if (data.type === 'authenticate' && data.userId) {
        // Store the client with their user ID
        clients.set(data.userId, ws);
        console.log(`User ${data.userId} authenticated via WebSocket`);
        
        // Send active users to the newly connected client
        sendActiveUsers();
      }
      
      // Handle lesson start
      if (data.type === 'startLesson') {
        console.log('Lesson start request received:', data);
        
        // Broadcast lesson started notification to all clients
        const lessonStartedMessage = JSON.stringify({
          type: 'lessonStarted',
          lessonId: data.lessonId,
          lessonName: data.lessonName,
          teacherName: data.teacherName,
          duration: data.duration,
          startTime: new Date()
        });
        
        for (const client of clients.values()) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(lessonStartedMessage);
          }
        }
        
        // Store the lesson status in the database
        promisePool.query(
          'INSERT INTO lesson_sessions (lesson_id, started_by, duration, start_time) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE duration = ?, start_time = NOW()',
          [data.lessonId, data.userId || null, data.duration, data.duration]
        ).catch(err => {
          console.error('Error storing lesson session:', err);
        });
      }
      
      // Handle lesson end
      if (data.type === 'endLesson') {
        console.log('Lesson end request received:', data);
        
        // Broadcast lesson ended notification to all clients
        const lessonEndedMessage = JSON.stringify({
          type: 'lessonEnded',
          lessonId: data.lessonId,
          teacherName: data.teacherName
        });
        
        for (const client of clients.values()) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(lessonEndedMessage);
          }
        }
        
        // Update the lesson status in the database
        promisePool.query(
          'UPDATE lesson_sessions SET end_time = NOW() WHERE lesson_id = ? AND end_time IS NULL',
          [data.lessonId]
        ).catch(err => {
          console.error('Error updating lesson session:', err);
        });
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });
  
  // Handle disconnection
  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
    
    // Remove client from the map
    for (const [userId, client] of clients.entries()) {
      if (client === ws) {
        clients.delete(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
    
    // Send updated active users list to all clients
    sendActiveUsers();
  });
});

// Function to send active users to all connected clients
function sendActiveUsers() {
  // Get all active users from the database
  promisePool.query('SELECT id, username, role, active FROM users WHERE active = TRUE')
    .then(([rows]) => {
      const activeUsers = rows.map(user => ({
        id: user.id.toString(),
        username: user.username,
        role: user.role,
        Active: user.active
      }));
      
      // Broadcast to all connected clients
      const message = JSON.stringify({
        type: 'active_users_update',
        users: activeUsers
      });
      
      for (const client of clients.values()) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      }
    })
    .catch(error => {
      console.error('Error fetching active users:', error);
    });
}

// Start the server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  console.log(`WebSocket server available at ws://localhost:${PORT}/ws`);
  
  // Log the available routes for debugging
  console.log('\nAvailable API Routes:');
  console.log('- GET /api/lessons/deep-learning/pdf');
  console.log('- POST /api/lessons/deep-learning/chat');
  
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

// Admin routes
app.get('/api/admin/users', verifyToken, isAdmin, async (req, res) => {
  try {
    const [users] = await promisePool.query(
      'SELECT id, username, email, role FROM users'
    );
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get all users
app.get('/api/admin/students', verifyToken, isAdmin, async (req, res) => {
  try {
    console.log('Fetching all users...');
    
    // First check if users table exists and has data
    const [tableCheck] = await promisePool.query('SHOW TABLES LIKE "users"');
    if (tableCheck.length === 0) {
      console.error('Users table does not exist!');
      return res.status(500).json({ message: 'Users table does not exist' });
    }

    // Check total number of users
    const [countResult] = await promisePool.query('SELECT COUNT(*) as count FROM users');
    console.log(`Total users in database: ${countResult[0].count}`);

    // Log the table structure
    const [tableStructure] = await promisePool.query('DESCRIBE users');
    console.log('Users table structure:', tableStructure);

    // Get all users with detailed logging
    const [users] = await promisePool.query(`
      SELECT 
        id,
        username,
        surname,
        email,
        role
      FROM users 
      ORDER BY username
    `);

    console.log('Raw users data:', users);
    console.log(`Found ${users.length} users`);
    
    // Log each user's data
    users.forEach(user => {
      console.log('User:', {
        id: user.id,
        username: user.username,
        surname: user.surname,
        email: user.email,
        role: user.role
      });
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

// Update user role to lead_student
app.put('/api/admin/students/:id/role', verifyToken, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // First check if the user exists and get their current role
    const [userCheck] = await promisePool.query(
      'SELECT role FROM users WHERE id = ?',
      [userId]
    );

    if (userCheck.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentRole = userCheck[0].role;
    console.log(`Current role for user ${userId}: ${currentRole}`);

    // Update the role to lead_student
    const [result] = await promisePool.query(
      'UPDATE users SET role = "lead_student" WHERE id = ?',
      [userId]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ message: 'Failed to update user role' });
    }

    console.log(`Successfully updated role for user ${userId} from ${currentRole} to lead_student`);
    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ 
      message: 'Failed to update user role',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Test endpoint to create a test user
app.post('/api/test/create-user', async (req, res) => {
  try {
    // Check if users table exists
    const [tableCheck] = await promisePool.query('SHOW TABLES LIKE "users"');
    if (tableCheck.length === 0) {
      console.error('Users table does not exist!');
      return res.status(500).json({ message: 'Users table does not exist' });
    }

    // Create test user
    const [result] = await promisePool.query(
      'INSERT INTO users (username, surname, email, password, role) VALUES (?, ?, ?, ?, ?)',
      ['Test', 'User', 'test@example.com', await bcrypt.hash('password123', 10), 'user']
    );

    console.log('Test user created successfully:', result.insertId);
    res.json({ message: 'Test user created successfully', userId: result.insertId });
  } catch (error) {
    console.error('Error creating test user:', error);
    res.status(500).json({ 
      message: 'Failed to create test user',
      error: error.message
    });
  }
});

// Add a logout endpoint to update active status
app.post('/api/auth/logout', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    console.log('Logging out user:', userId);
    
    // Update user's active status to false
    await promisePool.query(
      'UPDATE users SET active = FALSE WHERE id = ?',
      [userId]
    );

    // Get user info for the socket event
    const [userRows] = await promisePool.query(
      'SELECT username, surname FROM users WHERE id = ?',
      [userId]
    );

    if (userRows.length > 0) {
      // Emit socket event for online status update
      console.log('Emitting user_status_change event for user:', userId, 'to inactive');
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'user_status_change',
            userId,
            username: userRows[0].username,
            surname: userRows[0].surname,
            active: false
          }));
        }
      });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Modify the online users endpoint
app.get('/api/users/online', async (req, res) => {
  try {
    console.log('Fetching online users');
    
    // Get all users where active = true
    const [rows] = await promisePool.query(
      `SELECT id, username, surname, role, active 
       FROM users 
       WHERE active = TRUE
       ORDER BY 
         CASE WHEN role = 'lead_student' THEN 0 ELSE 1 END,
         username`
    );
    
    console.log('Online users found:', rows.length);
    console.log('Online users:', rows);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Chat route handler
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // For now, we'll use a simple response. Later, you can integrate with an AI service
    const response = {
      response: `I received your message: "${message}". I'm a simple echo bot for now, but I'll be smarter soon!`
    };
    res.json(response);
  } catch (error) {
    console.error('Error handling chat:', error);
    res.status(500).json({ error: 'Failed to handle chat' });
  }
});

// User active status endpoint
app.post('/api/users/active-status', verifyToken, async (req, res) => {
  try {
    const { active } = req.body;
    const userId = req.user.id;
    
    // Update user's active status in the database
    await promisePool.query(
      'UPDATE users SET active = ?, active = NOW() WHERE id = ?',
      [active, userId]
    );
    
    // If the user is becoming active, emit an event to all clients
    if (active) {
      // Get user info for the socket event
      const [userRows] = await promisePool.query(
        'SELECT id, username, role FROM users WHERE id = ?',
        [userId]
      );
      
      if (userRows.length > 0) {
        const user = userRows[0];
        
        // Emit event to all clients about the new active user
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'user_active',
              id: user.id,
              username: user.username,
              role: user.role,
              Active: new Date()
            }));
          }
        });
      }
    } else {
      // If the user is becoming inactive, emit an event to all clients
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'user_inactive',
            userId
          }));
        }
      });
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating active status:', error);
    res.status(500).json({ error: 'Failed to update active status' });
  }
});

// Get all active users endpoint
app.get('/api/users/active', verifyToken, async (req, res) => {
  try {
    const [activeUsers] = await promisePool.query(
      'SELECT id, username, role, active FROM users WHERE active = true'
    );
    
    res.status(200).json(activeUsers);
    } catch (error) {
    console.error('Error fetching active users:', error);
    res.status(500).json({ error: 'Failed to fetch active users' });
  }
});

// Function to ensure all required tables exist
const ensureTablesExist = async () => {
  try {
    console.log('Ensuring all required tables exist...');
    
    // Check which tables exist
    const [tablesCheck] = await promisePool.query('SHOW TABLES');
    const tables = tablesCheck.map(row => Object.values(row)[0]);
    
    // Define required tables
    const requiredTables = ['users', 'courses', 'weeks', 'days', 'lessons'];
    
    // Check each required table
    for (const table of requiredTables) {
      if (!tables.includes(table)) {
        console.log(`Table '${table}' does not exist. Creating it...`);
        
        // Create the missing table based on its type
        switch (table) {
          case 'users':
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
            console.log('Users table created');
            break;
            
          case 'courses':
            await promisePool.query(`
              CREATE TABLE IF NOT EXISTS courses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
            `);
            console.log('Courses table created');
            break;
            
          case 'weeks':
            await promisePool.query(`
              CREATE TABLE IF NOT EXISTS weeks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
            `);
            console.log('Weeks table created');
            break;
            
          case 'days':
            await promisePool.query(`
              CREATE TABLE IF NOT EXISTS days (
                id INT AUTO_INCREMENT PRIMARY KEY,
                day_name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
            `);
            console.log('Days table created');
            break;
            
          case 'lessons':
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
            console.log('Lessons table created');
            break;
            
          default:
            console.log(`No creation script for table '${table}'`);
        }
      } else {
        console.log(`Table '${table}' exists`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring tables exist:', error);
    throw error;
  }
};

// Add a specific endpoint for the Deep Learning lesson PDF
app.get('/api/lessons/deep-learning/pdf', (req, res) => {
  try {
    console.log('Received request for Deep Learning PDF');
    // In a real application, this would serve an actual PDF file
    // For now, we'll just send a JSON response with lesson content
    const deepLearningContent = {
      title: "Introduction to Deep Learning",
      content: `# Introduction to Deep Learning

## What is Deep Learning?

Deep learning is a subset of machine learning that uses neural networks with multiple layers (deep neural networks) to analyze various factors of data.

Key characteristics of deep learning:
- Uses neural networks with many layers (hence "deep")
- Can automatically discover features from raw data
- Excels at processing unstructured data like images, text, and audio
- Requires large amounts of data and computational power
- Has achieved state-of-the-art results in many domains

## Applications of Deep Learning

Deep learning has revolutionized many fields:

- Computer Vision: Image classification, object detection, facial recognition
- Natural Language Processing: Translation, sentiment analysis, chatbots
- Speech Recognition: Voice assistants, transcription services
- Healthcare: Disease diagnosis, drug discovery
- Autonomous Vehicles: Self-driving cars, drones
- Gaming: AlphaGo, game-playing agents`
    };
    
    console.log('Sending Deep Learning PDF content');
    sendSuccessResponse(res, deepLearningContent);
  } catch (error) {
    console.error('Error serving Deep Learning PDF:', error);
    sendErrorResponse(res, 500, 'Failed to serve Deep Learning PDF', error);
  }
});

// Add a chatbot endpoint for Deep Learning lesson
app.post('/api/lessons/deep-learning/chat', (req, res) => {
  try {
    console.log('Received chat message:', req.body);
    const { message } = req.body;
    
    if (!message) {
      console.log('No message provided');
      return sendErrorResponse(res, 400, 'Message is required');
    }
    
    // Enhanced response logic for Deep Learning lesson
    let response = "I apologize, but I'm having trouble processing your question at the moment. Please try asking a more specific question about the lesson content, or try again later.";
    
    const userQuestion = message.toLowerCase();
    
    // Define topics related to deep learning
    const deepLearningTopics = [
      "neural networks", "deep learning", "machine learning", "ai", "artificial intelligence",
      "backpropagation", "gradient descent", "activation function", "loss function",
      "computer vision", "natural language processing", "nlp", "cnn", "rnn", "lstm",
      "gan", "transformer", "attention mechanism", "overfitting", "underfitting",
      "bias", "variance", "regularization", "dropout", "batch normalization",
      "transfer learning", "fine-tuning"
    ];
    
    // Check if the question is related to deep learning topics
    const isRelevantQuestion = deepLearningTopics.some(topic => userQuestion.includes(topic));
    
    if (!isRelevantQuestion && userQuestion.split(' ').length > 2) {
      response = "I'm sorry, I can only respond to questions about the deep learning lesson content. Please ask a question related to the material we're covering.";
    } else if (userQuestion.includes("what is") && userQuestion.includes("deep learning")) {
      response = "Deep learning is a subset of machine learning that uses neural networks with multiple layers (deep neural networks) to analyze various factors of data. It can automatically discover features from raw data and excels at processing unstructured data like images, text, and audio. Deep neural networks are inspired by the structure of the human brain and can learn hierarchical representations of data, with each layer extracting increasingly complex features.";
    } else if (userQuestion.includes("how") && userQuestion.includes("neural network") && (userQuestion.includes("work") || userQuestion.includes("function"))) {
      response = "Neural networks work by simulating interconnected neurons that process information. They consist of: 1) Input layer - receives initial data, 2) Hidden layers - where computation occurs through weighted connections, 3) Output layer - produces the final result. During training, the network adjusts connection weights through backpropagation to minimize prediction errors. Each neuron applies an activation function to determine its output signal. The depth of deep neural networks allows them to learn complex patterns and representations from data.";
    } else if (userQuestion.includes("application") || userQuestion.includes("use case")) {
      response = "Deep learning has many applications including: 1) Computer Vision - image classification, object detection, facial recognition, and medical image analysis, 2) Natural Language Processing - translation, sentiment analysis, text generation, and chatbots, 3) Speech Recognition - voice assistants and transcription services, 4) Healthcare - disease diagnosis, drug discovery, and personalized medicine, 5) Autonomous Vehicles - self-driving cars and drones, 6) Gaming - AI opponents and procedural content generation, 7) Finance - fraud detection and algorithmic trading, 8) Recommendation Systems - personalized content and product recommendations.";
    } else if (userQuestion.includes("challenge") || userQuestion.includes("limitation")) {
      response = "Despite its success, deep learning faces several challenges: 1) Data Requirements - it requires large amounts of labeled data for training, 2) Computational Intensity - training complex models demands significant computing resources and energy, 3) Interpretability - models often function as 'black boxes' making decisions difficult to explain, 4) Adversarial Vulnerability - models can be fooled by specially crafted inputs, 5) Bias Amplification - models may perpetuate or amplify biases present in training data, 6) Generalization - models may struggle with scenarios not represented in training data, 7) Hyperparameter Tuning - finding optimal model configurations can be time-consuming.";
    } else if (userQuestion.includes("history") || userQuestion.includes("development") || userQuestion.includes("evolution")) {
      response = "The history of deep learning spans several decades: 1) 1940s-50s - Early neural network concepts emerged with McCulloch-Pitts neurons and the Perceptron, 2) 1980s - Backpropagation algorithm was popularized for training multi-layer networks, 3) 1990s - Key innovations like CNNs and LSTMs were developed but faced computational limitations, 4) 2000s - Support Vector Machines and other methods overshadowed neural networks, 5) 2010s - Deep learning renaissance began with breakthroughs like AlexNet (2012), enabled by GPUs, big data, and algorithmic improvements, 6) 2010s-Present - Rapid advancement with GANs, transformers, self-supervised learning, and foundation models like GPT and DALL-E, making deep learning accessible and applicable across numerous domains.";
    } else if (userQuestion.includes("get started") || userQuestion.includes("begin") || userQuestion.includes("learn")) {
      response = "To begin with deep learning: 1) Build Mathematical Foundations - understand linear algebra, calculus, probability, and statistics, 2) Learn Python Programming - the dominant language for deep learning, 3) Study Machine Learning Fundamentals - grasp basic concepts before diving into deep learning, 4) Master a Framework - learn TensorFlow, PyTorch, or Keras, 5) Take Online Courses - platforms like Coursera, edX, and fast.ai offer excellent deep learning courses, 6) Read Key Textbooks - such as 'Deep Learning' by Goodfellow, Bengio, and Courville, 7) Practice with Projects - implement papers and work on Kaggle competitions, 8) Join Communities - participate in forums like Reddit's r/MachineLearning or attend meetups, 9) Stay Updated - follow research papers on arXiv and blogs from leading AI labs.";
    } else if (userQuestion.includes("difference") && (userQuestion.includes("machine learning") || userQuestion.includes("ml"))) {
      response = "The key differences between deep learning and traditional machine learning are: 1) Feature Engineering - traditional ML often requires manual feature extraction, while deep learning automatically learns features from raw data, 2) Data Volume - deep learning typically requires more data to perform well, 3) Computational Resources - deep learning models are more computationally intensive to train, 4) Architecture - deep learning uses neural networks with multiple layers, while traditional ML uses algorithms like decision trees, SVMs, or linear regression, 5) Problem Complexity - deep learning excels at complex tasks like image recognition and natural language processing where traditional ML might struggle, 6) Interpretability - traditional ML models are often more interpretable than deep learning models.";
    } else if (userQuestion.includes("architecture") || userQuestion.includes("type") || userQuestion.includes("model")) {
      response = "Common deep learning architectures include: 1) Convolutional Neural Networks (CNNs) - specialized for grid-like data such as images, using convolutional layers to detect spatial patterns, 2) Recurrent Neural Networks (RNNs) - designed for sequential data like text or time series, with LSTM and GRU variants addressing the vanishing gradient problem, 3) Transformers - using self-attention mechanisms for parallel processing of sequences, powering models like BERT and GPT, 4) Generative Adversarial Networks (GANs) - consisting of generator and discriminator networks that compete to create realistic synthetic data, 5) Autoencoders - unsupervised learning models that compress then reconstruct data, useful for dimensionality reduction and anomaly detection, 6) Deep Reinforcement Learning - combining deep learning with reinforcement learning for decision-making tasks.";
    } else if (isRelevantQuestion) {
      response = "Your question about deep learning is relevant to our lesson. To provide a more specific answer, could you please rephrase your question or specify which aspect of deep learning you'd like to learn more about? I can discuss neural network architectures, training methods, applications, limitations, history, or getting started in the field.";
    }
    
    console.log('Sending chat response:', response);
    sendSuccessResponse(res, { response });
  } catch (error) {
    console.error('Error processing chat message:', error);
    sendErrorResponse(res, 500, 'Failed to process chat message', error);
  }
}); 