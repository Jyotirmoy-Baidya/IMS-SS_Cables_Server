import mongoose from 'mongoose';

// Contact Person Schema
const ContactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  designation: String,
  phone: String,
  email: String,
  isPrimary: {
    type: Boolean,
    default: false
  }
}, { _id: false });

// Address Schema
const AddressSchema = new mongoose.Schema({
  line1: {
    type: String,
    required: true
  },
  line2: String,
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  country: {
    type: String,
    default: 'India'
  },
  pincode: {
    type: String,
    required: true
  }
}, { _id: false });

// Supplier Model
const SupplierSchema = new mongoose.Schema({
  supplierName: {
    type: String,
    required: true,
    trim: true
  },
  supplierCode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  avatarUrl: String,
  status: {
    type: String,
    enum: ['active', 'inactive', 'blacklisted'],
    default: 'active'
  },
  address: {
    type: AddressSchema,
    required: true
  },
  businessInfo: {
    gst: String,
    pan: String,
    phone: String,
    email: String,
    website: String
  },
  contacts: [ContactSchema],
  deliveryTypes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RawMaterialType'
  }],
  paymentTerms: {
    type: String,
    default: 'Net 30'
  },
  creditLimit: {
    type: Number,
    default: 0
  },
  notes: String,
  isActive: {
    type: Boolean,
    default: true
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  }
}, {
  timestamps: true
});

// Index for faster queries
SupplierSchema.index({ supplierName: 1 });
// supplierCode index is created automatically by unique: true
SupplierSchema.index({ status: 1 });

// Auto-generate supplier code before saving
SupplierSchema.pre('save', async function() {
  if (!this.supplierCode) {
    const count = await mongoose.models.Supplier.countDocuments();
    this.supplierCode = `SUP-${String(count + 1).padStart(5, '0')}`;
  }
});

export default mongoose.model('Supplier', SupplierSchema);
