import express from 'express';
import {
  addSupplier,
  getAllSuppliers,
  getOneSupplier,
  updateSupplier,
  deleteSupplier
} from '../contollers/SupplierControllers.js';

const router = express.Router();

// Routes
router.post('/add-supplier', addSupplier);
router.get('/get-all-suppliers', getAllSuppliers);
router.get('/get-one-supplier/:id', getOneSupplier);
router.put('/update-supplier/:id', updateSupplier);
router.delete('/delete-supplier/:id', deleteSupplier);

export default router;
