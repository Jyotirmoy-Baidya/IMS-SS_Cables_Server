import express from 'express';
import {
    createUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
} from '../contollers/UserControllers.js';
import { authenticate, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/create-user', authenticate, isAdmin, createUser);
router.get('/get-all-users', authenticate, isAdmin, getAllUsers);
router.get('/get-one-user/:id', authenticate, isAdmin, getUserById);
router.put('/update-user/:id', authenticate, isAdmin, updateUser);
router.delete('/delete-user/:id', authenticate, isAdmin, deleteUser);

export default router;
