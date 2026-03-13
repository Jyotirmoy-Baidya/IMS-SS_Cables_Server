import express from 'express';
import {
  addRawMaterial,
  getAllRawMaterials,
  getOneRawMaterial,
  getByIds,
  updateRawMaterial,
  deleteRawMaterial,
  recalculateInventory,
  consumeMaterial,
  getInventorySummary,
  addReprocess,
  getMaterialsByType
} from '../contollers/RawMaterialControllers.js';
import { authenticate, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Routes
router.post('/add-material', authenticate, isAdmin, addRawMaterial);
router.get('/get-all-materials', authenticate, isAdmin, getAllRawMaterials);
router.get('/get-one-material/:id', authenticate, isAdmin, getOneRawMaterial);
router.get('/get-by-type/:typeId', authenticate, isAdmin, getMaterialsByType);
router.post('/get-by-ids', authenticate, isAdmin, getByIds);
router.put('/update-material/:id', authenticate, isAdmin, updateRawMaterial);
router.delete('/delete-material/:id', authenticate, isAdmin, deleteRawMaterial);
router.post('/recalculate-inventory/:id', authenticate, isAdmin, recalculateInventory);
router.post('/consume-material/:id', authenticate, isAdmin, consumeMaterial);
router.get('/inventory-summary', authenticate, isAdmin, getInventorySummary);
router.post('/add-reprocess/:id', authenticate, isAdmin, addReprocess);

export default router;
