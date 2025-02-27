import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const app = express();

// Enable CORS with specific options
app.use(cors({
  origin: ['http://localhost:8080', 'http://127.0.0.1:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Database configuration
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'aischool'
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Improved database connection handling
const connectToDatabase = async () => {
  return new Promise((resolve, reject) => {
    db.connect((err) => {
      if (err) {
        console.error('Failed to connect to MySQL:', err);
        reject(err);
        return;
      }
      console.log('Successfully connected to MySQL');
      resolve();
    });
  });
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.promise().query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        surname: user.surname
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
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
    await db.promise().query('SELECT 1');
    
    // Log the registration attempt
    console.log('Registration attempt for:', { username, email });

    // Check if email already exists
    const [existing] = await db.promise().query(
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
    const [result] = await db.promise().query(
      'INSERT INTO users (username, surname, email, password) VALUES (?, ?, ?, ?)',
      [username, surname, email, hashedPassword]
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
        surname
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
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
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
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: function (req, file, cb) {
    // Accept only PDF and text files
    if (file.mimetype === 'application/pdf' || file.mimetype === 'text/plain') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and text files are allowed'));
    }
  }
});

// API endpoints for course management
// Get all courses
app.get('/api/courses', async (req, res) => {
  try {
    const [rows] = await db.promise().query('SELECT id, name FROM courses ORDER BY name');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ message: 'Failed to fetch courses' });
  }
});

// Get weeks for a specific course
app.get('/api/courses/:courseId/weeks', async (req, res) => {
  try {
    const { courseId } = req.params;
    const [rows] = await db.promise().query(
      'SELECT id, week_number, title FROM weeks WHERE course_id = ? ORDER BY week_number',
      [courseId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching weeks:', error);
    res.status(500).json({ message: 'Failed to fetch weeks' });
  }
});

// Get days for a specific week
app.get('/api/weeks/:weekId/days', async (req, res) => {
  try {
    const { weekId } = req.params;
    const [rows] = await db.promise().query(
      'SELECT id, day_number, title FROM days WHERE week_id = ? ORDER BY day_number',
      [weekId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching days:', error);
    res.status(500).json({ message: 'Failed to fetch days' });
  }
});

// Upload lesson with materials
app.post('/api/lessons', verifyToken, upload.array('files', 10), async (req, res) => {
  const { courseId, weekId, dayId, title } = req.body;
  const files = req.files;

  // Validate input
  if (!courseId || !weekId || !dayId || !title || !files || files.length === 0) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  let connection;
  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    // Insert lesson
    const [lessonResult] = await connection.query(
      'INSERT INTO lessons (day_id, title) VALUES (?, ?)',
      [dayId, title]
    );
    const lessonId = lessonResult.insertId;

    // Insert materials
    for (const file of files) {
      await connection.query(
        'INSERT INTO materials (lesson_id, file_name, file_path, file_type, file_size) VALUES (?, ?, ?, ?, ?)',
        [
          lessonId,
          file.originalname,
          file.path,
          file.mimetype,
          file.size
        ]
      );
    }

    await connection.commit();
    res.status(201).json({ 
      message: 'Lesson uploaded successfully',
      lessonId,
      fileCount: files.length
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error uploading lesson:', error);
    res.status(500).json({ message: 'Failed to upload lesson' });
  } finally {
    if (connection) connection.release();
  }
});

const PORT = process.env.PORT || 3001;

// Start server with better error handling
const startServer = async () => {
  try {
    await connectToDatabase();
    
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer().catch(err => {
  console.error('Startup error:', err);
  process.exit(1);
});

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
}); 