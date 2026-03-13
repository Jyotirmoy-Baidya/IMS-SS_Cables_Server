import express from 'express';
import {
    getAllProcessesInWorkOrder,
    getProcessInWorkOrderById,
    updateProcessInWorkOrder,
    addInput,
    updateProgress,
    submitReport,
    receiveReport,
    checkDependencies
} from '../contollers/ProcessInWorkOrderController.js';

const router = express.Router();

// Get all processes
router.get('/get-all-processes', getAllProcessesInWorkOrder);

// Get single process by ID
router.get('/:id', getProcessInWorkOrderById);

// Update process
router.patch('/:id/update', updateProcessInWorkOrder);

// Add input to process
router.post('/:id/add-input', addInput);

// Update progress
router.post('/:id/update-progress', updateProgress);

// Submit report
router.post('/:id/submit-report', submitReport);

// Receive/approve report
router.post('/:id/receive-report', receiveReport);

// Check dependencies
router.post('/check-dependencies', checkDependencies);

export default router;
