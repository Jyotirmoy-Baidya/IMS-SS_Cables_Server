import mongoose from 'mongoose';

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

        // Process in work order tracking
        processInWorkOrder: [{
            processId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'ProcessInWorkOrder',
                required: true
            },
            sequence: {
                type: Number,
                default: 0
            }
        }],

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
            processCost: { type: Number, default: 0 }
        },

        // Reference to final quote price used for this work order
        finalQuotePriceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'QuotePriceModel'
        },

        // Extra costs and materials
        extra: {
            extraAllocatedMaterials: [{
                materialId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'RawMaterial'
                },
                materialName: String,
                materialLotId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'RawMaterialLot'
                },
                lotNumber: String,
                allocatedWeight: { type: Number, default: 0 },
                allocatedLength: { type: Number, default: 0 },
                pricePerKg: { type: Number, default: 0 },
                totalCost: { type: Number, default: 0 },
                allocatedAt: Date,
                requestId: mongoose.Schema.Types.ObjectId // Reference to extraMaterialRequests
            }],
            extraCostBear: { type: Number, default: 0 },
            miscellaneousCost: { type: Number, default: 0 }
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
