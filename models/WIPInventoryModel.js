import mongoose from 'mongoose';

const wipInventorySchema = new mongoose.Schema(
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

        // Remaining after consumption
        remainingQuantity: {
            weight: { type: Number, default: 0, min: 0 },
            length: { type: Number, default: 0, min: 0 },
            unit: { type: String, default: 'kg' }
        },

        // Allocated to other processes
        allocatedQuantity: {
            weight: { type: Number, default: 0, min: 0 },
            length: { type: Number, default: 0, min: 0 },
            unit: { type: String, default: 'kg' }
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

        isFullyConsumed: {
            type: Boolean,
            default: false
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

// Initialize remainingQuantity from quantity on create
wipInventorySchema.pre('validate', function () {
    if (this.isNew) {
        this.remainingQuantity = {
            weight: this.quantity.weight || 0,
            length: this.quantity.length || 0,
            unit: this.quantity.unit || 'kg'
        };
    }
});

// Index for fast lookups
wipInventorySchema.index({ workOrderId: 1, isActive: 1 });
wipInventorySchema.index({ isFullyConsumed: 1, isActive: 1 });

export default mongoose.model('WIPInventory', wipInventorySchema);
