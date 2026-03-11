import mongoose from 'mongoose';

const deliveryAddressSchema = new mongoose.Schema(
    {
        line1: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        pincode: { type: String, default: '' },
        country: { type: String, default: 'India' },
    },
    { _id: false }
);

// Process entry schema for cores and sheaths
const processEntrySchema = new mongoose.Schema({
    processId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Process',
        required: true
    },
    processName: { type: String, required: true },
    category: { type: String, default: '' },
    formula: { type: String, default: '' },
    formulaNote: { type: String, default: '' },
    variables: [{
        name: { type: String, required: true },
        label: { type: String, required: true },
        unit: { type: String, default: '' },
        source: { type: String, default: 'manual' },
        defaultValue: { type: Number, default: 0 },
        value: { type: Number, default: 0 }
    }]
}, { _id: true });

// Core schema removed - now using Core model reference

// Sheath schema removed - now using Sheath model reference

const quotationSchema = new mongoose.Schema(
    {
        quoteNumber: {
            type: String,
            unique: true,
        },

        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            default: null,
        },

        status: {
            type: String,
            enum: ['enquired', 'pending', 'approved', 'rejected'],
            default: 'enquired',
        },

        // Work order reference (if converted)
        workOrderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'WorkOrder',
            default: null,
        },

        // Cable configuration
        cableLength: { type: Number, default: 100 },
        cores: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Core'
        }],
        sheathGroups: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Sheath'
        }],
        quoteProcesses: { type: [processEntrySchema], default: [] },

        // Cost summary (computed on save by frontend)
        materialCost: { type: Number, default: 0 },
        processCost: { type: Number, default: 0 },
        grandTotal: { type: Number, default: 0 },
        profitMarginPercent: { type: Number, default: 0 },
        profitAmount: { type: Number, default: 0 },
        finalPrice: { type: Number, default: 0 },

        // Delivery / notes (updated from list page)
        deliveryType: { type: String, enum: ['drum', 'bobbin', 'coil', 'packed', 'other', ''], default: '' },
        deliveryQuantity: { type: String, default: '' },
        expectedDelivery: { type: Date },
        deliveryAddress: { type: deliveryAddressSchema, default: () => ({}) },
        sameAsCustomerAddress: { type: Boolean, default: false },
        notes: { type: String, default: '' },
    },
    { timestamps: true }
);

// Auto-generate quoteNumber before validation
quotationSchema.pre('validate', async function () {
    if (this.isNew && !this.quoteNumber) {
        const last = await this.constructor.findOne({}, { quoteNumber: 1 }, { sort: { createdAt: -1 } });
        let seq = 1;
        if (last?.quoteNumber) {
            const match = last.quoteNumber.match(/QT-(\d+)/);
            if (match) seq = parseInt(match[1]) + 1;
        }
        this.quoteNumber = `QT-${String(seq).padStart(5, '0')}`;
    }
});

// Sheaths are now separate documents with their own pre-save hooks
// No need for sheath calculations in quotation pre-save


export default mongoose.model('Quotation', quotationSchema);
