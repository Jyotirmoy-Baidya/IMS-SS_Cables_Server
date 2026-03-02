import FinishedGoods from '../models/FinishedGoodsModel.js';

// Get all finished goods
export const getAllFinishedGoods = async (req, res) => {
    try {
        const { workOrderId, deliveryStatus, customerId, isActive, search } = req.query;
        const filter = {};

        if (workOrderId) filter.workOrderId = workOrderId;
        if (deliveryStatus) filter.deliveryStatus = deliveryStatus;
        if (customerId) filter.customerId = customerId;
        if (isActive !== undefined) filter.isActive = isActive === 'true';

        let finishedGoods = await FinishedGoods.find(filter)
            .populate('workOrderId', 'workOrderNumber customerId cableLength')
            .populate('processId', 'name category')
            .populate('customerId', 'name email phone')
            .sort({ createdAt: -1 });

        // Search filter
        if (search) {
            const s = search.toLowerCase();
            finishedGoods = finishedGoods.filter(item =>
                item.itemName?.toLowerCase().includes(s) ||
                item.workOrderNumber?.toLowerCase().includes(s) ||
                item.processName?.toLowerCase().includes(s) ||
                item.customerName?.toLowerCase().includes(s)
            );
        }

        res.json({ success: true, data: finishedGoods });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get single finished goods item
export const getFinishedGoodsById = async (req, res) => {
    try {
        const finishedGoods = await FinishedGoods.findById(req.params.id)
            .populate('workOrderId')
            .populate('processId', 'name category description')
            .populate('customerId', 'name email phone address');

        if (!finishedGoods) {
            return res.status(404).json({ success: false, message: 'Finished goods item not found' });
        }

        res.json({ success: true, data: finishedGoods });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update finished goods item
export const updateFinishedGoods = async (req, res) => {
    try {
        const finishedGoods = await FinishedGoods.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        )
            .populate('workOrderId', 'workOrderNumber')
            .populate('processId', 'name category')
            .populate('customerId', 'name email');

        if (!finishedGoods) {
            return res.status(404).json({ success: false, message: 'Finished goods item not found' });
        }

        res.json({ success: true, message: 'Finished goods item updated successfully', data: finishedGoods });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Update delivery status
export const updateDeliveryStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const finishedGoods = await FinishedGoods.findById(req.params.id);

        if (!finishedGoods) {
            return res.status(404).json({ success: false, message: 'Finished goods item not found' });
        }

        finishedGoods.deliveryStatus = status;

        if (status === 'dispatched' && !finishedGoods.dispatchedAt) {
            finishedGoods.dispatchedAt = new Date();
        }

        if (status === 'delivered' && !finishedGoods.deliveredAt) {
            finishedGoods.deliveredAt = new Date();
        }

        await finishedGoods.save();

        res.json({ success: true, message: 'Delivery status updated successfully', data: finishedGoods });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Delete finished goods item
export const deleteFinishedGoods = async (req, res) => {
    try {
        const finishedGoods = await FinishedGoods.findByIdAndDelete(req.params.id);
        if (!finishedGoods) {
            return res.status(404).json({ success: false, message: 'Finished goods item not found' });
        }

        res.json({ success: true, message: 'Finished goods item deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
