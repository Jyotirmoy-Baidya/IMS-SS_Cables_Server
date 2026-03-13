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
    addSheathToQuotation,
    updateSheathInQuotation,
    deleteSheathFromQuotation,
} from '../contollers/QuotationControllers.js';
import { authenticate, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication and admin access
router.post('/create-quotation', authenticate, isAdmin, createQuotation);
router.get('/get-all-quotations', authenticate, isAdmin, getAllQuotations);
router.get('/get-one-quotation/:id', authenticate, isAdmin, getQuotationById);
router.put('/update-quotation/:id', authenticate, isAdmin, updateQuotation);
router.patch('/patch-quotation/:id', authenticate, isAdmin, patchQuotation);
router.delete('/delete-quotation/:id', authenticate, isAdmin, deleteQuotation);

// Core management routes
router.post('/:id/cores', authenticate, isAdmin, addCoreToQuotation);
router.put('/:id/cores/:coreId', authenticate, isAdmin, updateCoreInQuotation);
router.delete('/:id/cores/:coreId', authenticate, isAdmin, deleteCoreFromQuotation);

// Sheath management routes
router.post('/:id/sheaths', authenticate, isAdmin, addSheathToQuotation);
router.put('/:id/sheaths/:sheathId', authenticate, isAdmin, updateSheathInQuotation);
router.delete('/:id/sheaths/:sheathId', authenticate, isAdmin, deleteSheathFromQuotation);

export default router;
