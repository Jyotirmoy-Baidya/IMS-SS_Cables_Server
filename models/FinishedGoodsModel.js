import mongoose from 'mongoose';

const finishedGoodsSchema = new mongoose.Schema(
    {
        itemName: {
            type: String,
            required: true,
            trim: true
        },

        workOrderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'WorkOrder',
            required: true
        },

        workOrderNumber: {
            type: String,
            required: true
        },

        processId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Process',
            required: true
        },

        processName: {
            type: String,
            required: true
        },

        // Total produced quantity
        quantity: {
            weight: { type: Number, default: 0, min: 0 },
            length: { type: Number, default: 0, min: 0 },
            unit: { type: String, default: 'kg' } // kg, m, pcs, etc.
        },

        specifications: {
            type: String,
            default: ''
        },

        storageLocation: {
            type: String,
            default: ''
        },

        notes: {
            type: String,
            default: ''
        },

        // Delivery status
        deliveryStatus: {
            type: String,
            enum: ['ready', 'dispatched', 'delivered'],
            default: 'ready'
        },

        dispatchedAt: {
            type: Date
        },

        deliveredAt: {
            type: Date
        },

        // Customer info (from work order)
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer'
        },

        customerName: {
            type: String
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

// Index for fast lookups
finishedGoodsSchema.index({ workOrderId: 1, isActive: 1 });
finishedGoodsSchema.index({ deliveryStatus: 1, isActive: 1 });
finishedGoodsSchema.index({ customerId: 1 });

export default mongoose.model('FinishedGoods', finishedGoodsSchema);
