import mongoose from 'mongoose';

// Raw Material Inventory Model - Aggregates all lots for a material
const RawMaterialSchema = new mongoose.Schema({
  materialCode: {
    type: String,
    unique: true,
    sparse: true
  },
  materialTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RawMaterialType',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  // Material properties
  category: {
    type: String,
    enum: ['metal', 'plastic', 'insulation', 'other'],
    required: true
  },
  specifications: {
    dimensions: String,        // e.g., "8 sq mm" for copper rod
    dimensionValue: Number,    // e.g., 8
    dimensionUnit: String,     // e.g., "sq mm"
    length: Number,           // For metals, length received
    grade: String,
    color: String,
    other: mongoose.Schema.Types.Mixed
  },
  // Primary suppliers for this material
  preferredSuppliers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  }],
  // Measurement options
  measurementType: {
    type: String,
    enum: ['weight', 'length', 'both'],
    default: 'weight'
  },
  // Current inventory summary (calculated from lots)
  inventory: {
    totalWeight: {
      type: Number,
      default: 0,
      min: 0,
      comment: 'Total weight in kg'
    },
    totalLength: {
      type: Number,
      default: 0,
      min: 0,
      comment: 'Total length in meters (for metals)'
    },
    // Weighted average prices
    avgPricePerKg: {
      type: Number,
      default: 0,
      min: 0
    },
    avgPricePerKm: {
      type: Number,
      default: 0,
      min: 0
    },
    // Last purchase price
    lastPricePerKg: {
      type: Number,
      default: 0,
      min: 0
    },
    lastPricePerKm: {
      type: Number,
      default: 0,
      min: 0
    },
    lastPurchaseDate: Date,
    totalLots: {
      type: Number,
      default: 0
    },
    activeLots: {
      type: Number,
      default: 0
    }
  },
  // Storage summary
  storageSummary: [{
    location: String,
    containerType: String,
    count: Number,
    weight: Number
  }],
  // Reprocess material inventory (recycled production scrap)
  reprocessInventory: {
    totalWeight: { type: Number, default: 0, min: 0 },
    pricePerKg: { type: Number, default: 0, min: 0 }
  },
  // Min stock level for reorder alert
  reorderLevel: {
    type: Number,
    default: 0,
    comment: 'Minimum stock level before reorder'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: String
}, {
  timestamps: true
});

// Indexes
// materialCode index is created automatically by unique: true
RawMaterialSchema.index({ materialTypeId: 1 });
RawMaterialSchema.index({ category: 1 });
RawMaterialSchema.index({ name: 1 });

// Auto-generate material code
RawMaterialSchema.pre('save', async function() {
  if (!this.materialCode) {
    const categoryPrefix = {
      'metal': 'MTL',
      'plastic': 'PLS',
      'insulation': 'INS',
      'other': 'OTH'
    };
    const prefix = categoryPrefix[this.category] || 'MAT';
    const count = await mongoose.models.RawMaterial.countDocuments({ category: this.category });
    this.materialCode = `${prefix}-${String(count + 1).padStart(5, '0')}`;
  }
});

// Method to calculate weighted average price
RawMaterialSchema.methods.calculateWeightedAverage = async function() {
  const RawMaterialLot = mongoose.model('RawMaterialLot');

  const lots = await RawMaterialLot.find({
    materialId: this._id,
    isFullyConsumed: false,
    isActive: true
  });

  if (lots.length === 0) {
    this.inventory.avgPricePerKg = 0;
    this.inventory.avgPricePerKm = 0;
    this.inventory.totalWeight = 0;
    this.inventory.totalLength = 0;
    this.inventory.activeLots = 0;
    return;
  }

  let totalWeight = 0;
  let totalWeightedPriceKg = 0;
  let totalLength = 0;
  let totalWeightedPriceKm = 0;

  lots.forEach(lot => {
    const weight = lot.remainingQuantity.weight;
    const length = lot.remainingQuantity.length || 0;

    totalWeight += weight;
    totalWeightedPriceKg += weight * lot.pricing.pricePerKg;

    if (length > 0 && lot.pricing.pricePerKm) {
      totalLength += length;
      totalWeightedPriceKm += length * lot.pricing.pricePerKm;
    }
  });

  this.inventory.totalWeight = totalWeight;
  this.inventory.totalLength = totalLength;
  this.inventory.avgPricePerKg = totalWeight > 0 ? totalWeightedPriceKg / totalWeight : 0;
  this.inventory.avgPricePerKm = totalLength > 0 ? totalWeightedPriceKm / totalLength : 0;
  this.inventory.activeLots = lots.length;

  // Get last purchase price
  const lastLot = lots.sort((a, b) => b.purchaseDate - a.purchaseDate)[0];
  if (lastLot) {
    this.inventory.lastPricePerKg = lastLot.pricing.pricePerKg;
    this.inventory.lastPricePerKm = lastLot.pricing.pricePerKm || 0;
    this.inventory.lastPurchaseDate = lastLot.purchaseDate;
  }
};

// Method to consume material using LIFO
RawMaterialSchema.methods.consumeMaterial = async function(quantityToConsume, unit = 'weight') {
  const RawMaterialLot = mongoose.model('RawMaterialLot');

  // Get active lots sorted by purchase date (newest first for LIFO)
  const lots = await RawMaterialLot.find({
    materialId: this._id,
    isFullyConsumed: false,
    isActive: true
  }).sort({ purchaseDate: -1 });

  let remainingToConsume = quantityToConsume;
  const consumedLots = [];
  let totalCost = 0;

  for (const lot of lots) {
    if (remainingToConsume <= 0) break;

    const availableQuantity = unit === 'weight'
      ? lot.remainingQuantity.weight
      : lot.remainingQuantity.length;

    const consumedFromThisLot = Math.min(remainingToConsume, availableQuantity);

    // Calculate cost
    const price = unit === 'weight'
      ? lot.pricing.pricePerKg
      : lot.pricing.pricePerKm;
    const cost = consumedFromThisLot * price;

    // Update lot
    if (unit === 'weight') {
      lot.remainingQuantity.weight -= consumedFromThisLot;
      // Adjust length proportionally if applicable
      if (lot.remainingQuantity.length > 0) {
        const ratio = lot.remainingQuantity.weight / lot.initialQuantity.weight;
        lot.remainingQuantity.length = lot.initialQuantity.length * ratio;
      }
    } else {
      lot.remainingQuantity.length -= consumedFromThisLot;
      // Adjust weight proportionally if applicable
      if (lot.remainingQuantity.weight > 0) {
        const ratio = lot.remainingQuantity.length / lot.initialQuantity.length;
        lot.remainingQuantity.weight = lot.initialQuantity.weight * ratio;
      }
    }

    if (lot.remainingQuantity.weight === 0 || lot.remainingQuantity.length === 0) {
      lot.isFullyConsumed = true;
    }

    await lot.save();

    consumedLots.push({
      lotNumber: lot.lotNumber,
      consumed: consumedFromThisLot,
      price: price,
      cost: cost
    });

    totalCost += cost;
    remainingToConsume -= consumedFromThisLot;
  }

  // Recalculate inventory
  await this.calculateWeightedAverage();
  await this.save();

  return {
    consumedLots,
    totalCost,
    avgCostPer: quantityToConsume > 0 ? totalCost / quantityToConsume : 0
  };
};

export default mongoose.model('RawMaterial', RawMaterialSchema);
