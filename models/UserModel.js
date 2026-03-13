import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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
            trim: true,
            default: ''
        },

        email: {
            type: String,
            trim: true,
            lowercase: true,
            default: ''
        },

        phoneNumber: {
            type: String,
            required: true,
            trim: true
        },

        password: {
            type: String,
            required: true,
            minlength: 6
        },

        role: {
            type: String,
            enum: ['admin', 'salesperson', 'employee'],
            required: true,
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

// Hash password before saving (Mongoose 9 - no next parameter)
userSchema.pre('save', async function() {
    if (!this.isModified('password')) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);
