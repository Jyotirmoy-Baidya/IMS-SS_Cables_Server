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

// Core insulation schema
const coreInsulationSchema = new mongoose.Schema({
    materialTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RawMaterial'
    },
    materialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RawMaterial'
        // Same as materialTypeId (for consistency)
    },
    materialTypeName: { type: String, default: '' },
    density: { type: Number, default: 1.4 },
    thickness: { type: Number, default: 0.5 },
    wastagePercent: { type: Number, default: 0, min: 0, max: 100 },
    freshPercent: { type: Number, default: 70, min: 0, max: 100 },
    reprocessPercent: { type: Number, default: 30, min: 0, max: 100 },
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
    reprocessPricePerKg: { type: Number, default: 0 }
}, { _id: false });

// Core schema
const coreSchema = new mongoose.Schema({
    materialTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RawMaterial'
    },
    materialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RawMaterial'
        // Actual raw material ID from selectedRod
    },
    materialDensity: { type: Number, default: 8.96 },
    totalCoreArea: { type: Number, default: 8 },
    wireCount: { type: Number, default: 16 },
    wastagePercent: { type: Number, default: 5 },
    selectedRod: { type: mongoose.Schema.Types.Mixed, default: null },
    hasAnnealing: { type: Boolean, default: false },
    coreLength: { type: Number, default: null },  // Individual core length (defaults to cable length if null)
    processes: [processEntrySchema],  // Processes for this core
    insulation: { type: coreInsulationSchema, default: () => ({}) },

    // Calculated material requirements for this core
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
            enum: ['conductor', 'insulation-fresh', 'insulation-reprocess'],
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
        cores: { type: [coreSchema], default: [] },
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

// Calculate material requirements for each core and sheath before save
quotationSchema.pre('save', async function () {
    const cableLength = this.cableLength || 100;

    // ═══════════════════════════════════════════════════════
    // POPULATE MATERIAL IDs
    // ═══════════════════════════════════════════════════════

    // Set materialId for cores and their insulation
    if (this.cores && this.cores.length > 0) {
        this.cores.forEach(core => {
            // Core conductor materialId from selectedRod
            if (core.selectedRod && core.selectedRod._id) {
                core.materialId = core.selectedRod._id;
            }
        });
    }


    // Helper function to get core outer dimensions
    const getCoreOuterDimensions = (coreId) => {
        const core = this.cores.find(c => (String(c._id) === String(coreId) || String(c.id) === String(coreId)));
        if (!core) return { diameter: 0, area: 0 };

        const totalCoreArea = core.totalCoreArea;
        const wireCount = core.wireCount;
        const thickness = core.insulation?.thickness || 0.5;

        // Calculate core diameter
        const areaPerWire = totalCoreArea / wireCount;
        const diameterPerWire = 2 * Math.sqrt(areaPerWire / Math.PI);

        let coreDiameter;

        coreDiameter = 2 * Math.sqrt(totalCoreArea / Math.PI);

        const insulatedDiameter = coreDiameter + (2 * thickness);
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

    // Process each core and calculate its material requirements
    if (this.cores && this.cores.length > 0) {
        this.cores.forEach(core => {
            const coreCableLength = core.coreLength || cableLength;
            const materialRequired = [];

            // ═══════════════════════════════════════════════════════
            // CONDUCTOR CALCULATIONS
            // ═══════════════════════════════════════════════════════
            if (core.totalCoreArea && core.wireCount) {
                const totalCoreArea = core.totalCoreArea;
                const wireCount = core.wireCount;
                const density = core.materialDensity || 8.96;
                const wastagePercent = core.wastagePercent || 0;

                // Calculate wire dimensions
                const areaPerWire = totalCoreArea / wireCount;
                const diameterPerWire = 2 * Math.sqrt(areaPerWire / Math.PI);

                // Calculate drawing length (layering factor based on wire count)
                let layeringFactor = 1.02; // Single wire default
                if (wireCount === 7) layeringFactor = 1.05;
                else if (wireCount === 19) layeringFactor = 1.08;
                else if (wireCount === 37) layeringFactor = 1.10;
                else if (wireCount > 37) layeringFactor = 1.12;

                const drawingLength = coreCableLength * wireCount;

                // Calculate material weight with wastage
                const materialWeight = (totalCoreArea * coreCableLength * density * (1 + wastagePercent / 100)) / 1000;

                if (materialWeight > 0 && core.materialId) {
                    materialRequired.push({
                        materialId: core.materialId,
                        materialName: core.selectedRod?.name || 'Metal',
                        category: 'metal',
                        purpose: 'conductor',
                        weight: parseFloat(materialWeight.toFixed(4)),
                        type: 'fresh'
                    });
                }
            }

            // ═══════════════════════════════════════════════════════
            // INSULATION CALCULATIONS
            // ═══════════════════════════════════════════════════════
            console.log('Checking insulation calc - insulation:', !!core.insulation, 'totalCoreArea:', core.totalCoreArea, 'wireCount:', core.wireCount);
            if (core.insulation && core.totalCoreArea && core.wireCount) {
                console.log('Starting insulation calculation');
                const totalCoreArea = core.totalCoreArea;
                const wireCount = core.wireCount;
                const thickness = core.insulation.thickness || 0.5;
                const wastagePercent = core.insulation.wastagePercent || 0;
                const freshPercent = core.insulation.freshPercent || 0;
                const reprocessPercent = core.insulation.reprocessPercent || 0;
                const freshDensity = core.insulation.density || 1.4;
                const reprocessDensity = core.insulation.reprocessDensity || freshDensity;

                // Calculate core diameter
                const areaPerWire = totalCoreArea / wireCount;
                const diameterPerWire = 2 * Math.sqrt(areaPerWire / Math.PI);

                let coreDiameter;

                const calculateCoreDiameter = (wireDiameter, wireCount) => {
                    if (wireCount === 1) {
                        return wireDiameter;
                    }

                    const packingEfficiency = 0.90;
                    // return wireDiameter * Math.sqrt(wireCount / packingEfficiency);
                    // Approximate formula for stranded conductor diameter
                    return Math.sqrt(wireCount) * wireDiameter / 2;
                };

                coreDiameter = calculateCoreDiameter(diameterPerWire, wireCount);

                // if (wireCount === 1) {
                //     coreDiameter = diameterPerWire;
                // } else if (wireCount === 7) {
                //     coreDiameter = 3 * diameterPerWire;
                // } else if (wireCount === 19) {
                //     coreDiameter = 4.3 * diameterPerWire;
                // } else if (wireCount === 37) {
                //     coreDiameter = 6.2 * diameterPerWire;
                // } else {
                //     coreDiameter = diameterPerWire * Math.sqrt(wireCount);
                // }

                // Calculate insulated diameter
                const insulatedDiameter = coreDiameter + (2 * thickness);

                // Calculate insulation volume
                const outerRadius = insulatedDiameter / 2;
                const innerRadius = coreDiameter / 2;
                const volumeMm3 = Math.PI * (outerRadius ** 2 - innerRadius ** 2) * coreCableLength * 1000;
                const volumeCm3 = volumeMm3 / 1000;

                // Calculate fresh insulation weight with wastage
                const freshWeight = (volumeCm3 * (freshPercent / 100) * freshDensity * (1 + wastagePercent / 100)) / 1000;
                // Calculate reprocess insulation weight with wastage
                const reprocessWeight = (volumeCm3 * (reprocessPercent / 100) * reprocessDensity * (1 + wastagePercent / 100)) / 1000;

                console.log("fresh weight", reprocessWeight);
                // Add fresh insulation material
                if (freshWeight > 0 && core.insulation.materialId && freshPercent) {
                    materialRequired.push({
                        materialId: core.insulation.materialId,
                        materialName: core.insulation.materialTypeName || 'Insulation',
                        category: 'insulation',
                        purpose: 'insulation-fresh',
                        weight: parseFloat(freshWeight.toFixed(4)),
                        type: 'fresh'
                    });
                    console.log('Added insulation fresh:', core.insulation.materialId, freshWeight);
                } else {
                    console.log('Skipped insulation fresh - weight:', freshWeight, 'materialId:', core.insulation?.materialId);
                }

                // Add reprocess insulation material
                if (reprocessWeight > 0 && reprocessPercent) {
                    const reprocessMaterialId = core.insulation.reprocessMaterialId || core.insulation.materialId;
                    const reprocessMaterialName = core.insulation.reprocessMaterialTypeName || core.insulation.materialTypeName || 'Insulation';

                    if (reprocessMaterialId) {
                        materialRequired.push({
                            materialId: reprocessMaterialId,
                            materialName: reprocessMaterialName,
                            category: 'insulation',
                            purpose: 'insulation-reprocess',
                            weight: parseFloat(reprocessWeight.toFixed(4)),
                            type: 'reprocess'
                        });
                        console.log('Added insulation reprocess:', reprocessMaterialId, reprocessWeight);
                    } else {
                        console.log('Skipped insulation reprocess - no materialId');
                    }
                }
            }

            // Assign calculated materials to this core
            core.materialRequired = materialRequired;
            console.log('Core materialRequired:', JSON.stringify(materialRequired));
        });
    }

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
