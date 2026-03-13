import express from 'express';
import {
    addIntermediateProduct,
    getAllIntermediateProducts,
    getOneIntermediateProduct,
    updateIntermediateProduct,
    deleteIntermediateProduct
} from '../contollers/IntermediateProductControllers.js';
import { authenticate, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/add-intermediate-product', authenticate, isAdmin, addIntermediateProduct);
router.get('/get-all-intermediate-products', authenticate, isAdmin, getAllIntermediateProducts);
router.get('/get-one-intermediate-product/:id', authenticate, isAdmin, getOneIntermediateProduct);
router.put('/update-intermediate-product/:id', authenticate, isAdmin, updateIntermediateProduct);
router.delete('/delete-intermediate-product/:id', authenticate, isAdmin, deleteIntermediateProduct);

export default router;
