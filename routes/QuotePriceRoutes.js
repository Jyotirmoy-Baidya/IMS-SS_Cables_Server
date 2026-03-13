import express from "express";
import {
    createQuotePriceModel,
    getAllQuotePriceModels,
    getQuotePriceModelById,
    getByQuotationId,
    updateQuotePriceModel,
    deleteQuotePriceModel,
} from "../contollers/QuotePriceController.js";
import { authenticate, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post("/", authenticate, isAdmin, createQuotePriceModel);
router.get("/", authenticate, isAdmin, getAllQuotePriceModels);
router.get("/:id", authenticate, isAdmin, getQuotePriceModelById);
router.get("/quotation/:quotationId", authenticate, isAdmin, getByQuotationId);
router.put("/:id", authenticate, isAdmin, updateQuotePriceModel);
router.delete("/:id", authenticate, isAdmin, deleteQuotePriceModel);

export default router;