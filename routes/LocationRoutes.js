import express from 'express';
import {
    createLocation,
    getAllLocations,
    getLocationById,
    updateLocation,
    deleteLocation,
} from '../contollers/LocationControllers.js';
import { authenticate, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/create-location', authenticate, isAdmin, createLocation);
router.get('/get-all-locations', authenticate, isAdmin, getAllLocations);
router.get('/get-location/:id', authenticate, isAdmin, getLocationById);
router.put('/update-location/:id', authenticate, isAdmin, updateLocation);
router.delete('/delete-location/:id', authenticate, isAdmin, deleteLocation);

export default router;
