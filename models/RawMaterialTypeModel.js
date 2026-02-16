import mongoose from 'mongoose';

// Raw Material Type Model
const RawMaterialTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  category: {
    type: String,
    enum: ['metal', 'plastic', 'insulation', 'other'],
    required: true
  },
  density: {
    type: Number,
    required: true,
    min: 0,
    comment: 'Density in g/cm³'
  },
  unit: {
    type: String,
    enum: ['kg', 'meter', 'piece'],
    default: 'kg'
  },
  specifications: {
    grade: String,            // e.g., "99.99% pure", "Grade A"
    standard: String,         // e.g., "IS 8130", "ASTM B8"
    other: mongoose.Schema.Types.Mixed
  },
  description: String,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
// name index is created automatically by unique: true
RawMaterialTypeSchema.index({ category: 1 });

export default mongoose.model('RawMaterialType', RawMaterialTypeSchema);
