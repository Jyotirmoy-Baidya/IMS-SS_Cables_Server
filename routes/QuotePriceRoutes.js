import express from "express";
import {
    createQuotePriceModel,
    getAllQuotePriceModels,
    getQuotePriceModelById,
    getByQuotationId,
    updateQuotePriceModel,
    deleteQuotePriceModel,
} from "../contollers/QuotePriceController.js";

const router = express.Router();

router.post("/", createQuotePriceModel);
router.get("/", getAllQuotePriceModels);
router.get("/:id", getQuotePriceModelById);
router.get("/quotation/:quotationId", getByQuotationId);
router.put("/:id", updateQuotePriceModel);
router.delete("/:id", deleteQuotePriceModel);

export default router;