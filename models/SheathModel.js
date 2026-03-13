import mongoose from 'mongoose';

const MaterialRequirementSchema = new mongoose.Schema({
    materialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RawMaterial',
        required: true
    },
    materialName: { type: String, required: true },
    category: {
        type: String,
        enum: ['metal', 'insulation', 'sheath', 'other'],
        required: true
    },
    purpose: { type: String, default: '' }, // e.g., 'sheath-fresh', 'sheath-reprocess'
    weight: { type: Number, required: true, min: 0 },
    type: {
        type: String,
        enum: ['fresh', 'reprocess'],
        default: 'fresh'
    },

    // Cost snapshot (at time of sheath creation)
    pricePerKg: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 }
}, { _id: false });

const SheathSchema = new mongoose.Schema({
    // Basic info
    name: { type: String, default: '' },
    sheathNumber: { type: Number, required: true },

    // References to cores and nested sheaths
    coreIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Core'
    }],
    sheathIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sheath'
    }],

    // Material specifications
    freshMaterialTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RawMaterialType'
    },
    freshMaterialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RawMaterial'
    },
    reprocessMaterialTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RawMaterialType'
    },
    reprocessMaterialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RawMaterial'
    },

    // Calculated dimensions
    innerArea: { type: Number, default: 0 },
    innerDiameter: { type: Number, default: 0 },
    outerArea: { type: Number, default: 0 },
    outerDiameter: { type: Number, default: 0 },

    thickness: { type: Number, default: 0, min: 0 },
    freshSheathDensity: { type: Number, default: 0 },
    freshSheathPercent: { type: Number, default: 100, min: 0, max: 100 },
    freshSheathWeight: { type: Number, default: 0 },
    reprocessSheathDensity: { type: Number, default: 0 },
    reprocessSheathPercent: { type: Number, default: 0, min: 0, max: 100 },
    reprocessSheathWeight: { type: Number, default: 0 },
    wastageSheathPercent: { type: Number, default: 0, min: 0, max: 100 },

    // Sheath length (can be different from cable length)
    sheathLength: { type: Number, default: 0 },

    // Material requirements (calculated and stored with pricing)
    materialRequired: {
        type: [MaterialRequirementSchema],
        default: []
    },

    // Process entries with calculated outputs (references)
    processes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProcessEntry'
    }],

    // Total costs (snapshot)
    costs: {
        totalMaterialCost: { type: Number, default: 0 },
        totalProcessCost: { type: Number, default: 0 },
        grandTotal: { type: Number, default: 0 }
    },

    notes: { type: String, default: '' },

    // Reference to quotation
    quotationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quotation'
    },

    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Index for fast queries
SheathSchema.index({ quotationId: 1, isActive: 1 });
SheathSchema.index({ sheathNumber: 1 });

export default mongoose.model('Sheath', SheathSchema);
