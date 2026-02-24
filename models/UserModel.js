import mongoose from 'mongoose';

const phoneNumberSchema = new mongoose.Schema(
    {
        number: { type: String, required: true },
        label: { type: String, default: '' }, // e.g., "Personal", "Work", "Emergency"
        isPrimary: { type: Boolean, default: false },
    },
    { _id: false }
);

const addressSchema = new mongoose.Schema(
    {
        line1: { type: String, default: '' },
        line2: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        pincode: { type: String, default: '' },
        country: { type: String, default: 'India' },
    },
    { _id: false }
);

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        role: {
            type: String,
            enum: ['admin', 'salesperson', 'employee'],
            required: true,
        },

        phoneNumbers: {
            type: [phoneNumberSchema],
            default: [],
            validate: {
                validator: function(arr) {
                    // At least one phone number required
                    return arr && arr.length > 0;
                },
                message: 'At least one phone number is required',
            },
        },

        address: {
            type: addressSchema,
            default: () => ({}),
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        // Processes assigned to employee (only for role === 'employee')
        // Array of Process IDs from Process Master
        processes: {
            type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Process' }],
            default: [],
        },

        // Documents - placeholder for future implementation
        documents: {
            type: mongoose.Schema.Types.Mixed,
            default: [],
        },
    },
    { timestamps: true }
);

// Virtual to get primary phone number
userSchema.virtual('primaryPhone').get(function() {
    const primary = this.phoneNumbers?.find(p => p.isPrimary);
    return primary?.number || this.phoneNumbers?.[0]?.number || '';
});

// Ensure virtuals are included in JSON/Object conversion
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

export default mongoose.model('User', userSchema);
