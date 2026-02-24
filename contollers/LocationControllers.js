import Location from '../models/LocationModel.js';

export const createLocation = async (req, res) => {
    try {
        const location = await Location.create(req.body);
        res.status(201).json({ success: true, message: 'Location created successfully', data: location });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

export const getAllLocations = async (req, res) => {
    try {
        const { isActive } = req.query;
        const filter = {};
        if (isActive !== undefined) filter.isActive = isActive === 'true';

        const locations = await Location.find(filter).sort({ name: 1 });
        res.json({ success: true, data: locations });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getLocationById = async (req, res) => {
    try {
        const location = await Location.findById(req.params.id);
        if (!location) return res.status(404).json({ success: false, message: 'Location not found' });
        res.json({ success: true, data: location });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const updateLocation = async (req, res) => {
    try {
        const location = await Location.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!location) return res.status(404).json({ success: false, message: 'Location not found' });
        res.json({ success: true, message: 'Location updated successfully', data: location });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

export const deleteLocation = async (req, res) => {
    try {
        const location = await Location.findByIdAndDelete(req.params.id);
        if (!location) return res.status(404).json({ success: false, message: 'Location not found' });
        res.json({ success: true, message: 'Location deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
