import mongoose from 'mongoose';

const SOURCES = [
    'manual',

    // Cable-level variables
    'cableLength',
    'coreCount',
    'totalWireCount',
    'totalDrawingLength',
    'totalMaterialWeight',
    'totalCoreArea',

    // Core-specific length
    'coreLength',

    // Core conductor variables
    'coreMaterialDensity',
    'coreTotalCoreArea',
    'coreWireCount',
    'coreWastagePercent',
    'coreHasAnnealing',

    // Core insulation variables
    'insulationDensity',
    'insulationThickness',
    'insulationFreshPercent',
    'insulationReprocessPercent',
    'insulationFreshPricePerKg',
    'insulationReprocessPricePerKg',

    // Sheath variables
    'sheathDensity',
    'sheathThickness',
    'sheathFreshPercent',
    'sheathReprocessPercent',
    'sheathFreshPricePerKg',
    'sheathReprocessPricePerKg',

    // Calculated values
    'wireDiameter',
    'conductorDiameter',
    'insulatedDiameter',
    'drawingLength',
    'materialWeight',
    'insulationWeight',
    'sheathWeight'
];

const VariableSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },  // JS identifier used in formula
    label: { type: String, required: true, trim: true },  // human-readable label
    unit: { type: String, default: '' },                 // e.g. "₹/m", "mm²"
    source: { type: String, enum: SOURCES, default: 'manual' },
    defaultValue: { type: Number, default: 0 }
}, { _id: false });

const ProcessSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: {
        type: String,
        enum: ['conductor', 'insulation', 'sheathing', 'general'],
        default: 'general'
    },
    imageUrl: { type: String, default: '' },  // Cloudinary URL – populated later
    formula: { type: String, required: true, trim: true },
    formulaNote: { type: String, default: '' },  // human-readable explanation of formula
    variables: { type: [VariableSchema], default: [] },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

ProcessSchema.index({ category: 1, isActive: 1 });

export default mongoose.model('Process', ProcessSchema);
