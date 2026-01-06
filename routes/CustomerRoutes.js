import express from "express";
import {
    createCustomer,
    getAllCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomer,
} from "../contollers/CustomerControllers";

const router = express.Router();

/* CRUD ROUTES */
router.post("/add-customer", createCustomer);           // Create
router.get("/get-all-customer", getAllCustomers);            // Read all
router.get("/get-one-customer/:id", getCustomerById);         // Read one
router.put("/update-customers/:id", updateCustomer);          // Update
router.delete("/delete-customers/:id", deleteCustomer);       // Delete

export default router;
