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
    costFormula: { type: String, default: '' },

    // Variables used in calculation
    variables: [{
        name: String,
        label: String,
        value: Number,
        unit: String,
        source: String
    }],

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

        // Templates for reference
        quantityFormula: { type: String, default: '' },
        itemNameTemplate: { type: String, default: '' },
        specificationTemplate: { type: String, default: '' }
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
    materialTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RawMaterialType',
        required: true
    },
    materialTypeName: { type: String, required: true },
    materialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RawMaterial'
    },
    reprocessMaterialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RawMaterial'
    },

    // Sheath specifications
    thickness: { type: Number, default: 0, min: 0 },
    density: { type: Number, default: 0 },
    freshPercent: { type: Number, default: 100, min: 0, max: 100 },
    reprocessPercent: { type: Number, default: 0, min: 0, max: 100 },
    wastagePercent: { type: Number, default: 0, min: 0, max: 100 },

    // Calculated dimensions
    innerArea: { type: Number, default: 0 },
    innerDiameter: { type: Number, default: 0 },
    outerArea: { type: Number, default: 0 },
    outerDiameter: { type: Number, default: 0 },
    sheathWeight: { type: Number, default: 0 },

    // Sheath length (can be different from cable length)
    sheathLength: { type: Number, default: 0 },

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
SheathSchema.index({ quotationId: 1, isActive: 1 });
SheathSchema.index({ sheathNumber: 1 });

// Calculate dimensions and material requirements before save
SheathSchema.pre('save', async function () {
    const sheathLength = this.sheathLength || 0;
    const materialRequired = [];

    // Populate cores and nested sheaths if needed
    if (this.coreIds && this.coreIds.length > 0 && !this.populated('coreIds')) {
        await this.populate('coreIds');
    }
    if (this.sheathIds && this.sheathIds.length > 0 && !this.populated('sheathIds')) {
        await this.populate('sheathIds');
    }

    // ═══════════════════════════════════════════════════════
    // CALCULATE INNER DIMENSIONS FROM CORES AND NESTED SHEATHS
    // ═══════════════════════════════════════════════════════
    const innerDiameters = [];
    const innerAreas = [];

    // Get dimensions from cores
    if (this.coreIds && Array.isArray(this.coreIds)) {
        this.coreIds.forEach(core => {
            if (core && core.insulation?.insulatedDiameter) {
                const diameter = core.insulation.insulatedDiameter;
                innerDiameters.push(diameter);
                innerAreas.push((Math.PI * diameter * diameter) / 4);
            }
        });
    }

    // Get dimensions from nested sheaths
    if (this.sheathIds && Array.isArray(this.sheathIds)) {
        this.sheathIds.forEach(sheath => {
            if (sheath && sheath.outerDiameter) {
                const diameter = sheath.outerDiameter;
                innerDiameters.push(diameter);
                innerAreas.push((Math.PI * diameter * diameter) / 4);
            }
        });
    }

    // Calculate bundle dimensions
    if (innerAreas.length > 0) {
        const totalInnerArea = innerAreas.reduce((sum, area) => sum + area, 0);
        const bundleDiameter = Math.sqrt((totalInnerArea * 4) / Math.PI);

        this.innerArea = parseFloat(totalInnerArea.toFixed(4));
        this.innerDiameter = parseFloat(bundleDiameter.toFixed(4));

        // ═══════════════════════════════════════════════════════
        // CALCULATE SHEATH DIMENSIONS AND MATERIAL
        // ═══════════════════════════════════════════════════════
        const thickness = this.thickness || 0;
        const outerDiameter = bundleDiameter + (2 * thickness);
        const outerArea = (Math.PI * outerDiameter * outerDiameter) / 4;

        this.outerDiameter = parseFloat(outerDiameter.toFixed(4));
        this.outerArea = parseFloat(outerArea.toFixed(4));

        // Calculate sheath volume
        const outerRadius = outerDiameter / 2;
        const innerRadius = bundleDiameter / 2;
        const volumeMm3 = Math.PI * (outerRadius ** 2 - innerRadius ** 2) * sheathLength * 1000;
        const volumeCm3 = volumeMm3 / 1000;

        const wastagePercent = this.wastagePercent || 0;
        const freshPercent = this.freshPercent || 0;
        const reprocessPercent = this.reprocessPercent || 0;
        const freshDensity = this.density || 1.4;
        const reprocessDensity = this.density || freshDensity;

        // Calculate fresh sheath weight with wastage
        const freshWeight = (volumeCm3 * (freshPercent / 100) * freshDensity * (1 + wastagePercent / 100)) / 1000;

        // Calculate reprocess sheath weight with wastage
        const reprocessWeight = (volumeCm3 * (reprocessPercent / 100) * reprocessDensity * (1 + wastagePercent / 100)) / 1000;

        // Total sheath weight
        this.sheathWeight = parseFloat((freshWeight + reprocessWeight).toFixed(4));

        // Add fresh sheath material
        if (freshWeight > 0 && this.materialId && freshPercent > 0) {
            materialRequired.push({
                materialId: this.materialId,
                materialName: this.materialTypeName || 'Sheath',
                category: 'sheath',
                purpose: 'sheath-fresh',
                weight: parseFloat(freshWeight.toFixed(4)),
                type: 'fresh',
                pricePerKg: 0,
                totalCost: 0
            });
        }

        // Add reprocess sheath material
        if (reprocessWeight > 0 && reprocessPercent > 0) {
            const reprocessMaterialId = this.reprocessMaterialId || this.materialId;
            const reprocessMaterialName = this.materialTypeName || 'Sheath';

            if (reprocessMaterialId) {
                materialRequired.push({
                    materialId: reprocessMaterialId,
                    materialName: reprocessMaterialName,
                    category: 'sheath',
                    purpose: 'sheath-reprocess',
                    weight: parseFloat(reprocessWeight.toFixed(4)),
                    type: 'reprocess',
                    pricePerKg: 0,
                    totalCost: 0
                });
            }
        }
    }

    // Assign calculated materials
    this.materialRequired = materialRequired;

    // Calculate costs (process costs calculated from processes array)
    const materialCost = materialRequired.reduce((sum, m) => sum + (m.totalCost || 0), 0);
    const processCost = (this.processes || []).reduce((sum, p) => sum + (p.processCost || 0), 0);

    this.costs.totalMaterialCost = parseFloat(materialCost.toFixed(2));
    this.costs.totalProcessCost = parseFloat(processCost.toFixed(2));
    this.costs.grandTotal = parseFloat((materialCost + processCost).toFixed(2));
});

export default mongoose.model('Sheath', SheathSchema);
