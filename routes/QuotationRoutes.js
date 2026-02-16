import express from 'express';
import {
    createQuotation,
    getAllQuotations,
    getQuotationById,
    updateQuotation,
    patchQuotation,
    deleteQuotation,
} from '../contollers/QuotationControllers.js';

const router = express.Router();

router.post('/create-quotation', createQuotation);
router.get('/get-all-quotations', getAllQuotations);
router.get('/get-one-quotation/:id', getQuotationById);
router.put('/update-quotation/:id', updateQuotation);
router.patch('/patch-quotation/:id', patchQuotation);
router.delete('/delete-quotation/:id', deleteQuotation);

export default router;
