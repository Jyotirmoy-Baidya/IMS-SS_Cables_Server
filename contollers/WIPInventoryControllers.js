import WIPInventory from '../models/WIPInventoryModel.js';

// Get all WIP inventory items
export const getAllWIPInventory = async (req, res) => {
    try {
        const { workOrderId, isActive, isFullyConsumed, search } = req.query;
        const filter = {};

        if (workOrderId) filter.workOrderId = workOrderId;
        if (isActive !== undefined) filter.isActive = isActive === 'true';
        if (isFullyConsumed !== undefined) filter.isFullyConsumed = isFullyConsumed === 'true';

        let wipItems = await WIPInventory.find(filter)
            .populate('workOrderId', 'workOrderNumber customerId cableLength')
            .populate('processId', 'name category')
            .sort({ createdAt: -1 });

        // Search filter
        if (search) {
            const s = search.toLowerCase();
            wipItems = wipItems.filter(item =>
                item.itemName?.toLowerCase().includes(s) ||
                item.workOrderNumber?.toLowerCase().includes(s) ||
                item.processName?.toLowerCase().includes(s)
            );
        }

        res.json({ success: true, data: wipItems });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get single WIP inventory item
export const getWIPInventoryById = async (req, res) => {
    try {
        const wipItem = await WIPInventory.findById(req.params.id)
            .populate('workOrderId')
            .populate('processId', 'name category description');

        if (!wipItem) {
            return res.status(404).json({ success: false, message: 'WIP inventory item not found' });
        }

        res.json({ success: true, data: wipItem });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get available WIP items for a work order (not fully consumed)
export const getAvailableWIPForWorkOrder = async (req, res) => {
    try {
        const { workOrderId } = req.params;

        const wipItems = await WIPInventory.find({
            workOrderId,
            isActive: true,
            isFullyConsumed: false,
            $expr: {
                $or: [
                    { $gt: ['$remainingQuantity.weight', 0] },
                    { $gt: ['$remainingQuantity.length', 0] }
                ]
            }
        })
            .populate('processId', 'name category')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: wipItems });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update WIP inventory item
export const updateWIPInventory = async (req, res) => {
    try {
        const wipItem = await WIPInventory.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        )
            .populate('workOrderId', 'workOrderNumber')
            .populate('processId', 'name category');

        if (!wipItem) {
            return res.status(404).json({ success: false, message: 'WIP inventory item not found' });
        }

        res.json({ success: true, message: 'WIP inventory item updated successfully', data: wipItem });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Delete WIP inventory item
export const deleteWIPInventory = async (req, res) => {
    try {
        const wipItem = await WIPInventory.findByIdAndDelete(req.params.id);
        if (!wipItem) {
            return res.status(404).json({ success: false, message: 'WIP inventory item not found' });
        }

        res.json({ success: true, message: 'WIP inventory item deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Check availability of WIP item
export const checkWIPAvailability = async (req, res) => {
    try {
        const { wipInventoryId, requiredQuantity } = req.body;

        const wipItem = await WIPInventory.findById(wipInventoryId);
        if (!wipItem) {
            return res.status(404).json({ success: false, message: 'WIP inventory item not found' });
        }

        if (wipItem.isFullyConsumed) {
            return res.json({
                success: true,
                available: false,
                message: 'WIP item is fully consumed',
                data: { wipItem, available: 0 }
            });
        }

        // Calculate available (remaining - allocated)
        const availableWeight = (wipItem.remainingQuantity.weight || 0) - (wipItem.allocatedQuantity.weight || 0);
        const availableLength = (wipItem.remainingQuantity.length || 0) - (wipItem.allocatedQuantity.length || 0);

        const isSufficient = (requiredQuantity.weight || 0) <= availableWeight &&
                            (requiredQuantity.length || 0) <= availableLength;

        res.json({
            success: true,
            available: isSufficient,
            data: {
                wipItem,
                availableWeight,
                availableLength,
                requiredWeight: requiredQuantity.weight || 0,
                requiredLength: requiredQuantity.length || 0,
                isSufficient
            }
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
