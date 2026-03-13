import express from 'express';
import {
    createCore,
    getAllCores,
    getCoreById,
    updateCore,
    deleteCore,
    deactivateCore
} from '../contollers/CoreControllers.js';
import { authenticate, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/create-core', authenticate, isAdmin, createCore);
router.get('/get-all-cores', authenticate, isAdmin, getAllCores);
router.get('/get-core/:id', authenticate, isAdmin, getCoreById);
router.put('/update-core/:id', authenticate, isAdmin, updateCore);
router.delete('/delete-core/:id', authenticate, isAdmin, deleteCore);
router.patch('/deactivate-core/:id', authenticate, isAdmin, deactivateCore);

export default router;
