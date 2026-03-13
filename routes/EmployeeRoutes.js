import express from 'express';
import {
    employeeLogin,
    getEmployeeWorkOrders,
    getWorkOrderWIP,
    getProcessDetails,
    updateProcessStatus,
    uploadReport
} from '../contollers/EmployeeControllers.js';

const router = express.Router();

// Authentication
router.post('/login', employeeLogin);

// Work orders and processes
router.get('/:employeeId/work-orders', getEmployeeWorkOrders);
router.get('/work-order/:workOrderId/wip', getWorkOrderWIP);
router.get('/process/:processId', getProcessDetails);

// Process management
router.patch('/process/:processId/status', updateProcessStatus);

// Report management
router.post('/process/:processId/upload-report', uploadReport);

export default router;
