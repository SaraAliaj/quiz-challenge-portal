import jwt from 'jsonwebtoken';
import { promisePool } from '../db.js';

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', message: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_jwt_secret_for_development_only');
    req.user = {
      userId: decoded.userId,
      role: decoded.role
    };
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ status: 'error', message: 'Invalid token' });
  }
};

export const isAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ status: 'error', message: 'User not authenticated' });
    }

    const [user] = await promisePool.query(
      'SELECT role FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (user.length === 0 || user[0].role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Access denied. Admin privileges required.' });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({ status: 'error', message: 'Server error during admin check' });
  }
}; 