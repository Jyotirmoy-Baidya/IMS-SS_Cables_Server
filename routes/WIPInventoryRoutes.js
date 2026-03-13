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
router.get('/', authenticate, isAdmin, getAllWIPInventory);
router.get('/:id', authenticate, isAdmin, getWIPInventoryById);
router.put('/:id', authenticate, isAdmin, updateWIPInventory);
router.delete('/:id', authenticate, isAdmin, deleteWIPInventory);

// Special endpoints
router.get('/work-order/:workOrderId/available', authenticate, isAdmin, getAvailableWIPForWorkOrder);
router.post('/check-availability', authenticate, isAdmin, checkWIPAvailability);

export default router;
