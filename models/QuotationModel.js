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

// Core insulation schema
const coreInsulationSchema = new mongoose.Schema({
    materialTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RawMaterial'
    },
    materialTypeName: { type: String, default: '' },
    density: { type: Number, default: 1.4 },
    thickness: { type: Number, default: 0.5 },
    freshPercent: { type: Number, default: 70, min: 0, max: 100 },
    reprocessPercent: { type: Number, default: 30, min: 0, max: 100 },
    freshPricePerKg: { type: Number, default: 0 },
    reprocessMaterialTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RawMaterial'
    },
    reprocessMaterialTypeName: { type: String, default: '' },
    reprocessDensity: { type: Number, default: null },
    reprocessPricePerKg: { type: Number, default: 0 }
}, { _id: false });

// Core schema
const coreSchema = new mongoose.Schema({
    materialTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RawMaterial'
    },
    materialDensity: { type: Number, default: 8.96 },
    totalCoreArea: { type: Number, default: 8 },
    wireCount: { type: Number, default: 16 },
    wastagePercent: { type: Number, default: 5 },
    selectedRod: { type: mongoose.Schema.Types.Mixed, default: null },
    hasAnnealing: { type: Boolean, default: false },
    coreLength: { type: Number, default: null },  // Individual core length (defaults to cable length if null)
    processes: [processEntrySchema],  // Processes for this core
    insulation: { type: coreInsulationSchema, default: () => ({}) }
}, { _id: true });

// Sheath group schema
const sheathGroupSchema = new mongoose.Schema({
    coreIds: [{ type: mongoose.Schema.Types.ObjectId }],
    sheathIds: [{ type: mongoose.Schema.Types.ObjectId }],
    material: { type: String, default: '' },
    materialTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RawMaterial'
    },
    density: { type: Number, default: 1.4 },
    thickness: { type: Number, default: 1.0 },
    freshPercent: { type: Number, default: 60, min: 0, max: 100 },
    reprocessPercent: { type: Number, default: 40, min: 0, max: 100 },
    freshPricePerKg: { type: Number, default: 0 },
    reprocessMaterialTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RawMaterial'
    },
    reprocessMaterialTypeName: { type: String, default: '' },
    reprocessDensity: { type: Number, default: null },
    reprocessPricePerKg: { type: Number, default: 0 },
    processes: [processEntrySchema]  // Processes for this sheath
}, { _id: true });

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
        cableLength:    { type: Number, default: 100 },
        cores:          { type: [coreSchema], default: [] },
        sheathGroups:   { type: [sheathGroupSchema], default: [] },
        quoteProcesses: { type: [processEntrySchema], default: [] },

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
