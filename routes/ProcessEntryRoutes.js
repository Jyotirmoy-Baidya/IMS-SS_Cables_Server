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

const router = express.Router();

// Add process to parent entities
router.post('/add-to-core/:coreId', addProcessToCore);
router.post('/add-to-sheath/:sheathId', addProcessToSheath);
router.post('/add-to-quote/:quotationId', addProcessToQuotation);

// CRUD operations on process entries
router.put('/edit-process-entry/:id', updateProcessEntry);
router.delete('/delete-process-entry/:id', deleteProcessEntry);
router.get('/get-process-entry/:id', getProcessEntry);

// Get all process entries for a parent
router.get('/get-by-parent', getProcessEntriesByParent);

export default router;
