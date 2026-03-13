import express from 'express';
import {
  addRawMaterialLot,
  getAllRawMaterialLots,
  getOneRawMaterialLot,
  updateRawMaterialLot,
  deleteRawMaterialLot,
  getLotsByMaterial,
  getLifoPreview
} from '../contollers/RawMaterialLotControllers.js';
import { authenticate, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Routes
router.post('/add-lot', authenticate, isAdmin, addRawMaterialLot);
router.get('/get-all-lots', authenticate, isAdmin, getAllRawMaterialLots);
router.get('/get-one-lot/:id', authenticate, isAdmin, getOneRawMaterialLot);
router.put('/update-lot/:id', authenticate, isAdmin, updateRawMaterialLot);
router.delete('/delete-lot/:id', authenticate, isAdmin, deleteRawMaterialLot);
router.get('/get-lots-by-material/:materialId', authenticate, isAdmin, getLotsByMaterial);
router.get('/lifo-preview', authenticate, isAdmin, getLifoPreview);

export default router;
