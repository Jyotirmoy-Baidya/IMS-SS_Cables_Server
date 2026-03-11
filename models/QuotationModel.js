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

// Sheath group schema
const sheathGroupSchema = new mongoose.Schema({
    coreIds: [{ type: mongoose.Schema.Types.Mixed }],
    sheathIds: [{ type: mongoose.Schema.Types.Mixed }],
    material: { type: String, default: '' },
    materialTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RawMaterial'
    },
    materialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RawMaterial'
        // Same as materialTypeId (for consistency)
    },
    density: { type: Number, default: 1.4 },
    thickness: { type: Number, default: 1.0 },
    wastagePercent: { type: Number, default: 0, min: 0, max: 100 },
    freshPercent: { type: Number, default: 60, min: 0, max: 100 },
    reprocessPercent: { type: Number, default: 40, min: 0, max: 100 },
    freshPricePerKg: { type: Number, default: 0 },
    reprocessMaterialTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RawMaterial'
    },
    reprocessMaterialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RawMaterial'
        // Actual reprocess raw material instance
    },
    reprocessMaterialTypeName: { type: String, default: '' },
    reprocessDensity: { type: Number, default: null },
    reprocessPricePerKg: { type: Number, default: 0 },
    processes: [processEntrySchema],  // Processes for this sheath

    // Calculated material requirements for this sheath
    materialRequired: [{
        materialId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'RawMaterial'
        },
        materialName: { type: String, default: '' },
        category: {
            type: String,
            enum: ['metal', 'insulation', 'plastic'],
            required: true
        },
        purpose: {
            type: String,
            enum: ['sheath-fresh', 'sheath-reprocess'],
            required: true
        },
        weight: {
            type: Number,
            required: true,
            min: 0
            // Weight in kg
        },
        type: {
            type: String,
            enum: ['fresh', 'reprocess'],
            required: true
        }
    }]
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
        cableLength: { type: Number, default: 100 },
        cores: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Core'
        }],
        sheathGroups: { type: [sheathGroupSchema], default: [] },
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

// Calculate material requirements for sheaths before save
// Note: Cores are now separate documents, so we need to populate them first
quotationSchema.pre('save', async function () {
    const cableLength = this.cableLength || 100;

    // Populate cores if they are ObjectIds (for sheath calculations)
    if (this.cores && this.cores.length > 0 && !this.populated('cores')) {
        await this.populate('cores');
    }

    // Helper function to get core outer dimensions from Core model
    const getCoreOuterDimensions = (coreId) => {
        const core = this.cores.find(c => (String(c._id) === String(coreId) || String(c.id) === String(coreId)));
        if (!core) return { diameter: 0, area: 0 };

        // Core model has insulation.insulatedDiameter already calculated
        const insulatedDiameter = core.insulation?.insulatedDiameter || 0;
        const outerArea = (Math.PI * insulatedDiameter * insulatedDiameter) / 4;

        return { diameter: insulatedDiameter, area: outerArea };
    };

    // Helper function to get sheath outer dimensions (recursive)
    const getSheathOuterDimensions = (sheathId) => {
        const sheath = this.sheathGroups.find(sg => (String(sg._id) === String(sheathId) || String(sg.id) === String(sheathId)));
        if (!sheath) return { diameter: 0, area: 0 };

        const innerDiameters = [];
        const innerAreas = [];

        // Get dimensions from cores
        (sheath.coreIds || []).forEach(coreId => {
            const dimensions = getCoreOuterDimensions(coreId);
            if (dimensions.diameter > 0) {
                innerDiameters.push(dimensions.diameter);
                innerAreas.push(dimensions.area);
            }
        });

        // Get dimensions from nested sheaths
        (sheath.sheathIds || []).forEach(nestedSheathId => {
            const dimensions = getSheathOuterDimensions(nestedSheathId);
            if (dimensions.diameter > 0) {
                innerDiameters.push(dimensions.diameter);
                innerAreas.push(dimensions.area);
            }
        });

        if (innerAreas.length === 0) return { diameter: 0, area: 0 };

        const totalInnerArea = innerAreas.reduce((sum, area) => sum + area, 0);
        const bundleDiameter = Math.sqrt((totalInnerArea * 4) / Math.PI);
        const sheathOuterDiameter = bundleDiameter + (2 * sheath.thickness);
        const outerArea = (Math.PI * sheathOuterDiameter * sheathOuterDiameter) / 4;

        return { diameter: sheathOuterDiameter, area: outerArea };
    };

    // Process each sheath group and calculate its material requirements
    if (this.sheathGroups && this.sheathGroups.length > 0) {
        this.sheathGroups.forEach(sheathGroup => {
            const materialRequired = [];

            // Calculate sheath dimensions
            const innerDiameters = [];
            const innerAreas = [];
            let avgLength = 0;
            let lengthCount = 0;

            // Get dimensions from cores
            (sheathGroup.coreIds || []).forEach(coreId => {
                const core = this.cores.find(c => (String(c._id) === String(coreId) || String(c.id) === String(coreId)));
                if (core) {
                    const dimensions = getCoreOuterDimensions(coreId);
                    if (dimensions.diameter > 0) {
                        innerDiameters.push(dimensions.diameter);
                        innerAreas.push(dimensions.area);
                        avgLength += (core.coreLength || cableLength);
                        lengthCount++;
                    }
                }
            });

            // Get dimensions from nested sheaths
            (sheathGroup.sheathIds || []).forEach(sheathId => {
                const dimensions = getSheathOuterDimensions(sheathId);
                if (dimensions.diameter > 0) {
                    innerDiameters.push(dimensions.diameter);
                    innerAreas.push(dimensions.area);
                    avgLength += cableLength;
                    lengthCount++;
                }
            });

            // Calculate sheath material if there are inner elements
            console.log('Checking sheath calc - innerAreas:', innerAreas.length, 'materialTypeId:', sheathGroup.materialTypeId, 'materialId:', sheathGroup.materialId);
            if (innerAreas.length > 0 && sheathGroup.materialTypeId) {
                console.log('Starting sheath calculation');
                avgLength = avgLength / lengthCount;
                const totalInnerArea = innerAreas.reduce((sum, area) => sum + area, 0);
                const bundleDiameter = Math.sqrt((totalInnerArea * 4) / Math.PI);
                const sheathOuterDiameter = bundleDiameter + (2 * sheathGroup.thickness);
                const outerRadius = sheathOuterDiameter / 2;
                const innerRadius = bundleDiameter / 2;

                // Calculate volume
                const volumeMm3 = Math.PI * (outerRadius ** 2 - innerRadius ** 2) * avgLength * 1000;
                const volumeCm3 = volumeMm3 / 1000;

                const wastagePercent = sheathGroup.wastagePercent || 0;
                const freshPercent = sheathGroup.freshPercent || 60;
                const reprocessPercent = sheathGroup.reprocessPercent || 40;
                const freshDensity = sheathGroup.density || 1.4;
                const reprocessDensity = sheathGroup.reprocessDensity || freshDensity;

                // Calculate fresh sheath weight with wastage
                const freshWeight = (volumeCm3 * (freshPercent / 100) * freshDensity * (1 + wastagePercent / 100)) / 1000;

                // Calculate reprocess sheath weight with wastage
                const reprocessWeight = (volumeCm3 * (reprocessPercent / 100) * reprocessDensity * (1 + wastagePercent / 100)) / 1000;

                // Add fresh sheath material
                if (freshWeight > 0 && sheathGroup.materialId) {
                    materialRequired.push({
                        materialId: sheathGroup.materialId,
                        materialName: sheathGroup.material || 'Sheath Material',
                        category: 'plastic',
                        purpose: 'sheath-fresh',
                        weight: parseFloat(freshWeight.toFixed(4)),
                        type: 'fresh'
                    });
                    console.log('Added sheath fresh:', sheathGroup.materialId, freshWeight);
                } else {
                    console.log('Skipped sheath fresh - weight:', freshWeight, 'materialId:', sheathGroup.materialId);
                }

                // Add reprocess sheath material
                if (reprocessWeight > 0) {
                    const reprocessMaterialId = sheathGroup.reprocessMaterialId || sheathGroup.materialId;
                    const reprocessMaterialName = sheathGroup.reprocessMaterialTypeName || sheathGroup.material || 'Sheath Material';

                    if (reprocessMaterialId) {
                        materialRequired.push({
                            materialId: reprocessMaterialId,
                            materialName: reprocessMaterialName,
                            category: 'plastic',
                            purpose: 'sheath-reprocess',
                            weight: parseFloat(reprocessWeight.toFixed(4)),
                            type: 'reprocess'
                        });
                        console.log('Added sheath reprocess:', reprocessMaterialId, reprocessWeight);
                    } else {
                        console.log('Skipped sheath reprocess - no materialId');
                    }
                }
            }

            // Assign calculated materials to this sheath group
            sheathGroup.materialRequired = materialRequired;
            console.log('Sheath materialRequired:', JSON.stringify(materialRequired));
        });
    }
});


export default mongoose.model('Quotation', quotationSchema);
