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
            ref: 'RawMaterialType',
            required: true
        },
        materialTypeName: { type: String, required: true },
        materialId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'RawMaterial'
        },

        selectedRod: {
            rodId: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial' },
            rodName: { type: String, default: '' },
            diameter: { type: Number, default: 0 },
            density: { type: Number, default: 0 }
        },

        totalCoreArea: { type: Number, default: 0 },
        wireCount: { type: Number, default: 1, min: 1 },
        wireDiameter: { type: Number, default: 0 },
        conductorDiameter: { type: Number, default: 0 },
        drawingLength: { type: Number, default: 0 },
        materialWeight: { type: Number, default: 0 },
        wastagePercent: { type: Number, default: 0, min: 0, max: 100 },
        hasAnnealing: { type: Boolean, default: false }
    },

    // Insulation specifications
    insulation: {
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

        thickness: { type: Number, default: 0, min: 0 },
        density: { type: Number, default: 0 },
        freshPercent: { type: Number, default: 100, min: 0, max: 100 },
        reprocessPercent: { type: Number, default: 0, min: 0, max: 100 },
        wastagePercent: { type: Number, default: 0, min: 0, max: 100 },
        insulatedDiameter: { type: Number, default: 0 },
        insulationWeight: { type: Number, default: 0 }
    },

    // Core length (can be different from cable length)
    coreLength: { type: Number, default: 0 },

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

// Calculate dimensions and material requirements before save
CoreSchema.pre('save', async function () {
    const coreLength = this.coreLength || 0;
    const materialRequired = [];

    // ═══════════════════════════════════════════════════════
    // CONDUCTOR CALCULATIONS
    // ═══════════════════════════════════════════════════════
    if (this.conductor?.totalCoreArea && this.conductor?.wireCount) {
        const totalCoreArea = this.conductor.totalCoreArea;
        const wireCount = this.conductor.wireCount;
        const density = this.conductor.selectedRod?.density || 8.96;
        const wastagePercent = this.conductor.wastagePercent || 0;

        // Calculate wire dimensions
        const areaPerWire = totalCoreArea / wireCount;
        const wireDiameter = 2 * Math.sqrt(areaPerWire / Math.PI);
        this.conductor.wireDiameter = parseFloat(wireDiameter.toFixed(4));

        // Calculate conductor diameter (stranded wire packing)
        const calculateCoreDiameter = (wireDia, wCount) => {
            if (wCount === 1) return wireDia;
            return Math.sqrt(wCount) * wireDia / 2;
        };
        const conductorDiameter = calculateCoreDiameter(wireDiameter, wireCount);
        this.conductor.conductorDiameter = parseFloat(conductorDiameter.toFixed(4));

        // Calculate drawing length
        this.conductor.drawingLength = parseFloat((coreLength * wireCount).toFixed(2));

        // Calculate material weight with wastage
        const materialWeight = (totalCoreArea * coreLength * density * (1 + wastagePercent / 100)) / 1000;
        this.conductor.materialWeight = parseFloat(materialWeight.toFixed(4));

        // Add to material requirements
        if (materialWeight > 0 && this.conductor.materialId) {
            materialRequired.push({
                materialId: this.conductor.materialId,
                materialName: this.conductor.selectedRod?.rodName || this.conductor.materialTypeName || 'Metal',
                category: 'metal',
                purpose: 'conductor-' + (this.conductor.materialTypeName || 'metal').toLowerCase(),
                weight: parseFloat(materialWeight.toFixed(4)),
                type: 'fresh',
                pricePerKg: 0, // Will be set from inventory if available
                totalCost: 0
            });
        }
    }

    // ═══════════════════════════════════════════════════════
    // INSULATION CALCULATIONS
    // ═══════════════════════════════════════════════════════
    if (this.insulation && this.conductor?.conductorDiameter > 0) {
        const conductorDiameter = this.conductor.conductorDiameter;
        const thickness = this.insulation.thickness || 0;
        const freshPercent = this.insulation.freshPercent || 0;
        const reprocessPercent = this.insulation.reprocessPercent || 0;
        const wastagePercent = this.insulation.wastagePercent || 0;
        const freshDensity = this.insulation.density || 1.4;
        const reprocessDensity = this.insulation.density || freshDensity;

        // Calculate insulated diameter
        const insulatedDiameter = conductorDiameter + (2 * thickness);
        this.insulation.insulatedDiameter = parseFloat(insulatedDiameter.toFixed(4));

        // Calculate insulation volume
        const outerRadius = insulatedDiameter / 2;
        const innerRadius = conductorDiameter / 2;
        const volumeMm3 = Math.PI * (outerRadius ** 2 - innerRadius ** 2) * coreLength * 1000;
        const volumeCm3 = volumeMm3 / 1000;

        // Calculate fresh insulation weight with wastage
        const freshWeight = (volumeCm3 * (freshPercent / 100) * freshDensity * (1 + wastagePercent / 100)) / 1000;

        // Calculate reprocess insulation weight with wastage
        const reprocessWeight = (volumeCm3 * (reprocessPercent / 100) * reprocessDensity * (1 + wastagePercent / 100)) / 1000;

        // Total insulation weight
        this.insulation.insulationWeight = parseFloat((freshWeight + reprocessWeight).toFixed(4));

        // Add fresh insulation material
        if (freshWeight > 0 && this.insulation.materialId && freshPercent > 0) {
            materialRequired.push({
                materialId: this.insulation.materialId,
                materialName: this.insulation.materialTypeName || 'Insulation',
                category: 'insulation',
                purpose: 'insulation-fresh',
                weight: parseFloat(freshWeight.toFixed(4)),
                type: 'fresh',
                pricePerKg: 0,
                totalCost: 0
            });
        }

        // Add reprocess insulation material
        if (reprocessWeight > 0 && reprocessPercent > 0) {
            const reprocessMaterialId = this.insulation.reprocessMaterialId || this.insulation.materialId;
            const reprocessMaterialName = this.insulation.materialTypeName || 'Insulation';

            if (reprocessMaterialId) {
                materialRequired.push({
                    materialId: reprocessMaterialId,
                    materialName: reprocessMaterialName,
                    category: 'insulation',
                    purpose: 'insulation-reprocess',
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

export default mongoose.model('Core', CoreSchema);
