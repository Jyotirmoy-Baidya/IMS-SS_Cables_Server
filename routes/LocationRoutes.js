import express from 'express';
import {
    createLocation,
    getAllLocations,
    getLocationById,
    updateLocation,
    deleteLocation,
} from '../contollers/LocationControllers.js';

const router = express.Router();

router.post('/create-location', createLocation);
router.get('/get-all-locations', getAllLocations);
router.get('/get-location/:id', getLocationById);
router.put('/update-location/:id', updateLocation);
router.delete('/delete-location/:id', deleteLocation);

export default router;
