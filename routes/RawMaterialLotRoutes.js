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

const router = express.Router();

// Routes
router.post('/add-lot', addRawMaterialLot);
router.get('/get-all-lots', getAllRawMaterialLots);
router.get('/get-one-lot/:id', getOneRawMaterialLot);
router.put('/update-lot/:id', updateRawMaterialLot);
router.delete('/delete-lot/:id', deleteRawMaterialLot);
router.get('/get-lots-by-material/:materialId', getLotsByMaterial);
router.get('/lifo-preview', getLifoPreview);

export default router;
