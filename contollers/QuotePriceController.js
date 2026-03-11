import QuotePriceModel from "../models/QuotePriceModel.js";



// 🧮 Helper — Calculate price fields
const calculateQuotePrice = (data) => {
    let baseAmount = data.quoteBaseAmount;
    let profitAmount = 0;
    let afterProfit = baseAmount;

    // 👉 If custom amount is used
    if (data.isCustomAmount && data.customAmount != null) {
        afterProfit = data.customAmount;
    } else {
        // Profit calculation
        if (data.profitMargin != null) {
            profitAmount = (baseAmount * data.profitMargin) / 100;
        } else if (data.profitAmount != null) {
            profitAmount = data.profitAmount;
        }

        afterProfit = baseAmount + profitAmount;
    }

    // GST calculation
    const gstAmount =
        (afterProfit * (data.gstPercentage || 0)) / 100;

    const finalPrice = afterProfit + gstAmount;

    return {
        profitAmount,
        quoteAfterAddingPrice: afterProfit,
        quotePriceAfterTax: finalPrice,
    };
};



/* ========================================================= */
/* 🟢 CREATE QUOTE PRICE */
/* ========================================================= */
export const createQuotePrice = async (req, res) => {
    try {
        const calc = calculateQuotePrice(req.body);

        const quotePrice = await QuotePrice.create({
            ...req.body,
            ...calc,
        });

        res.status(201).json({
            success: true,
            data: quotePrice,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



/* ========================================================= */
/* 🔵 GET ALL */
/* ========================================================= */
export const getAllQuotePrices = async (req, res) => {
    try {
        const data = await QuotePriceModel.find()
            .populate("quotation")
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: data.length,
            data,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



/* ========================================================= */
/* 🟡 GET BY ID */
/* ========================================================= */
export const getQuotePriceById = async (req, res) => {
    try {
        const data = await QuotePrice.findById(req.params.id)
            .populate("quotation");

        if (!data) {
            return res.status(404).json({
                message: "QuotePrice not found",
            });
        }

        res.json({
            success: true,
            data,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



/* ========================================================= */
/* 🟣 GET BY QUOTATION ID */
/* ========================================================= */
export const getByQuotationId = async (req, res) => {
    try {
        const data = await QuotePrice.find({
            quotation: req.params.quotationId,
        }).populate("quotation");

        res.json({
            success: true,
            data,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



/* ========================================================= */
/* 🟠 UPDATE */
/* ========================================================= */
export const updateQuotePrice = async (req, res) => {
    try {
        const calc = calculateQuotePrice(req.body);

        const updated = await QuotePrice.findByIdAndUpdate(
            req.params.id,
            { ...req.body, ...calc },
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({
                message: "QuotePrice not found",
            });
        }

        res.json({
            success: true,
            data: updated,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



/* ========================================================= */
/* 🔴 DELETE */
/* ========================================================= */
export const deleteQuotePrice = async (req, res) => {
    try {
        const deleted = await QuotePrice.findByIdAndDelete(
            req.params.id
        );

        if (!deleted) {
            return res.status(404).json({
                message: "QuotePrice not found",
            });
        }

        res.json({
            success: true,
            message: "QuotePrice deleted successfully",
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};