import mongoose from 'mongoose';

// Input item schema (materials consumed in a process)
const inputItemSchema = new mongoose.Schema({
    sourceType: {
        type: String,
        enum: ['raw-material', 'wip-inventory'],
        required: true
    },

    // For raw-material source
    allocatedMaterialId: {
        type: mongoose.Schema.Types.ObjectId,
        // Reference to WorkOrder.allocatedMaterials[index]._id
    },
    materialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RawMaterial'
    },
    materialName: String,
    lotId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RawMaterialLot'
    },
    lotNumber: String,

    // For wip-inventory source
    wipInventoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WIPInventory'
    },
    wipItemName: String,

    // Common fields
    quantityUsed: {
        weight: { type: Number, default: 0, min: 0 },
        length: { type: Number, default: 0, min: 0 },
        unit: { type: String, default: 'kg' }
    },

    usedAt: {
        type: Date,
        default: Date.now
    },

    usedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    notes: {
        type: String,
        default: ''
    }
}, { _id: true });

// Output item schema (products produced in a process)
const outputItemSchema = new mongoose.Schema({
    outputType: {
        type: String,
        enum: ['wip-inventory', 'finished-product'],
        required: true
    },

    // Reference to created WIP item (if outputType is wip-inventory)
    wipInventoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WIPInventory'
    },

    itemName: {
        type: String,
        required: true
    },

    quantity: {
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

    producedAt: {
        type: Date,
        default: Date.now
    },

    producedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    notes: {
        type: String,
        default: ''
    }
}, { _id: true });

// Activity log schema
const activityLogSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now
    },

    action: {
        type: String,
        enum: ['input-consumed', 'output-produced', 'status-changed', 'progress-updated', 'note-added'],
        required: true
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    userName: {
        type: String,
        default: ''
    },

    details: {
        type: mongoose.Schema.Types.Mixed
    },

    description: {
        type: String,
        default: ''
    }
}, { _id: true });

// Main process tracking schema
const processTrackingSchema = new mongoose.Schema(
    {
        workOrderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'WorkOrder',
            required: true
        },

        workOrderNumber: {
            type: String,
            required: true
        },

        processAssignmentId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
            // Reference to WorkOrder.processAssignments[index]._id
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

        assignedEmployeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },

        status: {
            type: String,
            enum: ['pending', 'in-progress', 'completed', 'on-hold'],
            default: 'pending'
        },

        progressPercentage: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },

        startedAt: Date,
        completedAt: Date,

        // Input materials/WIP consumed
        inputs: [inputItemSchema],

        // Output products/WIP produced
        outputs: [outputItemSchema],

        // Activity logs
        logs: [activityLogSchema],

        notes: {
            type: String,
            default: ''
        },

        // Report tracking
        addReportAfter: {
            type: Boolean,
            default: false,
            comment: 'Whether this process requires report submission after completion'
        },

        reportUploaded: {
            type: Boolean,
            default: false
        },

        reportUrl: {
            type: String,
            default: ''
        },

        reportUploadedAt: Date,

        reportUploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },

        reportReceived: {
            type: Boolean,
            default: false,
            comment: 'Whether the report has been received/approved by admin'
        },

        reportReceivedAt: Date,

        reportReceivedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },

        // Process dependencies
        canStart: {
            type: Boolean,
            default: true,
            comment: 'Whether this process can be started (based on previous process completion and report status)'
        },

        blockReason: {
            type: String,
            default: ''
        }
    },
    { timestamps: true }
);

// Indexes for performance
processTrackingSchema.index({ workOrderId: 1, status: 1 });
processTrackingSchema.index({ processAssignmentId: 1 });
processTrackingSchema.index({ assignedEmployeeId: 1, status: 1 });

export default mongoose.model('ProcessTracking', processTrackingSchema);
