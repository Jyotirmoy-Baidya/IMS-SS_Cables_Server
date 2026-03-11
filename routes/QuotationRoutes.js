import express from 'express';
import {
    createQuotation,
    getAllQuotations,
    getQuotationById,
    updateQuotation,
    patchQuotation,
    deleteQuotation,
    addCoreToQuotation,
    updateCoreInQuotation,
    deleteCoreFromQuotation,
} from '../contollers/QuotationControllers.js';
import { calculateMaterialRequirements } from '../contollers/QuotationMaterialControllers.js';

const router = express.Router();

router.post('/create-quotation', createQuotation);
router.get('/get-all-quotations', getAllQuotations);
router.get('/get-one-quotation/:id', getQuotationById);
router.put('/update-quotation/:id', updateQuotation);
router.patch('/patch-quotation/:id', patchQuotation);
router.delete('/delete-quotation/:id', deleteQuotation);
router.post('/calculate-material-requirements', calculateMaterialRequirements);

// Core management routes
router.post('/:id/cores', addCoreToQuotation);
router.put('/:id/cores/:coreId', updateCoreInQuotation);
router.delete('/:id/cores/:coreId', deleteCoreFromQuotation);

export default router;
