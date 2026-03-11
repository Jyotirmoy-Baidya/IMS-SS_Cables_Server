import express from "express";
import { createQuotePrice, deleteQuotePrice, getAllQuotePrices, getByQuotationId, getQuotePriceById, updateQuotePrice } from "../contollers/QuotePriceController.js";


const router = express.Router();

router.post("/", createQuotePrice);
router.get("/", getAllQuotePrices);
router.get("/:id", getQuotePriceById);
router.get("/quotation/:quotationId", getByQuotationId);
router.put("/:id", updateQuotePrice);
router.delete("/:id", deleteQuotePrice);

export default router;