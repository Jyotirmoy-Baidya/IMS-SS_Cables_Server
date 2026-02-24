import express from 'express';
import {
    createUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
} from '../contollers/UserControllers.js';

const router = express.Router();

router.post('/create-user', createUser);
router.get('/get-all-users', getAllUsers);
router.get('/get-one-user/:id', getUserById);
router.put('/update-user/:id', updateUser);
router.delete('/delete-user/:id', deleteUser);

export default router;
