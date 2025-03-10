import express from 'express';
import { verifyToken, isAdmin } from '../middleware/auth.js';
import { promisePool } from '../db.js';
import fs from 'fs';

const router = express.Router();

// Course Management
// Get all courses with stats
router.get('/courses', verifyToken, isAdmin, async (req, res) => {
  try {
    const [courses] = await promisePool.query(`
      SELECT c.*, 
             COUNT(DISTINCT l.id) as lesson_count,
             COUNT(DISTINCT u.id) as student_count
      FROM courses c
      LEFT JOIN lessons l ON c.id = l.course_id
      LEFT JOIN user_courses uc ON c.id = uc.course_id
      LEFT JOIN users u ON uc.user_id = u.id AND u.role = 'user'
      GROUP BY c.id
      ORDER BY c.name
    `);
    res.json({ status: 'success', data: courses });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch courses' });
  }
});

// Create new course
router.post('/courses', verifyToken, isAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ status: 'error', message: 'Course name is required' });
    }
    
    const [result] = await promisePool.query(
      'INSERT INTO courses (name) VALUES (?)',
      [name]
    );
    
    res.status(201).json({
      status: 'success',
      data: { id: result.insertId, name }
    });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create course' });
  }
});

// Update course
router.put('/courses/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    const courseId = req.params.id;
    
    if (!name) {
      return res.status(400).json({ status: 'error', message: 'Course name is required' });
    }
    
    const [result] = await promisePool.query(
      'UPDATE courses SET name = ? WHERE id = ?',
      [name, courseId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'Course not found' });
    }
    
    res.json({
      status: 'success',
      data: { id: courseId, name }
    });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update course' });
  }
});

// Delete course
router.delete('/courses/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const courseId = req.params.id;
    
    // Check for existing lessons
    const [lessons] = await promisePool.query(
      'SELECT COUNT(*) as count FROM lessons WHERE course_id = ?',
      [courseId]
    );
    
    if (lessons[0].count > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete course with existing lessons. Please delete lessons first.'
      });
    }
    
    const [result] = await promisePool.query(
      'DELETE FROM courses WHERE id = ?',
      [courseId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'Course not found' });
    }
    
    res.json({ status: 'success', message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete course' });
  }
});

// Lesson Management
// Get all lessons with details
router.get('/lessons', verifyToken, isAdmin, async (req, res) => {
  try {
    const [lessons] = await promisePool.query(`
      SELECT l.*, 
             c.name as course_name,
             w.name as week_name,
             d.day_name
      FROM lessons l
      JOIN courses c ON l.course_id = c.id
      JOIN weeks w ON l.week_id = w.id
      JOIN days d ON l.day_id = d.id
      ORDER BY c.name, w.name, d.day_name
    `);
    res.json({ status: 'success', data: lessons });
  } catch (error) {
    console.error('Error fetching lessons:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch lessons' });
  }
});

// Create new lesson
router.post('/lessons', verifyToken, isAdmin, async (req, res) => {
  try {
    const { lesson_name, course_id, week_id, day_id, file_path } = req.body;
    
    if (!lesson_name || !course_id || !week_id || !day_id || !file_path) {
      return res.status(400).json({ status: 'error', message: 'All fields are required' });
    }
    
    const [result] = await promisePool.query(
      'INSERT INTO lessons (lesson_name, course_id, week_id, day_id, file_path) VALUES (?, ?, ?, ?, ?)',
      [lesson_name, course_id, week_id, day_id, file_path]
    );
    
    res.status(201).json({
      status: 'success',
      data: {
        id: result.insertId,
        lesson_name,
        course_id,
        week_id,
        day_id,
        file_path
      }
    });
  } catch (error) {
    console.error('Error creating lesson:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create lesson' });
  }
});

// Update lesson
router.put('/lessons/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { lesson_name, course_id, week_id, day_id } = req.body;
    const lessonId = req.params.id;
    
    if (!lesson_name || !course_id || !week_id || !day_id) {
      return res.status(400).json({ status: 'error', message: 'All fields are required' });
    }
    
    const [result] = await promisePool.query(
      'UPDATE lessons SET lesson_name = ?, course_id = ?, week_id = ?, day_id = ? WHERE id = ?',
      [lesson_name, course_id, week_id, day_id, lessonId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'Lesson not found' });
    }
    
    res.json({
      status: 'success',
      data: {
        id: lessonId,
        lesson_name,
        course_id,
        week_id,
        day_id
      }
    });
  } catch (error) {
    console.error('Error updating lesson:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update lesson' });
  }
});

// Delete lesson
router.delete('/lessons/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const lessonId = req.params.id;
    
    // Get lesson file path before deleting
    const [lesson] = await promisePool.query(
      'SELECT file_path FROM lessons WHERE id = ?',
      [lessonId]
    );
    
    if (lesson.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Lesson not found' });
    }
    
    // Delete from database
    const [result] = await promisePool.query(
      'DELETE FROM lessons WHERE id = ?',
      [lessonId]
    );
    
    // Delete associated file
    if (lesson[0].file_path && fs.existsSync(lesson[0].file_path)) {
      fs.unlinkSync(lesson[0].file_path);
    }
    
    res.json({ status: 'success', message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete lesson' });
  }
});

// Student Management
// Get all students with progress
router.get('/students', verifyToken, isAdmin, async (req, res) => {
  try {
    const [students] = await promisePool.query(`
      SELECT 
        u.id,
        u.username,
        u.surname,
        u.email,
        u.role,
        COUNT(DISTINCT uc.course_id) as enrolled_courses,
        COUNT(DISTINCT lp.lesson_id) as completed_lessons
      FROM users u
      LEFT JOIN user_courses uc ON u.id = uc.user_id
      LEFT JOIN lesson_progress lp ON u.id = lp.user_id AND lp.completed = 1
      WHERE u.role IN ('user', 'lead_student')
      GROUP BY u.id
      ORDER BY u.username
    `);
    res.json({ status: 'success', data: students });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch students' });
  }
});

// Update student role (make lead student)
router.put('/students/:id/role', verifyToken, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;
    
    if (!role || !['user', 'lead_student'].includes(role)) {
      return res.status(400).json({ status: 'error', message: 'Invalid role specified' });
    }
    
    const [result] = await promisePool.query(
      'UPDATE users SET role = ? WHERE id = ? AND role != "admin"',
      [role, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'Student not found or cannot modify admin role' });
    }
    
    res.json({ status: 'success', message: 'Student role updated successfully' });
  } catch (error) {
    console.error('Error updating student role:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update student role' });
  }
});

// Manage student course enrollment
router.post('/students/:id/courses', verifyToken, isAdmin, async (req, res) => {
  try {
    const { course_ids } = req.body;
    const userId = req.params.id;
    
    if (!Array.isArray(course_ids)) {
      return res.status(400).json({ status: 'error', message: 'course_ids must be an array' });
    }
    
    await promisePool.query('START TRANSACTION');
    
    // Delete existing enrollments
    await promisePool.query(
      'DELETE FROM user_courses WHERE user_id = ?',
      [userId]
    );
    
    // Add new enrollments
    if (course_ids.length > 0) {
      const values = course_ids.map(courseId => [userId, courseId]);
      await promisePool.query(
        'INSERT INTO user_courses (user_id, course_id) VALUES ?',
        [values]
      );
    }
    
    await promisePool.query('COMMIT');
    
    res.json({ status: 'success', message: 'Student course enrollment updated successfully' });
  } catch (error) {
    await promisePool.query('ROLLBACK');
    console.error('Error updating student course enrollment:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update student course enrollment' });
  }
});

// Get student course progress
router.get('/students/:id/progress', verifyToken, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    const [progress] = await promisePool.query(`
      SELECT 
        c.id as course_id,
        c.name as course_name,
        COUNT(DISTINCT l.id) as total_lessons,
        COUNT(DISTINCT CASE WHEN lp.completed = 1 THEN l.id END) as completed_lessons
      FROM courses c
      JOIN user_courses uc ON c.id = uc.course_id
      LEFT JOIN lessons l ON c.id = l.course_id
      LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = ?
      WHERE uc.user_id = ?
      GROUP BY c.id
      ORDER BY c.name
    `, [userId, userId]);
    
    res.json({ status: 'success', data: progress });
  } catch (error) {
    console.error('Error fetching student course progress:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch student course progress' });
  }
});

// Delete student
router.delete('/students/:id', verifyToken, isAdmin, async (req, res) => {
  let connection;
  try {
    const studentId = req.params.id;

    // Get a connection for transaction
    connection = await promisePool.getConnection();
    
    // Start transaction
    await connection.beginTransaction();
    
    // Check if user exists and is not an admin
    const [user] = await connection.query(
      'SELECT role FROM users WHERE id = ?',
      [studentId]
    );
    
    if (user.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        status: 'error', 
        message: 'Student not found' 
      });
    }
    
    if (user[0].role === 'admin') {
      await connection.rollback();
      return res.status(403).json({ 
        status: 'error', 
        message: 'Cannot delete admin users' 
      });
    }
    
    // Delete related records first (due to foreign key constraints)
    await connection.query(
      'DELETE FROM lesson_progress WHERE user_id = ?',
      [studentId]
    );
    
    await connection.query(
      'DELETE FROM user_courses WHERE user_id = ?',
      [studentId]
    );
    
    // Finally delete the user
    const [result] = await connection.query(
      'DELETE FROM users WHERE id = ?',
      [studentId]
    );
    
    // Commit transaction
    await connection.commit();
    
    res.json({ 
      status: 'success', 
      message: 'Student deleted successfully' 
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error deleting student:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to delete student' 
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

export default router; 