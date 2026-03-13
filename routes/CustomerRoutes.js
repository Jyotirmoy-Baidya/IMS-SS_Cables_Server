import express from "express";
import {
    createCustomer,
    getAllCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomer,
} from "../contollers/CustomerControllers.js";
import { authenticate, isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

/* CRUD ROUTES - All require authentication and admin access */
router.post("/add-customer", authenticate, isAdmin, createCustomer);
router.get("/get-all-customer", authenticate, isAdmin, getAllCustomers);
router.get("/get-one-customer/:id", authenticate, isAdmin, getCustomerById);
router.put("/update-customers/:id", authenticate, isAdmin, updateCustomer);
router.delete("/delete-customers/:id", authenticate, isAdmin, deleteCustomer);

export default router;
