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

const router = express.Router();

router.post('/create-work-order', createWorkOrder);
router.get('/get-all-work-orders', getAllWorkOrders);
router.get('/get-work-order/:id', getWorkOrderById);
router.put('/update-work-order/:id', updateWorkOrder);
router.patch('/patch-work-order/:id', patchWorkOrder);
router.delete('/delete-work-order/:id', deleteWorkOrder);

// Extra material requests
router.post('/:workOrderId/extra-material-request', requestExtraMaterial);
router.patch('/:workOrderId/extra-material-request/:requestId/approve', approveExtraMaterialRequest);
router.patch('/:workOrderId/extra-material-request/:requestId/reject', rejectExtraMaterialRequest);

export default router;
