import express from 'express';
import {
  createPurchaseOrder,
  getAllPurchaseOrders,
  getOnePurchaseOrder,
  updatePurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
  getSuggestedSuppliers
} from '../contollers/PurchaseOrderControllers.js';
import { authenticate, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/create', authenticate, isAdmin, createPurchaseOrder);
router.get('/get-all', authenticate, isAdmin, getAllPurchaseOrders);
router.get('/get-one/:id', authenticate, isAdmin, getOnePurchaseOrder);
router.put('/update/:id', authenticate, isAdmin, updatePurchaseOrder);
router.post('/receive/:id', authenticate, isAdmin, receivePurchaseOrder);
router.post('/cancel/:id', authenticate, isAdmin, cancelPurchaseOrder);
router.get('/suggested-suppliers/:materialId', authenticate, isAdmin, getSuggestedSuppliers);

export default router;
