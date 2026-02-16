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

const router = express.Router();

router.post('/create', createPurchaseOrder);
router.get('/get-all', getAllPurchaseOrders);
router.get('/get-one/:id', getOnePurchaseOrder);
router.put('/update/:id', updatePurchaseOrder);
router.post('/receive/:id', receivePurchaseOrder);
router.post('/cancel/:id', cancelPurchaseOrder);
router.get('/suggested-suppliers/:materialId', getSuggestedSuppliers);

export default router;
