import express from 'express';
import {
    createWorkOrder,
    getAllWorkOrders,
    getWorkOrderById,
    updateWorkOrder,
    patchWorkOrder,
    deleteWorkOrder,
    requestExtraMaterial,
    approveExtraMaterialRequest,
    rejectExtraMaterialRequest,
} from '../contollers/WorkOrderControllers.js';
import { authenticate, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication and admin access
router.post('/create-work-order', authenticate, isAdmin, createWorkOrder);
router.get('/get-all-work-orders', authenticate, isAdmin, getAllWorkOrders);
router.get('/get-work-order/:id', authenticate, isAdmin, getWorkOrderById);
router.put('/update-work-order/:id', authenticate, isAdmin, updateWorkOrder);
router.patch('/patch-work-order/:id', authenticate, isAdmin, patchWorkOrder);
router.delete('/delete-work-order/:id', authenticate, isAdmin, deleteWorkOrder);

// Extra material requests
router.post('/:workOrderId/extra-material-request', authenticate, isAdmin, requestExtraMaterial);
router.patch('/:workOrderId/extra-material-request/:requestId/approve', authenticate, isAdmin, approveExtraMaterialRequest);
router.patch('/:workOrderId/extra-material-request/:requestId/reject', authenticate, isAdmin, rejectExtraMaterialRequest);

export default router;
