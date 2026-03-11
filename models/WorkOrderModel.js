import mongoose from 'mongoose';

const processAssignmentSchema = new mongoose.Schema(
    {
        processId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Process',
            required: true,
        },
        processName: { type: String, required: true }, // Denormalized
        processCategory: { type: String, default: '' }, // conductor/insulation/sheathing/general

        assignedEmployeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        locationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Location',
        },
        locationName: { type: String, default: '' }, // Denormalized
        sequence: { type: Number, default: 0 }, // Process sequence/order

        // Cost information (from quotation)
        processCost: { type: Number, default: 0 }, // Calculated cost from formula
        costFormula: { type: String, default: '' }, // The formula used

        // Process variables (snapshot from quotation)
        variables: [{
            name: String,
            label: String,
            value: Number,
            unit: String,
            source: String
        }],

        // Expected output (from quotation process output config)
        expectedOutput: {
            outputType: {
                type: String,
                enum: ['intermediate', 'final', 'none'],
                default: 'none'
            },
            expectedQuantity: { type: Number, default: 0 },
            expectedItemName: { type: String, default: '' },
            expectedSpecification: { type: String, default: '' },
            unit: { type: String, default: 'm' },
            quantityFormula: { type: String, default: '' },
            itemNameTemplate: { type: String, default: '' },
            specificationTemplate: { type: String, default: '' }
        },

        // Actual production output
        actualOutput: {
            producedQuantity: { type: Number, default: 0 },
            producedItemName: { type: String, default: '' },
            producedSpecification: { type: String, default: '' },
            storageLocation: { type: String, default: '' }, // e.g., "bobbin count 10 in shelf 2"
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'IntermediateProduct' }, // If intermediate
            // Quality metrics
            qualityGrade: { type: String, enum: ['A', 'B', 'C', 'rejected', ''], default: '' },
            defectRate: { type: Number, default: 0, min: 0, max: 100 }, // Percentage
            notes: { type: String, default: '' }
        },

        // Status tracking
        addReportAfter: { type: Boolean, default: false },
        requiresReport: { type: Boolean, default: false }, // Alias for addReportAfter
        status: {
            type: String,
            enum: ['pending', 'in-progress', 'completed', 'on-hold', 'failed'],
            default: 'pending',
        },
        startedAt: { type: Date },
        completedAt: { type: Date },
        progressPercentage: { type: Number, default: 0, min: 0, max: 100 },

        // Report tracking
        reportUploaded: { type: Boolean, default: false },
        reportUrl: { type: String, default: '' },
        reportUploadedAt: { type: Date },
        reportData: { type: mongoose.Schema.Types.Mixed, default: null },

        // Input consumption tracking
        inputsConsumed: [{
            inputType: { type: String, enum: ['RawMaterial', 'IntermediateProduct'] },
            materialId: mongoose.Schema.Types.ObjectId, // RawMaterial or IntermediateProduct
            materialName: String,
            quantityConsumed: Number,
            unit: String,
            consumedAt: { type: Date, default: Date.now }
        }],

        notes: { type: String, default: '' },
    },
    { _id: true }
);

const workOrderSchema = new mongoose.Schema(
    {
        workOrderNumber: {
            type: String,
            unique: true,
            index: true,
        },

        quoteId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Quotation',
            required: true,
        },

        quoteNumber: { type: String, required: true }, // Denormalized

        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            required: true,
        },

        cableLength: { type: Number, required: true }, // Denormalized

        status: {
            type: String,
            enum: ['pending', 'in-progress', 'completed', 'cancelled'],
            default: 'pending',
        },

        processAssignments: {
            type: [processAssignmentSchema],
            default: [],
        },

        allocatedMaterials: [{
            materialId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'RawMaterial',
                required: true
            },
            materialName: String, // Denormalized for display
            materialLotId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'RawMaterialLot',
                required: true
            },
            lotNumber: String, // Denormalized for display
            allocatedWeight: {
                type: Number,
                required: true,
                min: 0
            },
            allocatedLength: {
                type: Number,
                default: 0,
                min: 0
            },
            pricePerKg: {
                type: Number,
                default: 0
            },
            totalCost: {
                type: Number,
                default: 0
            },
            allocatedAt: {
                type: Date,
                default: Date.now
            },
            isConsumed: {
                type: Boolean,
                default: false
            },
            isExtraRequest: {
                type: Boolean,
                default: false,
                comment: 'True if this was requested as extra material during production'
            }
        }],

        // Costing breakdown
        materialCosts: {
            totalCost: { type: Number, default: 0 },
            breakdown: [{
                materialId: mongoose.Schema.Types.ObjectId,
                materialName: String,
                quantity: Number,
                unit: String,
                pricePerUnit: Number,
                totalCost: Number
            }]
        },

        processCosts: {
            totalCost: { type: Number, default: 0 },
            breakdown: [{
                processId: mongoose.Schema.Types.ObjectId,
                processName: String,
                cost: Number
            }]
        },

        finalCost: {
            materialCost: { type: Number, default: 0 },
            processCost: { type: Number, default: 0 },
            profitMargin: { type: Number, default: 0 },
            profitAmount: { type: Number, default: 0 },
            grandTotal: { type: Number, default: 0 }
        },

        // Extra material requests during production
        extraMaterialRequests: [{
            materialId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'RawMaterial',
                required: true
            },
            materialName: String,
            requestedQuantity: {
                weight: { type: Number, default: 0 },
                length: { type: Number, default: 0 },
                unit: { type: String, default: 'kg' }
            },
            reason: String,
            requestedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            requestedAt: {
                type: Date,
                default: Date.now
            },
            status: {
                type: String,
                enum: ['pending', 'approved', 'rejected'],
                default: 'pending'
            },
            approvedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            approvedAt: Date,
            allocatedMaterialId: mongoose.Schema.Types.ObjectId, // Reference to added allocated material
            notes: String
        }],

        notes: { type: String, default: '' },

        // Related work orders (for linked/dependent orders)
        relatedWorkOrders: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'WorkOrder'
        }],
    },
    { timestamps: true }
);

// Auto-generate work order number (WO-00001)
workOrderSchema.pre('validate', async function () {
    if (this.isNew && !this.workOrderNumber) {
        const last = await this.constructor.findOne({}, { workOrderNumber: 1 }, { sort: { createdAt: -1 } });
        let seq = 1;
        if (last?.workOrderNumber) {
            const match = last.workOrderNumber.match(/WO-(\d+)/);
            if (match) seq = parseInt(match[1]) + 1;
        }
        this.workOrderNumber = `WO-${String(seq).padStart(5, '0')}`;
    }
});

export default mongoose.model('WorkOrder', workOrderSchema);
