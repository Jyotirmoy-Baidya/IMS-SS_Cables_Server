import express from 'express';
import {
    addCore,
    getAllCores,
    getOneCore,
    updateCore,
    deleteCore
} from '../contollers/CoreControllers.js';

const router = express.Router();

router.post('/add-core', addCore);
router.get('/get-all-cores', getAllCores);
router.get('/get-one-core/:id', getOneCore);
router.put('/update-core/:id', updateCore);
router.delete('/delete-core/:id', deleteCore);

export default router;
