import express from 'express';
import {
    createWorkOrder,
    getAllWorkOrders,
    getWorkOrderById,
    updateWorkOrder,
    patchWorkOrder,
    deleteWorkOrder,
} from '../contollers/WorkOrderControllers.js';

const router = express.Router();

router.post('/create-work-order', createWorkOrder);
router.get('/get-all-work-orders', getAllWorkOrders);
router.get('/get-work-order/:id', getWorkOrderById);
router.put('/update-work-order/:id', updateWorkOrder);
router.patch('/patch-work-order/:id', patchWorkOrder);
router.delete('/delete-work-order/:id', deleteWorkOrder);

export default router;
