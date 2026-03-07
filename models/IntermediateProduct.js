import mongoose from 'mongoose';

const intermediateProductSchema = new mongoose.Schema({
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
  category: {
    type: String,
    enum: ['conductor', 'core', 'cable', 'armoured', 'other'],
    default: 'other'
    // conductor: drawn/stranded wire, core: insulated conductor, cable: cabled cores, etc.
  },
  specifications: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
  },
  unit: {
    type: String,
    required: true,
    trim: true,
    default: 'kg'
    // kg, m, pcs, etc.
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
intermediateProductSchema.index({ code: 1 });
intermediateProductSchema.index({ name: 1 });
intermediateProductSchema.index({ category: 1 });
intermediateProductSchema.index({ status: 1 });

// Pre-save hook to uppercase code
intermediateProductSchema.pre('save', async function() {
  if (this.isModified('code')) {
    this.code = this.code.toUpperCase();
  }
});

const IntermediateProduct = mongoose.model('IntermediateProduct', intermediateProductSchema);

export default IntermediateProduct;
