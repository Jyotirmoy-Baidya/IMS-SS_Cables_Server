import express from 'express';
import {
  addSupplier,
  getAllSuppliers,
  getOneSupplier,
  updateSupplier,
  deleteSupplier
} from '../contollers/SupplierControllers.js';
import { authenticate, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Routes - All require authentication and admin access
router.post('/add-supplier', authenticate, isAdmin, addSupplier);
router.get('/get-all-suppliers', authenticate, isAdmin, getAllSuppliers);
router.get('/get-one-supplier/:id', authenticate, isAdmin, getOneSupplier);
router.put('/update-supplier/:id', authenticate, isAdmin, updateSupplier);
router.delete('/delete-supplier/:id', authenticate, isAdmin, deleteSupplier);

export default router;
