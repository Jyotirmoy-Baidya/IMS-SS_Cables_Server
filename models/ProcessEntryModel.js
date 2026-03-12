import mongoose from 'mongoose';

const ProcessEntrySchema = new mongoose.Schema({
    // Reference to Process master
    processId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Process',
        required: true
    },
    processName: { type: String, required: true },
    category: { type: String, default: '' },


    // Cost information (calculated)
    processCost: { type: Number, default: 0 },

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
    },

    // Parent references (one of these will be set)
    coreId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Core'
    },
    sheathId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sheath'
    },
    quotationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quotation'
    },

    // Metadata
    sequence: { type: Number, default: 0 }, // Order in the process list
    isActive: { type: Boolean, default: true },
    notes: { type: String, default: '' }
}, { timestamps: true });

// Indexes for efficient queries
ProcessEntrySchema.index({ coreId: 1, sequence: 1 });
ProcessEntrySchema.index({ sheathId: 1, sequence: 1 });
ProcessEntrySchema.index({ quotationId: 1, sequence: 1 });
ProcessEntrySchema.index({ processId: 1 });


export default mongoose.model('ProcessEntry', ProcessEntrySchema);
