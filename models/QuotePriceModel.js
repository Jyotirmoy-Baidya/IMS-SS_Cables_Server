import mongoose from "mongoose";

const { Schema } = mongoose;

const quotePriceSchema = new Schema(
    {
        // 🔗 Reference to Quotation schema
        quotation: {
            type: Schema.Types.ObjectId,
            ref: "Quotation",
            required: true,
        },

        // 🧾 Whether custom amount is used
        isCustomAmount: {
            type: Boolean,
            default: false,
        },

        // 💰 Custom amount (if manual price)
        customAmount: {
            type: Number,
        },

        // 📈 Profit details
        profitMargin: {
            type: Number, // percentage
        },

        profitAmount: {
            type: Number,
        },

        // 💵 Base amount of quote
        quoteBaseAmount: {
            type: Number,
            required: true,
        },

        // ➕ Amount after adding profit
        quoteAfterAddingProfit: {
            type: Number,
            required: true,
        },

        // 🧮 GST %
        gstPercentage: {
            type: Number,
            required: true,
        },

        // 💳 Final price after GST
        quotePriceAfterTax: {
            type: Number,
            required: true,
        },

        // 🔢 Version/Revision tracking
        version: {
            type: Number,
            default: 1,
        },

        // ✅ Is this the final/latest quote price
        isFinal: {
            type: Boolean,
            default: false,
        },

        // 📝 Notes
        notes: {
            type: String,
            default: '',
        },

        // ⚡ Status
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Index for fast queries
quotePriceSchema.index({ quotation: 1, createdAt: -1 });
quotePriceSchema.index({ quotation: 1, isFinal: 1 });

export default mongoose.models.QuotePrice ||
    mongoose.model("QuotePrice", quotePriceSchema);