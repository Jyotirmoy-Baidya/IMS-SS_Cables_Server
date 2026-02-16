import express from 'express';
import {
  addRawMaterialType,
  getAllRawMaterialTypes,
  getOneRawMaterialType,
  updateRawMaterialType,
  deleteRawMaterialType
} from '../contollers/RawMaterialTypeControllers.js';

const router = express.Router();

// Routes
router.post('/add-material-type', addRawMaterialType);
router.get('/get-all-material-types', getAllRawMaterialTypes);
router.get('/get-one-material-type/:id', getOneRawMaterialType);
router.put('/update-material-type/:id', updateRawMaterialType);
router.delete('/delete-material-type/:id', deleteRawMaterialType);

export default router;
