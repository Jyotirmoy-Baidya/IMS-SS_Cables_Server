import mongoose from 'mongoose';

const ProcessEntrySchema = new mongoose.Schema({
    processId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Process',
        required: true
    },
    processName: { type: String, required: true },
    category: { type: String, default: '' },

    // Cost information (snapshot at time of addition)
    processCost: { type: Number, default: 0 },

    // Calculated output (generated when saved)
    output: {
        outputType: {
            type: String,
            enum: ['intermediate', 'final', 'none'],
            default: 'none'
        },
        calculatedQuantity: { type: Number, default: 0 },
        calculatedItemName: { type: String, default: '' },
        calculatedSpecification: { type: String, default: '' },
        unit: { type: String, default: 'm' },

    }
}, { _id: true });

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
    purpose: { type: String, default: '' }, // e.g., 'conductor-copper', 'insulation-fresh'
    weight: { type: Number, required: true, min: 0 },
    type: {
        type: String,
        enum: ['fresh', 'reprocess'],
        default: 'fresh'
    },

    // Cost snapshot (at time of core creation)
    pricePerKg: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 }
}, { _id: false });

const CoreSchema = new mongoose.Schema({
    // Basic info
    name: { type: String, default: '' },
    coreNumber: { type: Number, required: true },

    // Conductor specifications
    conductor: {
        materialTypeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'RawMaterialType'
        },
        materialTypeName: { type: String },
        materialId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'RawMaterial'
        },

        selectedRod: {
            rodId: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial' }
        },

        materialDensity: { type: Number, default: 0 },
        totalCoreArea: { type: Number, default: 0 },
        wireCount: { type: Number, default: 1, min: 1 },
        wireDiameter: { type: Number, default: 0 },
        conductorDiameter: { type: Number, default: 0 },
        drawingLength: { type: Number, default: 0 },
        materialWeight: { type: Number, default: 0 },
        wastagePercent: { type: Number, default: 0, min: 0, max: 100 },
        hasAnnealing: { type: Boolean, default: false }
    },

    // Insulation specifications (optional - only if insulation is added)
    insulation: {
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
        thickness: { type: Number, default: 0, min: 0 },
        freshDensity: { type: Number, default: 0 },
        freshPercent: { type: Number, default: 100, min: 0, max: 100 },
        freshWeight: { type: Number, default: 0 },
        reprocessDensity: { type: Number, default: 0 },
        reprocessPercent: { type: Number, default: 0, min: 0, max: 100 },
        reprocessWeight: { type: Number, default: 0 },
        wastagePercent: { type: Number, default: 0, min: 0, max: 100 }
    },

    // Core length (can be different from cable length)
    coreLength: { type: Number, default: 0 },

    coreOuterAreaWithInsulation: { type: Number, default: 0 },

    // Material requirements (calculated and stored with pricing)
    materialRequired: {
        type: [MaterialRequirementSchema],
        default: []
    },

    // Process entries with calculated outputs
    processes: {
        type: [ProcessEntrySchema],
        default: []
    },

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
CoreSchema.index({ quotationId: 1, isActive: 1 });
CoreSchema.index({ coreNumber: 1 });

export default mongoose.model('Core', CoreSchema);
