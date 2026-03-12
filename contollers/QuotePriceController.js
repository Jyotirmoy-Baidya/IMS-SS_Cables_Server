import QuotePriceModel from "../models/QuotePriceModel.js";



// 🧮 Helper — Calculate price fields
const calculateQuotePriceModel = (data) => {
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
export const createQuotePriceModel = async (req, res) => {
    try {
        const { quotation } = req.body;

        // Mark all previous quote prices for this quotation as not final
        await QuotePriceModel.updateMany(
            { quotation, isFinal: true },
            { isFinal: false }
        );

        // Get the latest version number
        const latestQuotePriceModel = await QuotePriceModel.findOne({ quotation })
            .sort({ version: -1 })
            .limit(1);

        const nextVersion = latestQuotePriceModel ? latestQuotePriceModel.version + 1 : 1;

        const calc = calculateQuotePriceModel(req.body);

        // Create new quote price with isFinal: true
        const quotePrice = await QuotePriceModel.create({
            ...req.body,
            ...calc,
            version: nextVersion,
            isFinal: true,
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
export const getAllQuotePriceModels = async (req, res) => {
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
export const getQuotePriceModelById = async (req, res) => {
    try {
        const data = await QuotePriceModel.findById(req.params.id)
            .populate("quotation");

        if (!data) {
            return res.status(404).json({
                message: "QuotePriceModel not found",
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
        const data = await QuotePriceModel.find({
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
export const updateQuotePriceModel = async (req, res) => {
    try {
        const calc = calculateQuotePriceModel(req.body);

        const updated = await QuotePriceModel.findByIdAndUpdate(
            req.params.id,
            { ...req.body, ...calc },
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({
                message: "QuotePriceModel not found",
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
export const deleteQuotePriceModel = async (req, res) => {
    try {
        const deleted = await QuotePriceModel.findByIdAndDelete(
            req.params.id
        );

        if (!deleted) {
            return res.status(404).json({
                message: "QuotePriceModel not found",
            });
        }

        res.json({
            success: true,
            message: "QuotePriceModel deleted successfully",
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};