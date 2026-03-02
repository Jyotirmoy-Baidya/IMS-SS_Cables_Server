import express from 'express';
import {
    getAllWIPInventory,
    getWIPInventoryById,
    getAvailableWIPForWorkOrder,
    updateWIPInventory,
    deleteWIPInventory,
    checkWIPAvailability
} from '../contollers/WIPInventoryControllers.js';

const router = express.Router();

// Basic CRUD
router.get('/', getAllWIPInventory);
router.get('/:id', getWIPInventoryById);
router.put('/:id', updateWIPInventory);
router.delete('/:id', deleteWIPInventory);

// Special endpoints
router.get('/work-order/:workOrderId/available', getAvailableWIPForWorkOrder);
router.post('/check-availability', checkWIPAvailability);

export default router;
