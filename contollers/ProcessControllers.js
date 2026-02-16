import Process from '../models/ProcessModel.js';

const addProcess = async (req, res) => {
    try {
        const process = new Process(req.body);
        await process.save();
        res.status(201).json({ success: true, message: 'Process created', data: process });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const getAllProcesses = async (req, res) => {
    try {
        const filter = {};
        if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
        if (req.query.category) filter.category = req.query.category;

        const processes = await Process.find(filter).sort({ category: 1, name: 1 });
        res.status(200).json({ success: true, data: processes, count: processes.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getOneProcess = async (req, res) => {
    try {
        const process = await Process.findById(req.params.id);
        if (!process) return res.status(404).json({ success: false, message: 'Process not found' });
        res.status(200).json({ success: true, data: process });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateProcess = async (req, res) => {
    try {
        const process = await Process.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!process) return res.status(404).json({ success: false, message: 'Process not found' });
        res.status(200).json({ success: true, message: 'Process updated', data: process });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const deleteProcess = async (req, res) => {
    try {
        const process = await Process.findByIdAndDelete(req.params.id);
        if (!process) return res.status(404).json({ success: false, message: 'Process not found' });
        res.status(200).json({ success: true, message: 'Process deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export { addProcess, getAllProcesses, getOneProcess, updateProcess, deleteProcess };
