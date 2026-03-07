import express from 'express';
import {
    addIntermediateProduct,
    getAllIntermediateProducts,
    getOneIntermediateProduct,
    updateIntermediateProduct,
    deleteIntermediateProduct
} from '../contollers/IntermediateProductControllers.js';

const router = express.Router();

router.post('/add-intermediate-product', addIntermediateProduct);
router.get('/get-all-intermediate-products', getAllIntermediateProducts);
router.get('/get-one-intermediate-product/:id', getOneIntermediateProduct);
router.put('/update-intermediate-product/:id', updateIntermediateProduct);
router.delete('/delete-intermediate-product/:id', deleteIntermediateProduct);

export default router;
