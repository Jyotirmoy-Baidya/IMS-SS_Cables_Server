import mongoose from 'mongoose';

const coreSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },

    name: {
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String,
        trim: true
    },

    length: {
        type: Number,
    },

    // Conductor specifications
    conductor: {
        materialTypeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'RawMaterial',
            required: true
        },
        materialName: {
            type: String,
            default: ''
        },
        materialDensity: {
            type: Number,
            required: true,
            default: 8.96 // Copper default
        },
        totalCoreArea: {
            type: Number,
            required: true,
            min: 0
            // in mm²
        },
        wireCount: {
            type: Number,
            required: true,
            min: 1,
            default: 1
        },
        wastagePercent: {
            type: Number,
            default: 5,
            min: 0,
            max: 100
        },
        selectedRod: {
            type: mongoose.Schema.Types.Mixed,
            default: null
            // Stores rod dimensions if applicable
        },
        hasAnnealing: {
            type: Boolean,
            default: false
        }
    },

    // Insulation specifications
    insulation: {
        materialTypeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'RawMaterial'
        },
        materialTypeName: {
            type: String,
            default: ''
        },
        density: {
            type: Number,
            default: 1.4,
            min: 0
        },
        thickness: {
            type: Number,
            default: 0.5,
            min: 0
            // in mm
        },
        freshPercent: {
            type: Number,
            default: 70,
            min: 0,
            max: 100
        },
        reprocessPercent: {
            type: Number,
            default: 30,
            min: 0,
            max: 100
        },
        freshPricePerKg: {
            type: Number,
            default: 0,
            min: 0
        },
        reprocessMaterialTypeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'RawMaterial'
        },
        reprocessMaterialTypeName: {
            type: String,
            default: ''
        },
        reprocessDensity: {
            type: Number,
            default: null
            // null means use same density as fresh
        },
        reprocessPricePerKg: {
            type: Number,
            default: 0,
            min: 0
        }
    },

    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, {
    timestamps: true
});

// Indexes
coreSchema.index({ code: 1 });
coreSchema.index({ name: 1 });
coreSchema.index({ status: 1 });
coreSchema.index({ 'conductor.materialTypeId': 1 });

// Pre-save hook to uppercase code
coreSchema.pre('save', async function () {
    if (this.isModified('code')) {
        this.code = this.code.toUpperCase();
    }
});

// Validation: fresh + reprocess should equal 100%
coreSchema.pre('validate', function () {
    if (this.insulation) {
        const total = (this.insulation.freshPercent || 0) + (this.insulation.reprocessPercent || 0);
        if (total !== 100 && total !== 0) {
            this.invalidate('insulation', 'Fresh and reprocess percentages must sum to 100%');
        }
    }
});

const Core = mongoose.model('Core', coreSchema);

export default Core;
