import RawMaterialLot from '../models/RawMaterialLotModel.js';
import RawMaterial from '../models/RawMaterialModel.js';

// Add new lot (procurement)
const addRawMaterialLot = async (req, res) => {
  try {
    const lot = new RawMaterialLot(req.body);
    await lot.save();

    // Update the raw material inventory
    const material = await RawMaterial.findById(lot.materialId);
    if (material) {
      await material.calculateWeightedAverage();
      await material.save();
    }

    // Populate references
    await lot.populate(['materialId', 'supplierId']);

    res.status(201).json({
      success: true,
      message: 'Raw material lot added successfully',
      data: lot
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get all lots
const getAllRawMaterialLots = async (req, res) => {
  try {
    const { materialId, supplierId, isFullyConsumed, search, startDate, endDate } = req.query;

    const filter = {};
    if (materialId) filter.materialId = materialId;
    if (supplierId) filter.supplierId = supplierId;
    if (isFullyConsumed !== undefined) filter.isFullyConsumed = isFullyConsumed === 'true';
    if (search) {
      filter.$or = [
        { lotNumber: { $regex: search, $options: 'i' } },
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { poNumber: { $regex: search, $options: 'i' } }
      ];
    }
    if (startDate || endDate) {
      filter.purchaseDate = {};
      if (startDate) filter.purchaseDate.$gte = new Date(startDate);
      if (endDate) filter.purchaseDate.$lte = new Date(endDate);
    }

    const lots = await RawMaterialLot.find(filter)
      .populate('materialId')
      .populate('supplierId')
      .sort({ purchaseDate: -1 });

    res.status(200).json({
      success: true,
      message: 'Raw material lots retrieved successfully',
      data: lots,
      count: lots.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single lot
const getOneRawMaterialLot = async (req, res) => {
  try {
    const lot = await RawMaterialLot.findById(req.params.id)
      .populate('materialId')
      .populate('supplierId');

    if (!lot) {
      return res.status(404).json({
        success: false,
        message: 'Raw material lot not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Raw material lot retrieved successfully',
      data: lot
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update lot
const updateRawMaterialLot = async (req, res) => {
  try {
    const lot = await RawMaterialLot.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate(['materialId', 'supplierId']);

    if (!lot) {
      return res.status(404).json({
        success: false,
        message: 'Raw material lot not found'
      });
    }

    // Recalculate material inventory
    const material = await RawMaterial.findById(lot.materialId);
    if (material) {
      await material.calculateWeightedAverage();
      await material.save();
    }

    res.status(200).json({
      success: true,
      message: 'Raw material lot updated successfully',
      data: lot
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Delete lot
const deleteRawMaterialLot = async (req, res) => {
  try {
    const lot = await RawMaterialLot.findByIdAndDelete(req.params.id);

    if (!lot) {
      return res.status(404).json({
        success: false,
        message: 'Raw material lot not found'
      });
    }

    // Recalculate material inventory
    const material = await RawMaterial.findById(lot.materialId);
    if (material) {
      await material.calculateWeightedAverage();
      await material.save();
    }

    res.status(200).json({
      success: true,
      message: 'Raw material lot deleted successfully',
      data: lot
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get lots for a specific material (active lots sorted by LIFO)
const getLotsByMaterial = async (req, res) => {
  try {
    const lots = await RawMaterialLot.find({
      materialId: req.params.materialId,
      isFullyConsumed: false,
      isActive: true
    })
      .populate('supplierId')
      .sort({ purchaseDate: -1 });

    res.status(200).json({
      success: true,
      message: 'Lots retrieved successfully',
      data: lots,
      count: lots.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get LIFO consumption preview (which lots will be consumed for a given quantity)
const getLifoPreview = async (req, res) => {
  try {
    const { materialId, quantity, unit = 'weight' } = req.query;

    if (!materialId || !quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid parameters'
      });
    }

    const lots = await RawMaterialLot.find({
      materialId,
      isFullyConsumed: false,
      isActive: true
    })
      .populate('supplierId')
      .sort({ purchaseDate: -1 });

    let remainingToConsume = parseFloat(quantity);
    const preview = [];
    let totalCost = 0;

    for (const lot of lots) {
      if (remainingToConsume <= 0) break;

      const availableQuantity = unit === 'weight'
        ? lot.remainingQuantity.weight
        : lot.remainingQuantity.length;

      const consumedFromThisLot = Math.min(remainingToConsume, availableQuantity);

      const price = unit === 'weight'
        ? lot.pricing.pricePerKg
        : lot.pricing.pricePerKm;
      const cost = consumedFromThisLot * price;

      preview.push({
        lotNumber: lot.lotNumber,
        supplier: lot.supplierId ? lot.supplierId.supplierName : 'Unknown',
        purchaseDate: lot.purchaseDate,
        consumed: consumedFromThisLot,
        remaining: availableQuantity - consumedFromThisLot,
        price: price,
        cost: cost
      });

      totalCost += cost;
      remainingToConsume -= consumedFromThisLot;
    }

    const avgCost = parseFloat(quantity) > 0 ? totalCost / parseFloat(quantity) : 0;

    res.status(200).json({
      success: true,
      message: 'LIFO preview generated successfully',
      data: {
        requestedQuantity: parseFloat(quantity),
        unit,
        preview,
        totalCost,
        avgCostPerUnit: avgCost,
        feasible: remainingToConsume <= 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export {
  addRawMaterialLot,
  getAllRawMaterialLots,
  getOneRawMaterialLot,
  updateRawMaterialLot,
  deleteRawMaterialLot,
  getLotsByMaterial,
  getLifoPreview
};
