import express from 'express';
import {
    checkMaterialAvailability,
    allocateMaterials,
    deallocateMaterials,
    convertAllocationToUsage,
} from '../contollers/MaterialAllocationControllers.js';

const router = express.Router();

router.post('/check-availability', checkMaterialAvailability);
router.post('/allocate', allocateMaterials);
router.post('/deallocate', deallocateMaterials);
router.post('/convert-to-usage', convertAllocationToUsage);

export default router;
