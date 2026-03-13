import jwt from 'jsonwebtoken';
import User from '../models/UserModel.js';

// Verify JWT token and add user to req.user
export const authenticate = async (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No token provided. Authorization denied.'
            });
        }

        // Extract token
        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');

        // Get user from database
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found. Authorization denied.'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Your account has been deactivated. Please contact administrator.'
            });
        }

        // Add user to request object
        req.user = user;
        next();
    } catch (err) {
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. Authorization denied.'
            });
        }

        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired. Please login again.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error during authentication'
        });
    }
};

// Check if user is admin
export const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        });
    }
};

// Check if user is salesperson
export const isSalesperson = (req, res, next) => {
    if (req.user && req.user.role === 'salesperson') {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: 'Access denied. Salesperson privileges required.'
        });
    }
};

// Check if user is employee
export const isEmployee = (req, res, next) => {
    if (req.user && req.user.role === 'employee') {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: 'Access denied. Employee privileges required.'
        });
    }
};
