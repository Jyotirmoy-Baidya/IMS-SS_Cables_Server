import express from 'express';
import {
    getAllWIPInventory,
    getWIPInventoryById,
    getAvailableWIPForWorkOrder,
    updateWIPInventory,
    deleteWIPInventory,
    checkWIPAvailability
} from '../contollers/WIPInventoryControllers.js';
import { authenticate, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Basic CRUD
router.get('/', authenticate, getAllWIPInventory);
router.get('/:id', authenticate, getWIPInventoryById);
router.put('/:id', authenticate, updateWIPInventory);
router.delete('/:id', authenticate, deleteWIPInventory);

// Special endpoints
router.get('/work-order/:workOrderId/available', authenticate, getAvailableWIPForWorkOrder);
router.post('/check-availability', authenticate, checkWIPAvailability);

export default router;
