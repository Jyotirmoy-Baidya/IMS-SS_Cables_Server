import RawMaterial from '../models/RawMaterialModel.js';
import RawMaterialType from '../models/RawMaterialTypeModel.js';

// Add new raw material
const addRawMaterial = async (req, res) => {
  try {
    const material = new RawMaterial(req.body);
    await material.save();

    // Populate references
    await material.populate(['materialTypeId', 'preferredSuppliers']);

    res.status(201).json({
      success: true,
      message: 'Raw material added successfully',
      data: material
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get all raw materials
const getAllRawMaterials = async (req, res) => {
  try {
    const { category, isActive, search, lowStock } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { materialCode: { $regex: search, $options: 'i' } }
      ];
    }
    if (lowStock === 'true') {
      filter.$expr = {
        $lt: ['$inventory.totalWeight', '$reorderLevel']
      };
    }

    const materials = await RawMaterial.find(filter)
      .populate('materialTypeId')
      .populate('preferredSuppliers')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Raw materials retrieved successfully',
      data: materials,
      count: materials.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single raw material
const getOneRawMaterial = async (req, res) => {
  try {
    const material = await RawMaterial.findById(req.params.id)
      .populate('materialTypeId')
      .populate('preferredSuppliers');

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Raw material not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Raw material retrieved successfully',
      data: material
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update raw material
const updateRawMaterial = async (req, res) => {
  try {
    const material = await RawMaterial.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate(['materialTypeId', 'preferredSuppliers']);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Raw material not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Raw material updated successfully',
      data: material
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Delete raw material
const deleteRawMaterial = async (req, res) => {
  try {
    const material = await RawMaterial.findByIdAndDelete(req.params.id);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Raw material not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Raw material deleted successfully',
      data: material
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Recalculate inventory for a material
const recalculateInventory = async (req, res) => {
  try {
    const material = await RawMaterial.findById(req.params.id);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Raw material not found'
      });
    }

    await material.calculateWeightedAverage();
    await material.save();

    res.status(200).json({
      success: true,
      message: 'Inventory recalculated successfully',
      data: material
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Consume material (LIFO)
const consumeMaterial = async (req, res) => {
  try {
    const { quantity, unit = 'weight' } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quantity'
      });
    }

    const material = await RawMaterial.findById(req.params.id);

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Raw material not found'
      });
    }

    const result = await material.consumeMaterial(quantity, unit);

    res.status(200).json({
      success: true,
      message: 'Material consumed successfully',
      data: {
        material,
        consumption: result
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get inventory summary
const getInventorySummary = async (req, res) => {
  try {
    const materials = await RawMaterial.find({ isActive: true });

    const summary = {
      totalMaterials: materials.length,
      totalValue: 0,
      lowStock: 0,
      byCategory: {}
    };

    materials.forEach(material => {
      const value = material.inventory.totalWeight * material.inventory.avgPricePerKg;
      summary.totalValue += value;

      if (material.inventory.totalWeight < material.reorderLevel) {
        summary.lowStock++;
      }

      if (!summary.byCategory[material.category]) {
        summary.byCategory[material.category] = {
          count: 0,
          totalWeight: 0,
          totalValue: 0
        };
      }

      summary.byCategory[material.category].count++;
      summary.byCategory[material.category].totalWeight += material.inventory.totalWeight;
      summary.byCategory[material.category].totalValue += value;
    });

    res.status(200).json({
      success: true,
      message: 'Inventory summary retrieved successfully',
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add reprocess inventory (recycled scrap)
const addReprocess = async (req, res) => {
  try {
    const { weight, pricePerKg } = req.body;
    if (!weight || weight <= 0) {
      return res.status(400).json({ success: false, message: 'Weight must be greater than 0' });
    }
    if (!pricePerKg || pricePerKg < 0) {
      return res.status(400).json({ success: false, message: 'Price per kg must be 0 or greater' });
    }

    const material = await RawMaterial.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Raw material not found' });
    }

    const currentWeight = material.reprocessInventory?.totalWeight || 0;
    const currentPrice = material.reprocessInventory?.pricePerKg || 0;
    const newTotal = currentWeight + weight;
    // Weighted average price
    const newAvgPrice = newTotal > 0
      ? (currentWeight * currentPrice + weight * pricePerKg) / newTotal
      : pricePerKg;

    material.reprocessInventory = { totalWeight: newTotal, pricePerKg: newAvgPrice };
    await material.save();

    res.status(200).json({
      success: true,
      message: 'Reprocess inventory updated',
      data: material
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export {
  addRawMaterial,
  getAllRawMaterials,
  getOneRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
  recalculateInventory,
  consumeMaterial,
  getInventorySummary,
  addReprocess
};
