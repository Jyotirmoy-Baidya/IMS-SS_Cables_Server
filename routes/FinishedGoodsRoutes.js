import express from 'express';
import {
    getAllFinishedGoods,
    getFinishedGoodsById,
    updateFinishedGoods,
    updateDeliveryStatus,
    deleteFinishedGoods
} from '../contollers/FinishedGoodsControllers.js';

const router = express.Router();

// Basic CRUD
router.get('/', getAllFinishedGoods);
router.get('/:id', getFinishedGoodsById);
router.put('/:id', updateFinishedGoods);
router.delete('/:id', deleteFinishedGoods);

// Special endpoints
router.patch('/:id/delivery-status', updateDeliveryStatus);

export default router;
