import mongoose from 'mongoose';

const processAssignmentSchema = new mongoose.Schema(
    {
        processId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Process',
            required: true,
        },
        processName: { type: String, required: true }, // Denormalized
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
        addReportAfter: { type: Boolean, default: false },
        status: {
            type: String,
            enum: ['pending', 'in-progress', 'completed'],
            default: 'pending',
        },
        startedAt: { type: Date },
        completedAt: { type: Date },

        // Intermediate product details
        producedQuantity: { type: Number, default: 0 }, // e.g., 100m
        producedSpec: { type: String, default: '' }, // e.g., "0.5sq mm"
        storageLocation: { type: String, default: '' }, // e.g., "bobbin count 10 in shelf 2"
        progressPercentage: { type: Number, default: 0, min: 0, max: 100 },

        notes: { type: String, default: '' },
        reportData: { type: mongoose.Schema.Types.Mixed, default: null },
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

        notes: { type: String, default: '' },
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
