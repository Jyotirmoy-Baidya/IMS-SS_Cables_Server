import mongoose from 'mongoose';

const POItemSchema = new mongoose.Schema({
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RawMaterial',
    required: true
  },
  // Quantity ordered
  quantity: {
    weight: { type: Number, default: 0, min: 0 },    // kg
    length: { type: Number, default: 0, min: 0 }     // meters
  },
  pricing: {
    pricePerKg: { type: Number, default: 0, min: 0 },
    pricePerKm: { type: Number, default: 0, min: 0 },
    totalCost: { type: Number, default: 0, min: 0 }
  },
  // Storage location (filled on receipt)
  storage: {
    location: {
      type: String,
      enum: ['sac', 'drum', 'bobbin', 'rack', 'warehouse', ''],
      default: ''
    },
    locationDetails: String,
    containerCount: { type: Number, default: 1, min: 1 }
  },
  // Lot created on receipt
  lotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RawMaterialLot'
  },
  notes: String
}, { _id: true });

const PurchaseOrderSchema = new mongoose.Schema({
  poNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  expectedDeliveryDate: Date,
  status: {
    type: String,
    enum: ['draft', 'ordered', 'received', 'cancelled'],
    default: 'draft'
  },
  items: [POItemSchema],
  // Invoice details (filled on receipt)
  invoiceNumber: String,
  invoiceDate: Date,
  invoiceUrl: String,
  // Summary
  totalAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  notes: String,
  receivedAt: Date
}, {
  timestamps: true
});

// Auto-generate PO number
PurchaseOrderSchema.pre('save', async function() {
  if (!this.poNumber) {
    const count = await mongoose.models.PurchaseOrder.countDocuments();
    this.poNumber = `PO-${String(count + 1).padStart(5, '0')}`;
  }
});

export default mongoose.model('PurchaseOrder', PurchaseOrderSchema);
