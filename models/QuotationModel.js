import mongoose from 'mongoose';

const deliveryAddressSchema = new mongoose.Schema(
    {
        line1:   { type: String, default: '' },
        city:    { type: String, default: '' },
        state:   { type: String, default: '' },
        pincode: { type: String, default: '' },
        country: { type: String, default: 'India' },
    },
    { _id: false }
);

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

        // Cable configuration (stored as-is from frontend state)
        cableLength:    { type: Number, default: 100 },
        cores:          { type: mongoose.Schema.Types.Mixed, default: [] },
        sheathGroups:   { type: mongoose.Schema.Types.Mixed, default: [] },
        quoteProcesses: { type: mongoose.Schema.Types.Mixed, default: [] },

        // Cost summary (computed on save by frontend)
        materialCost:        { type: Number, default: 0 },
        processCost:         { type: Number, default: 0 },
        grandTotal:          { type: Number, default: 0 },
        profitMarginPercent: { type: Number, default: 0 },
        profitAmount:        { type: Number, default: 0 },
        finalPrice:          { type: Number, default: 0 },

        // Delivery / notes (updated from list page)
        deliveryType:          { type: String, enum: ['drum', 'bobbin', 'coil', 'packed', 'other', ''], default: '' },
        deliveryQuantity:      { type: String, default: '' },
        expectedDelivery:      { type: Date },
        deliveryAddress:       { type: deliveryAddressSchema, default: () => ({}) },
        sameAsCustomerAddress: { type: Boolean, default: false },
        notes:                 { type: String, default: '' },
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

export default mongoose.model('Quotation', quotationSchema);
