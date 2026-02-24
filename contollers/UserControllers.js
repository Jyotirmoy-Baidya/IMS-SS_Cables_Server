import User from '../models/UserModel.js';

export const createUser = async (req, res) => {
    try {
        const user = await User.create(req.body);
        res.status(201).json({ success: true, message: 'User created successfully', data: user });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

export const getAllUsers = async (req, res) => {
    try {
        const { role, isActive, search } = req.query;
        const filter = {};

        if (role) filter.role = role;
        if (isActive !== undefined) filter.isActive = isActive === 'true';

        let users = await User.find(filter)
            .populate('processes', 'name processType isActive')
            .sort({ createdAt: -1 });

        // Search filter (name or phone)
        if (search) {
            const s = search.toLowerCase();
            users = users.filter(u =>
                u.name?.toLowerCase().includes(s) ||
                u.phoneNumbers?.some(p => p.number?.includes(s))
            );
        }

        res.json({ success: true, data: users });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate('processes', 'name processType isActive');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, data: user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const updateUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, message: 'User updated successfully', data: user });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
