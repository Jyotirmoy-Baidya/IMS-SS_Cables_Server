import PurchaseOrder from '../models/PurchaseOrderModel.js';
import RawMaterial from '../models/RawMaterialModel.js';
import RawMaterialLot from '../models/RawMaterialLotModel.js';
import Supplier from '../models/SupplierModel.js';

// Create purchase order
const createPurchaseOrder = async (req, res) => {
  try {
    const po = new PurchaseOrder(req.body);

    // Calculate total amount from items
    po.totalAmount = (po.items || []).reduce((sum, item) => sum + (item.pricing?.totalCost || 0), 0);

    await po.save();

    // Cross-link: ensure supplier and raw materials know about each other
    await crossLinkSupplierMaterials(po.supplierId, po.items);

    await po.populate([
      { path: 'supplierId', select: 'supplierName supplierCode' },
      { path: 'items.materialId', select: 'name materialCode category' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Purchase order created successfully',
      data: po
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get all purchase orders
const getAllPurchaseOrders = async (req, res) => {
  try {
    const { status, supplierId, search } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (supplierId) filter.supplierId = supplierId;
    if (search) {
      filter.$or = [
        { poNumber: { $regex: search, $options: 'i' } },
        { invoiceNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const orders = await PurchaseOrder.find(filter)
      .populate('supplierId', 'supplierName supplierCode')
      .populate('items.materialId', 'name materialCode category specifications')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Purchase orders retrieved successfully',
      data: orders,
      count: orders.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single PO
const getOnePurchaseOrder = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id)
      .populate('supplierId')
      .populate({
        path: 'items.materialId',
        populate: { path: 'preferredSuppliers', select: 'supplierName supplierCode' }
      })
      .populate('items.lotId');

    if (!po) return res.status(404).json({ success: false, message: 'Purchase order not found' });

    res.status(200).json({ success: true, data: po });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update purchase order (only draft status)
const updatePurchaseOrder = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ success: false, message: 'Purchase order not found' });

    if (po.status === 'received') {
      return res.status(400).json({ success: false, message: 'Cannot edit a received purchase order' });
    }

    Object.assign(po, req.body);
    po.totalAmount = (po.items || []).reduce((sum, item) => sum + (item.pricing?.totalCost || 0), 0);

    await po.save();

    res.status(200).json({ success: true, message: 'Purchase order updated', data: po });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Mark PO as received — creates lots and updates inventory
const receivePurchaseOrder = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ success: false, message: 'Purchase order not found' });

    if (po.status === 'received') {
      return res.status(400).json({ success: false, message: 'Purchase order already received' });
    }
    if (po.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot receive a cancelled PO' });
    }

    const { invoiceNumber, invoiceDate, invoiceUrl } = req.body;

    // Create a lot for each item
    for (let i = 0; i < po.items.length; i++) {
      const item = po.items[i];

      if (!item.storage?.location) {
        return res.status(400).json({
          success: false,
          message: `Storage location required for item ${i + 1} before receiving`
        });
      }

      const lot = new RawMaterialLot({
        materialId: item.materialId,
        supplierId: po.supplierId,
        purchaseDate: po.orderDate,
        initialQuantity: {
          weight: item.quantity.weight || 0,
          length: item.quantity.length || 0
        },
        pricing: {
          pricePerKg: item.pricing.pricePerKg || 0,
          pricePerKm: item.pricing.pricePerKm || 0,
          totalCost: item.pricing.totalCost || 0
        },
        storage: item.storage,
        invoiceNumber: invoiceNumber || po.invoiceNumber,
        invoiceDate: invoiceDate || po.invoiceDate,
        invoiceUrl: invoiceUrl || po.invoiceUrl,
        poNumber: po.poNumber,
        notes: item.notes
      });

      await lot.save();

      // Update material inventory
      const material = await RawMaterial.findById(item.materialId);
      if (material) {
        material.inventory.totalLots = (material.inventory.totalLots || 0) + 1;
        await material.calculateWeightedAverage();
        await material.save();
      }

      po.items[i].lotId = lot._id;
    }

    po.status = 'received';
    po.receivedAt = new Date();
    if (invoiceNumber) po.invoiceNumber = invoiceNumber;
    if (invoiceDate) po.invoiceDate = invoiceDate;
    if (invoiceUrl) po.invoiceUrl = invoiceUrl;

    await po.save();

    // Cross-link supplier and materials
    await crossLinkSupplierMaterials(po.supplierId, po.items);

    res.status(200).json({
      success: true,
      message: 'Purchase order received and lots created',
      data: po
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cancel PO
const cancelPurchaseOrder = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ success: false, message: 'Purchase order not found' });

    if (po.status === 'received') {
      return res.status(400).json({ success: false, message: 'Cannot cancel a received purchase order' });
    }

    po.status = 'cancelled';
    await po.save();

    res.status(200).json({ success: true, message: 'Purchase order cancelled', data: po });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get suggested suppliers for a raw material
const getSuggestedSuppliers = async (req, res) => {
  try {
    const { materialId } = req.params;

    const material = await RawMaterial.findById(materialId)
      .populate('preferredSuppliers', 'supplierName supplierCode status businessInfo');

    if (!material) return res.status(404).json({ success: false, message: 'Raw material not found' });

    // Also find suppliers that have this material's type in their deliveryTypes
    const materialTypeSuppliers = await Supplier.find({
      deliveryTypes: material.materialTypeId,
      status: 'active'
    }).select('supplierName supplierCode status businessInfo');

    // Merge: preferred suppliers first, then type-matched, deduped
    const preferredIds = new Set(material.preferredSuppliers.map(s => s._id.toString()));
    const additionalSuppliers = materialTypeSuppliers.filter(s => !preferredIds.has(s._id.toString()));

    res.status(200).json({
      success: true,
      data: {
        preferred: material.preferredSuppliers,
        others: additionalSuppliers
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper: cross-link supplier <-> raw material
async function crossLinkSupplierMaterials(supplierId, items) {
  try {
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) return;

    for (const item of items) {
      if (!item.materialId) continue;

      const material = await RawMaterial.findById(item.materialId);
      if (!material) continue;

      // Add supplier to material's preferredSuppliers if not present
      const supplierIdStr = supplierId.toString();
      const alreadyInMaterial = material.preferredSuppliers
        .some(s => s.toString() === supplierIdStr);

      if (!alreadyInMaterial) {
        material.preferredSuppliers.push(supplierId);
        await material.save();
      }

      // Add material type to supplier's deliveryTypes if not present
      if (material.materialTypeId) {
        const typeIdStr = material.materialTypeId.toString();
        const alreadyInSupplier = supplier.deliveryTypes
          .some(dt => dt.toString() === typeIdStr);

        if (!alreadyInSupplier) {
          supplier.deliveryTypes.push(material.materialTypeId);
        }
      }
    }

    await supplier.save();
  } catch (err) {
    console.error('Cross-link error:', err.message);
  }
}

export {
  createPurchaseOrder,
  getAllPurchaseOrders,
  getOnePurchaseOrder,
  updatePurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
  getSuggestedSuppliers
};
