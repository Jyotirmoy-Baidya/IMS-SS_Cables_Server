import mongoose from 'mongoose';

// Raw Material Lot Model - Tracks each procurement lot separately for LIFO
const RawMaterialLotSchema = new mongoose.Schema({
  lotNumber: {
    type: String,
    required: true,
    unique: true
  },
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RawMaterial',
    required: true
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  purchaseDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  // Quantity tracking
  initialQuantity: {
    weight: {
      type: Number,
      required: true,
      min: 0,
      comment: 'Weight in kg'
    },
    length: {
      type: Number,
      min: 0,
      comment: 'Length in meters (for metals)'
    }
  },
  remainingQuantity: {
    weight: {
      type: Number,
      required: true,
      min: 0
    },
    length: {
      type: Number,
      min: 0
    }
  },
  // Pricing
  pricing: {
    pricePerKg: {
      type: Number,
      required: true,
      min: 0
    },
    pricePerKm: {
      type: Number,
      min: 0,
      comment: 'For metals only'
    },
    totalCost: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    }
  },
  // Storage details
  storage: {
    location: {
      type: String,
      enum: ['sac', 'drum', 'bobbin', 'rack', 'warehouse'],
      required: true
    },
    locationDetails: String,
    containerCount: {
      type: Number,
      default: 1,
      min: 1
    }
  },
  // Document references
  invoiceNumber: String,
  invoiceDate: Date,
  invoiceUrl: String,
  poNumber: String,
  grnNumber: String,
  notes: String,
  isFullyConsumed: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
// lotNumber index is created automatically by unique: true
RawMaterialLotSchema.index({ materialId: 1 });
RawMaterialLotSchema.index({ supplierId: 1 });
RawMaterialLotSchema.index({ purchaseDate: -1 });
RawMaterialLotSchema.index({ isFullyConsumed: 1 });

// Auto-generate lot number and initialize remaining quantity BEFORE validation
RawMaterialLotSchema.pre('validate', async function() {
  if (!this.lotNumber) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await mongoose.models.RawMaterialLot.countDocuments({
      createdAt: { $gte: new Date(date.setHours(0, 0, 0, 0)) }
    });
    this.lotNumber = `LOT-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }

  // Initialize remaining quantity same as initial if not set
  if (this.isNew && this.initialQuantity?.weight != null && !this.remainingQuantity?.weight) {
    this.remainingQuantity = {
      weight: this.initialQuantity.weight,
      length: this.initialQuantity.length || 0
    };
  }
});

// Mark as fully consumed if remaining is 0
RawMaterialLotSchema.pre('save', async function() {
  if (this.remainingQuantity?.weight === 0) {
    this.isFullyConsumed = true;
  }
});

export default mongoose.model('RawMaterialLot', RawMaterialLotSchema);
