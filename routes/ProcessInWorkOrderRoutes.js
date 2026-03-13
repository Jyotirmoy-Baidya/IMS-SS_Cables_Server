import express from 'express';
import {
    getAllProcessesInWorkOrder,
    getProcessInWorkOrderById,
    updateProcessInWorkOrder,
    addInput,
    updateProgress,
    submitReport,
    receiveReport,
    checkDependencies,
    createOutputProduct,
    updateProcessStatus
} from '../contollers/ProcessInWorkOrderController.js';
import { authenticate, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all processes
router.get('/get-all-processes', authenticate, isAdmin, getAllProcessesInWorkOrder);

// Get single process by ID
router.get('/:id', authenticate, isAdmin, getProcessInWorkOrderById);

// Update process
router.patch('/:id/update', authenticate, isAdmin, updateProcessInWorkOrder);

// Update process status only
router.patch('/:id/status', authenticate, isAdmin, updateProcessStatus);

// Add input to process
router.post('/:id/add-input', authenticate, isAdmin, addInput);

// Update progress
router.post('/:id/update-progress', authenticate, isAdmin, updateProgress);

// Submit report
router.post('/:id/submit-report', authenticate, isAdmin, submitReport);

// Receive/approve report
router.post('/:id/receive-report', authenticate, isAdmin, receiveReport);

// Check dependencies
router.post('/check-dependencies', authenticate, isAdmin, checkDependencies);

// Create output product (WIP or Finished Good)
router.post('/:id/create-output-product', authenticate, isAdmin, createOutputProduct);

export default router;
