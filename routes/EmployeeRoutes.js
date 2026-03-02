import express from 'express';
import {
    employeeLogin,
    getEmployeeWorkOrders,
    getWorkOrderWIP,
    updateProcessStatus,
    uploadReport,
    receiveReport
} from '../contollers/EmployeeControllers.js';

const router = express.Router();

// Authentication
router.post('/login', employeeLogin);

// Work orders and processes
router.get('/:employeeId/work-orders', getEmployeeWorkOrders);
router.get('/work-order/:workOrderId/wip', getWorkOrderWIP);

// Process management
router.patch('/tracking/:trackingId/status', updateProcessStatus);

// Report management
router.post('/tracking/:trackingId/upload-report', uploadReport);
router.patch('/tracking/:trackingId/receive-report', receiveReport);

export default router;
