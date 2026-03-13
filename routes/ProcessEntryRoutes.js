import express from 'express';
import {
    addProcessToCore,
    addProcessToSheath,
    addProcessToQuotation,
    updateProcessEntry,
    deleteProcessEntry,
    getProcessEntry,
    getProcessEntriesByParent
} from '../contollers/ProcessEntryControllers.js';
import { authenticate, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Add process to parent entities
router.post('/add-to-core/:coreId', authenticate, isAdmin, addProcessToCore);
router.post('/add-to-sheath/:sheathId', authenticate, isAdmin, addProcessToSheath);
router.post('/add-to-quote/:quotationId', authenticate, isAdmin, addProcessToQuotation);

// CRUD operations on process entries
router.put('/edit-process-entry/:id', authenticate, isAdmin, updateProcessEntry);
router.delete('/delete-process-entry/:id', authenticate, isAdmin, deleteProcessEntry);
router.get('/get-process-entry/:id', authenticate, isAdmin, getProcessEntry);

// Get all process entries for a parent
router.get('/get-by-parent', authenticate, isAdmin, getProcessEntriesByParent);

export default router;
