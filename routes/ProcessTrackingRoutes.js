import express from 'express';
import {
    createProcessTracking,
    getAllProcessTracking,
    getProcessTrackingById,
    addInput,
    addOutput,
    updateProgress,
    deleteProcessTracking
} from '../contollers/ProcessTrackingControllers.js';

const router = express.Router();

// Basic CRUD
router.post('/', createProcessTracking);
router.get('/', getAllProcessTracking);
router.get('/:id', getProcessTrackingById);
router.delete('/:id', deleteProcessTracking);

// Process tracking actions
router.post('/:id/inputs', addInput);
router.post('/:id/outputs', addOutput);
router.patch('/:id/progress', updateProgress);

export default router;
