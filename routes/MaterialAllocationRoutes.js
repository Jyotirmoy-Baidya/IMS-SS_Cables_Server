import express from 'express';
import {
    checkMaterialAvailability,
    allocateMaterials,
    deallocateMaterials,
    convertAllocationToUsage,
} from '../contollers/MaterialAllocationControllers.js';
import { authenticate, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/check-availability', authenticate, isAdmin, checkMaterialAvailability);
router.post('/allocate', authenticate, isAdmin, allocateMaterials);
router.post('/deallocate', authenticate, isAdmin, deallocateMaterials);
router.post('/convert-to-usage', authenticate, isAdmin, convertAllocationToUsage);

export default router;
