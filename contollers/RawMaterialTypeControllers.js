import RawMaterialType from '../models/RawMaterialTypeModel.js';

// Add new raw material type
const addRawMaterialType = async (req, res) => {
  try {
    const materialType = new RawMaterialType(req.body);
    await materialType.save();
    res.status(201).json({
      success: true,
      message: 'Raw material type added successfully',
      data: materialType
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get all raw material types
const getAllRawMaterialTypes = async (req, res) => {
  try {
    const { category, isActive, search } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const materialTypes = await RawMaterialType.find(filter).sort({ name: 1 });

    res.status(200).json({
      success: true,
      message: 'Raw material types retrieved successfully',
      data: materialTypes,
      count: materialTypes.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single raw material type
const getOneRawMaterialType = async (req, res) => {
  try {
    const materialType = await RawMaterialType.findById(req.params.id);

    if (!materialType) {
      return res.status(404).json({
        success: false,
        message: 'Raw material type not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Raw material type retrieved successfully',
      data: materialType
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update raw material type
const updateRawMaterialType = async (req, res) => {
  try {
    const materialType = await RawMaterialType.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!materialType) {
      return res.status(404).json({
        success: false,
        message: 'Raw material type not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Raw material type updated successfully',
      data: materialType
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Delete raw material type
const deleteRawMaterialType = async (req, res) => {
  try {
    const materialType = await RawMaterialType.findByIdAndDelete(req.params.id);

    if (!materialType) {
      return res.status(404).json({
        success: false,
        message: 'Raw material type not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Raw material type deleted successfully',
      data: materialType
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export {
  addRawMaterialType,
  getAllRawMaterialTypes,
  getOneRawMaterialType,
  updateRawMaterialType,
  deleteRawMaterialType
};
