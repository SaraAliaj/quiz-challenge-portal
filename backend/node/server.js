import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pdfIntegration from './pdf_integration.js';
import { Server } from 'socket.io';
import { createServer } from 'http';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174'
    ],
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  transports: ['polling', 'websocket']
});

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

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'Sara',
  password: process.env.DB_PASSWORD || 'Sara0330!!',
  database: process.env.DB_NAME || 'aischool',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Create a promise-based wrapper for the pool
const promisePool = pool.promise();

console.log('Database configuration:', {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'Sara',
  database: process.env.DB_NAME || 'aischool',
  hasPassword: !!process.env.DB_PASSWORD,
  connectionLimit: 10
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
    throw error;
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
    
    res.json({
      status: 'ok',
      databaseConnection: true,
      tables,
      lessons: {
        exists: tables.includes('lessons'),
        structure: lessonsStructure
      },
      relatedTables: relatedTablesStatus
    });
  } catch (error) {
    console.error('Database check error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Database check failed',
      error: {
        message: error.message,
        code: error.code,
        sqlMessage: error.sqlMessage
      }
    });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log('Login attempt for:', email);
    console.log('Request body:', req.body);
    
    if (!email || !password) {
      console.log('Missing credentials:', { email: !!email, password: !!password });
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Test database connection before proceeding
    try {
      await promisePool.query('SELECT 1');
      console.log('Database connection successful');
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return res.status(500).json({ message: 'Database connection error', error: dbError.message });
    }

    // Query for user
    const [rows] = await promisePool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    console.log('Query result:', { rowCount: rows.length });

    if (rows.length === 0) {
      console.log('User not found:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    console.log('Password validation:', { valid: validPassword });

    if (!validPassword) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update user's active status to true
    console.log('Setting active status to TRUE for user:', user.id);
    await promisePool.query(
      'UPDATE users SET active = TRUE WHERE id = ?',
      [user.id]
    );

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Emit socket event for online status update
    console.log('Emitting user_status_change event for user:', user.id);
    io.emit('user_status_change', { 
      userId: user.id, 
      username: user.username,
      surname: user.surname,
      active: true 
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        surname: user.surname,
        role: user.role || 'user',
        active: true
      }
    });
  } catch (error) {
    console.error('Login error details:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      stack: error.stack
    });
    res.status(500).json({ 
      message: 'Server error during login',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  const { username, surname, email, password } = req.body;

  console.log('Received registration request:', {
    username,
    surname,
    email,
    hasPassword: !!password
  });

  // Validate input
  if (!username || !email || !password) {
    console.log('Missing required fields:', {
      username: !username,
      email: !email,
      password: !password
    });
    return res.status(400).json({ 
      message: 'Please provide all required fields',
      missing: {
        username: !username,
        email: !email,
        password: !password
      }
    });
  }

  try {
    // Check database connection
    await promisePool.query('SELECT 1');
    
    // Log the registration attempt
    console.log('Registration attempt for:', { username, email });

    // Check if email already exists
    const [existing] = await promisePool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      console.log('Email already exists:', email);
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');

    // Insert new user
    const [result] = await promisePool.query(
      'INSERT INTO users (username, surname, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [username, surname, email, hashedPassword, 'user'] // Default role is 'user'
    );

    console.log('User registered successfully:', { id: result.insertId });

    const token = jwt.sign(
      { userId: result.insertId, email },
      JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: result.insertId,
        username,
        email,
        surname,
        role: 'user' // Default role
      }
    });
  } catch (error) {
    console.error('Registration error details:', {
      error: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      stack: error.stack
    });
    
    // Send more specific error messages
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ message: 'Email already registered' });
    } else if (error.code === 'ER_NO_SUCH_TABLE') {
      console.error('Database table not found');
      res.status(500).json({ 
        message: 'Database configuration error',
        details: 'Table not found'
      });
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Database connection failed');
      res.status(500).json({ 
        message: 'Database connection error',
        details: 'Could not connect to database'
      });
    } else {
      res.status(500).json({ 
        message: 'Server error during registration',
        details: error.message 
      });
    }
  }
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Set the decoded token data directly as req.user
    req.user = {
      userId: decoded.userId,
      email: decoded.email
    };
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const [user] = await promisePool.query(
      'SELECT role FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (user.length === 0 || user[0].role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({ message: 'Server error during admin check' });
  }
};

// Token verification endpoint
app.get('/api/auth/verify', verifyToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// Middleware for handling file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      console.log(`Creating upload directory: ${uploadDir}`);
      fs.mkdirSync(uploadDir, { recursive: true });
    } else {
      console.log(`Upload directory exists: ${uploadDir}`);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = file.fieldname + '-' + uniqueSuffix + ext;
    console.log(`Generated filename for upload: ${filename}`);
    cb(null, filename);
  }
});

// Configure multer with more detailed logging
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: function (req, file, cb) {
    console.log(`Received file in multer:`, {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname,
      size: file.size
    });
    // Accept all file types for now to debug the issue
    cb(null, true);
  }
});

// API endpoints for course management
// Get all courses
app.get('/api/courses', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT id, name FROM courses ORDER BY name');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ message: 'Failed to fetch courses' });
  }
});

// Create a new course
app.post('/api/courses', verifyToken, isAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Course name is required' });
    }

    const [result] = await promisePool.query(
      'INSERT INTO courses (name) VALUES (?)',
      [name]
    );

    res.status(201).json({
      id: result.insertId,
      name,
      message: 'Course created successfully'
    });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ message: 'Failed to create course' });
  }
});

app.get('/api/weeks', async (req, res) => {
  try {
    const [rows] = await promisePool.query(
      'SELECT id, name FROM weeks'
    );
    res.json(rows); // Send all weeks to the client
  } catch (error) {
    console.error('Error fetching weeks:', error);
    res.status(500).json({ message: 'Failed to fetch weeks' });
  }
});

// Get all days
app.get('/api/days', async (req, res) => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM days');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching days:', error);
    res.status(500).json({ error: 'Failed to fetch days' });
  }
});

// New endpoint to fetch lessons
app.get('/api/lessons', async (req, res) => {
  try {
    const [rows] = await promisePool.query(`
      SELECT l.id, l.lesson_name as title, l.course_id, l.week_id, l.day_id, 
             c.name as course_name, w.name as week_name, d.day_name as day_name
      FROM lessons l
      JOIN courses c ON l.course_id = c.id
      JOIN weeks w ON l.week_id = w.id
      JOIN days d ON l.day_id = d.id
      ORDER BY c.id, w.id, d.id
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching lessons:', error);
    res.status(500).json({ error: 'Failed to fetch lessons' });
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
    res.json({
      id: lesson.id,
      title: lesson.lesson_name,
      content: fileContent,
      fileType: path.extname(filePath).substring(1) || 'txt',
      fileName: path.basename(filePath)
    });
  } catch (error) {
    console.error('Error fetching lesson content:', error);
    res.status(500).json({ error: 'Failed to fetch lesson content' });
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
      return res.status(400).json({ message: 'File upload error', error: err.message });
    }
    
    console.log('File received:', req.file);
    if (!req.file) {
      console.error('No file was uploaded');
      return res.status(400).json({ 
        message: 'Missing required file', 
        missingFields: ['pdfFile'] 
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
    
    try {
      // Process the PDF file
      const result = await pdfIntegration.processAndAddLesson(req.file.path, {
        courseId: courseIdInt,
        weekId: weekIdInt,
        dayId: dayIdInt,
        title
      });
      
      if (result.success) {
        res.status(201).json({ 
          message: 'PDF lesson processed and uploaded successfully',
          lessonId: result.lessonId
        });
      } else {
        res.status(500).json({ 
          message: 'Failed to process PDF lesson',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error processing PDF lesson:', error);
      res.status(500).json({ 
        message: 'Failed to process PDF lesson',
        error: error.message
      });
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

// Socket.io connection handler
const userSockets = new Map(); // Map to track user's socket connections

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Handle authentication
  socket.on('authenticate', async (userId) => {
    try {
      // Store the user ID in the socket object for later use
    socket.userId = userId;
    console.log(`Socket ${socket.id} authenticated as user ${userId}`);
    
    // Add this socket to the user's connections
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);
    
      // Update user's active status in the database
      await promisePool.query(
        'UPDATE users SET active = true, last_active = NOW() WHERE id = ?',
        [userId]
      );
      
      // Get user info for the socket event
      const [userRows] = await promisePool.query(
        'SELECT id, username, surname, role FROM users WHERE id = ?',
        [userId]
      );
      
      if (userRows.length > 0) {
        const user = userRows[0];
        
        // Emit event to all clients about the new active user
        io.emit('user_status_change', {
          userId: user.id,
          username: user.username,
          surname: user.surname,
          role: user.role,
          active: true
        });
        
        // Send the current list of active users to the newly connected client
        const [activeUsers] = await promisePool.query(
          'SELECT id, username, surname, role, last_active FROM users WHERE active = true'
        );
        
        socket.emit('active_users_update', activeUsers);
      }
      
      // Set up an interval to keep the user's last_active timestamp updated
    const activityInterval = setInterval(async () => {
      try {
          await promisePool.query(
            'UPDATE users SET last_active = NOW() WHERE id = ?',
            [socket.userId]
          );
      } catch (error) {
          console.error('Error updating user activity:', error);
      }
      }, 60000); // Update every minute
    
    // Store the interval ID in the socket for cleanup
    socket.activityInterval = activityInterval;
    } catch (error) {
      console.error('Error in socket authentication:', error);
    }
  });

  // Handle group chat messages
  socket.on('group_message', async (data) => {
    try {
      const { content } = data;
      const userId = socket.userId;

      if (!userId || !content) {
        return;
      }

      // Get user info
      const [userRows] = await promisePool.query(
        'SELECT username, surname, role FROM users WHERE id = ?',
        [userId]
      );

      if (userRows.length > 0) {
        const user = userRows[0];
        // Broadcast the message to all connected clients
        io.emit('group_message', {
          id: Date.now().toString(),
          content,
          sender: {
            id: userId,
            name: user.username,
            surname: user.surname,
            role: user.role
          },
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Error handling group message:', error);
    }
  });

  // Restore lesson-related events
  socket.on('startLesson', (data) => {
    const { lessonId, lessonName, duration, teacherName } = data;
    io.emit('lessonStarted', {
      lessonId,
      lessonName,
      duration,
      teacherName
    });
    console.log('Lesson started:', data);
  });

  socket.on('endLesson', (data) => {
    socket.broadcast.emit('lessonEnded', data);
    console.log('Lesson ended:', data);
  });
  
  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log('A user disconnected:', socket.id);
    
    // Clear the activity interval if it exists
    if (socket.activityInterval) {
      clearInterval(socket.activityInterval);
    }
    
    // If the socket was authenticated, update the user's active status
    if (socket.userId) {
      // Remove this socket from the user's connections
      if (userSockets.has(socket.userId)) {
        userSockets.get(socket.userId).delete(socket.id);
        
        // If this was the user's last connection, mark them as inactive
        if (userSockets.get(socket.userId).size === 0) {
          try {
            // Update the user's active status in the database
            await promisePool.query(
              'UPDATE users SET active = false WHERE id = ?',
              [socket.userId]
            );
            
            // Get user info for the socket event
            const [userRows] = await promisePool.query(
              'SELECT username, surname, role FROM users WHERE id = ?',
              [socket.userId]
            );
            
            if (userRows.length > 0) {
              // Emit event to all clients about the user becoming inactive
              io.emit('user_status_change', {
                userId: socket.userId,
                username: userRows[0].username,
                surname: userRows[0].surname,
                role: userRows[0].role,
                active: false
              });
            }
            
            // Clean up the user's entry in userSockets
            userSockets.delete(socket.userId);
          } catch (error) {
            console.error('Error updating user active status:', error);
          }
        }
      }
    }
  });
});

// Add a cleanup interval to handle stale connections
setInterval(async () => {
  for (const [userId, sockets] of userSockets.entries()) {
    // Check if any sockets are still connected
    const connectedSockets = Array.from(sockets).filter(socketId => {
      const socket = io.sockets.sockets.get(socketId);
      return socket && socket.connected;
    });
    
    // If no sockets are connected, mark user as offline
    if (connectedSockets.length === 0) {
      try {
        // Update user's active status to false
        await promisePool.query(
          'UPDATE users SET active = FALSE WHERE id = ?',
          [userId]
        );
        
        // Get user info for the socket event
        const [userRows] = await promisePool.query(
          'SELECT username, surname, role FROM users WHERE id = ?',
          [userId]
        );
        
        if (userRows.length > 0) {
          io.emit('user_status_change', {
            userId,
            username: userRows[0].username,
            surname: userRows[0].surname,
            role: userRows[0].role,
            active: false
          });
        }
        
        // Clean up the user's entry in userSockets
        userSockets.delete(userId);
      } catch (error) {
        console.error('Error updating user status during cleanup:', error);
      }
    }
  }
}, 30000); // Run every 30 seconds

// Add cleanup function for server startup
const cleanupOnlineStatus = async () => {
  try {
    // Reset all users to inactive on server start
    await promisePool.query('UPDATE users SET active = FALSE');
    console.log('Reset all users to inactive status on server start');
  } catch (error) {
    console.error('Failed to cleanup online status:', error);
  }
};

// Update the startServer function to use httpServer and include cleanup
const startServer = async () => {
  try {
    await connectToDatabase();
    await ensureTablesExist();
    
    // Add this line to clean up online status on server start
    await cleanupOnlineStatus();
    
    const PORT = process.env.PORT || 3000;

    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`WebSocket server is available at ws://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

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
      'SELECT id, username, email, role, created_at FROM users'
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
      message: 'Failed to fetch users',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
      io.emit('user_status_change', { 
        userId, 
        username: userRows[0].username,
        surname: userRows[0].surname,
        active: false 
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
      'UPDATE users SET active = ?, last_active = NOW() WHERE id = ?',
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
        io.emit('user_active', {
          id: user.id,
          username: user.username,
          role: user.role,
          lastActive: new Date()
        });
      }
    } else {
      // If the user is becoming inactive, emit an event to all clients
      io.emit('user_inactive', {
        userId
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
      'SELECT id, username, role, last_active FROM users WHERE active = true'
    );
    
    res.status(200).json(activeUsers);
    } catch (error) {
    console.error('Error fetching active users:', error);
    res.status(500).json({ error: 'Failed to fetch active users' });
  }
}); 