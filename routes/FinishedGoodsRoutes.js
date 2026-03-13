import express from 'express';
import {
    getAllFinishedGoods,
    getFinishedGoodsById,
    updateFinishedGoods,
    updateDeliveryStatus,
    deleteFinishedGoods
} from '../contollers/FinishedGoodsControllers.js';
import { authenticate, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Basic CRUD
router.get('/', authenticate, isAdmin, getAllFinishedGoods);
router.get('/:id', authenticate, isAdmin, getFinishedGoodsById);
router.put('/:id', authenticate, isAdmin, updateFinishedGoods);
router.delete('/:id', authenticate, isAdmin, deleteFinishedGoods);

// Special endpoints
router.patch('/:id/delivery-status', authenticate, isAdmin, updateDeliveryStatus);

export default router;
