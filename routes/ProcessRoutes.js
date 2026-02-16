import express from 'express';
import {
    addProcess,
    getAllProcesses,
    getOneProcess,
    updateProcess,
    deleteProcess
} from '../contollers/ProcessControllers.js';

const router = express.Router();

router.post('/add-process', addProcess);
router.get('/get-all-processes', getAllProcesses);
router.get('/get-one-process/:id', getOneProcess);
router.put('/update-process/:id', updateProcess);
router.delete('/delete-process/:id', deleteProcess);

export default router;
