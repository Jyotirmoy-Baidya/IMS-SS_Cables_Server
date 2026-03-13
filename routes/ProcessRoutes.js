import express from 'express';
import {
    addProcess,
    getAllProcesses,
    getOneProcess,
    updateProcess,
    deleteProcess
} from '../contollers/ProcessControllers.js';
import { authenticate, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/add-process', authenticate, isAdmin, addProcess);
router.get('/get-all-processes', authenticate, isAdmin, getAllProcesses);
router.get('/get-one-process/:id', authenticate, isAdmin, getOneProcess);
router.put('/update-process/:id', authenticate, isAdmin, updateProcess);
router.delete('/delete-process/:id', authenticate, isAdmin, deleteProcess);

export default router;
