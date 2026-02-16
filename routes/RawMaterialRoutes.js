import express from 'express';
import {
  addRawMaterial,
  getAllRawMaterials,
  getOneRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
  recalculateInventory,
  consumeMaterial,
  getInventorySummary,
  addReprocess
} from '../contollers/RawMaterialControllers.js';

const router = express.Router();

// Routes
router.post('/add-material', addRawMaterial);
router.get('/get-all-materials', getAllRawMaterials);
router.get('/get-one-material/:id', getOneRawMaterial);
router.put('/update-material/:id', updateRawMaterial);
router.delete('/delete-material/:id', deleteRawMaterial);
router.post('/recalculate-inventory/:id', recalculateInventory);
router.post('/consume-material/:id', consumeMaterial);
router.get('/inventory-summary', getInventorySummary);
router.post('/add-reprocess/:id', addReprocess);

export default router;
