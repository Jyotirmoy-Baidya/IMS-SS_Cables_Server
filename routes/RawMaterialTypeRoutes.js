import express from 'express';
import {
  addRawMaterialType,
  getAllRawMaterialTypes,
  getOneRawMaterialType,
  updateRawMaterialType,
  deleteRawMaterialType
} from '../contollers/RawMaterialTypeControllers.js';
import { authenticate, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Routes
router.post('/add-material-type', authenticate, isAdmin, addRawMaterialType);
router.get('/get-all-material-types', authenticate, isAdmin, getAllRawMaterialTypes);
router.get('/get-one-material-type/:id', authenticate, isAdmin, getOneRawMaterialType);
router.put('/update-material-type/:id', authenticate, isAdmin, updateRawMaterialType);
router.delete('/delete-material-type/:id', authenticate, isAdmin, deleteRawMaterialType);

export default router;
