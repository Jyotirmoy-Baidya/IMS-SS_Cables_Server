import User from '../models/UserModel.js';
import jwt from 'jsonwebtoken';

// Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'your-secret-key-change-in-production', {
        expiresIn: '30d'
    });
};

// Register new user
export const register = async (req, res) => {
    try {
        const { phoneNumber, password, role, name, email } = req.body;

        // Validation
        if (!phoneNumber || !password || !role) {
            return res.status(400).json({
                success: false,
                message: 'Phone number, password, and role are required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        if (!['admin', 'salesperson', 'employee'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role. Must be admin, salesperson, or employee'
            });
        }

        // Check if user already exists with this phone number
        const existingUser = await User.findOne({ phoneNumber });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this phone number already exists'
            });
        }

        // Create new user
        const user = await User.create({
            name: name || '',
            email: email || '',
            phoneNumber,
            password,
            role
        });

        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    phoneNumber: user.phoneNumber
                },
                token
            }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// Login user
export const login = async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;

        // Validation
        if (!phoneNumber || !password) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and password are required'
            });
        }

        // Find user by phone number
        const user = await User.findOne({ phoneNumber });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid phone number or password'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Your account has been deactivated. Please contact administrator.'
            });
        }

        // Compare password
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid phone number or password'
            });
        }

        // Generate token
        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    phoneNumber: user.phoneNumber
                },
                token
            }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// Get current user (protected route)
export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};
