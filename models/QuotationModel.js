import mongoose from 'mongoose';


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
        sheathGroups: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Sheath'
        }],
        quoteProcesses: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ProcessEntry'
        }],

        // Cost summary (computed on save by frontend)
        materialCost: { type: Number, default: 0 },
        processCost: { type: Number, default: 0 },
        grandTotal: { type: Number, default: 0 },
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

// Sheaths are now separate documents with their own pre-save hooks
// No need for sheath calculations in quotation pre-save


export default mongoose.model('Quotation', quotationSchema);
