import express from 'express';
import {
    createProcessTracking,
    getAllProcessTracking,
    getProcessTrackingById,
    addInput,
    addOutput,
    updateProgress,
    deleteProcessTracking,
    submitReport,
    approveReport,
    checkProcessDependencies
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

// Report management
router.post('/:id/submit-report', submitReport);
router.patch('/:id/approve-report', approveReport);
router.post('/check-dependencies', checkProcessDependencies);

export default router;
