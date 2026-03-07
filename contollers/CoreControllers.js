import Core from '../models/CoreModel.js';

const addCore = async (req, res) => {
    try {
        const core = new Core(req.body);
        await core.save();
        res.status(201).json({ success: true, message: 'Core created successfully', data: core });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const getAllCores = async (req, res) => {
    try {
        const filter = {};
        if (req.query.status) filter.status = req.query.status;

        const cores = await Core.find(filter)
            .populate('conductor.materialTypeId', 'name category')
            .populate('insulation.materialTypeId', 'name category')
            .populate('insulation.reprocessMaterialTypeId', 'name category')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: cores, count: cores.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getOneCore = async (req, res) => {
    try {
        const core = await Core.findById(req.params.id)
            .populate('conductor.materialTypeId', 'name category')
            .populate('insulation.materialTypeId', 'name category')
            .populate('insulation.reprocessMaterialTypeId', 'name category');

        if (!core) {
            return res.status(404).json({ success: false, message: 'Core not found' });
        }

        res.status(200).json({ success: true, data: core });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateCore = async (req, res) => {
    try {
        const core = await Core.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        )
            .populate('conductor.materialTypeId', 'name category')
            .populate('insulation.materialTypeId', 'name category')
            .populate('insulation.reprocessMaterialTypeId', 'name category');

        if (!core) {
            return res.status(404).json({ success: false, message: 'Core not found' });
        }

        res.status(200).json({ success: true, message: 'Core updated successfully', data: core });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const deleteCore = async (req, res) => {
    try {
        const core = await Core.findByIdAndDelete(req.params.id);

        if (!core) {
            return res.status(404).json({ success: false, message: 'Core not found' });
        }

        res.status(200).json({ success: true, message: 'Core deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export {
    addCore,
    getAllCores,
    getOneCore,
    updateCore,
    deleteCore
};
