import express from 'express';
import {
    createCore,
    getAllCores,
    getCoreById,
    updateCore,
    deleteCore,
    deactivateCore
} from '../contollers/CoreControllers.js';

const router = express.Router();

router.post('/create-core', createCore);
router.get('/get-all-cores', getAllCores);
router.get('/get-core/:id', getCoreById);
router.put('/update-core/:id', updateCore);
router.delete('/delete-core/:id', deleteCore);
router.patch('/deactivate-core/:id', deactivateCore);

export default router;
