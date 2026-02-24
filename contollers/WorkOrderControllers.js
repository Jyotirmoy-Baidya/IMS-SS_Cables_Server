import WorkOrder from '../models/WorkOrderModel.js';
import Quotation from '../models/QuotationModel.js';

// Convert quotation to work order
export const createWorkOrder = async (req, res) => {
    try {
        const { quoteId, processAssignments, notes } = req.body;

        // Fetch quotation
        const quotation = await Quotation.findById(quoteId);
        if (!quotation) {
            return res.status(404).json({ success: false, message: 'Quotation not found' });
        }

        // Create work order
        const workOrder = await WorkOrder.create({
            quoteId: quotation._id,
            quoteNumber: quotation.quoteNumber,
            customerId: quotation.customerId,
            cableLength: quotation.cableLength,
            processAssignments,
            notes: notes || '',
        });

        // Update quotation with work order reference
        await Quotation.findByIdAndUpdate(quoteId, { workOrderId: workOrder._id });

        // Populate references
        await workOrder.populate([
            { path: 'customerId', select: 'companyName contacts businessInfo address' },
            { path: 'quoteId', select: 'quoteNumber status finalPrice' },
            { path: 'processAssignments.processId', select: 'name processType' },
            { path: 'processAssignments.assignedEmployeeId', select: 'name phoneNumbers' },
        ]);

        res.status(201).json({
            success: true,
            message: 'Work order created successfully',
            data: workOrder,
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Get all work orders
export const getAllWorkOrders = async (req, res) => {
    try {
        const { status, search } = req.query;
        const filter = {};

        if (status) filter.status = status;

        let workOrders = await WorkOrder.find(filter)
            .populate('customerId', 'companyName contacts businessInfo address')
            .populate('quoteId', 'quoteNumber status finalPrice')
            .populate('processAssignments.processId', 'name processType')
            .populate('processAssignments.assignedEmployeeId', 'name phoneNumbers')
            .sort({ createdAt: -1 });

        // Search filter (workOrderNumber, quoteNumber, customer name)
        if (search) {
            const s = search.toLowerCase();
            workOrders = workOrders.filter(wo =>
                wo.workOrderNumber?.toLowerCase().includes(s) ||
                wo.quoteNumber?.toLowerCase().includes(s) ||
                wo.customerId?.companyName?.toLowerCase().includes(s)
            );
        }

        res.json({ success: true, data: workOrders });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get single work order by ID
export const getWorkOrderById = async (req, res) => {
    try {
        const workOrder = await WorkOrder.findById(req.params.id)
            .populate('customerId', 'companyName contacts businessInfo address')
            .populate('quoteId')
            .populate('processAssignments.processId', 'name processType')
            .populate('processAssignments.assignedEmployeeId', 'name phoneNumbers');

        if (!workOrder) {
            return res.status(404).json({ success: false, message: 'Work order not found' });
        }

        res.json({ success: true, data: workOrder });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update work order
export const updateWorkOrder = async (req, res) => {
    try {
        const workOrder = await WorkOrder.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        )
            .populate('customerId', 'companyName contacts businessInfo address')
            .populate('quoteId', 'quoteNumber status finalPrice')
            .populate('processAssignments.processId', 'name processType')
            .populate('processAssignments.assignedEmployeeId', 'name phoneNumbers');

        if (!workOrder) {
            return res.status(404).json({ success: false, message: 'Work order not found' });
        }

        res.json({ success: true, message: 'Work order updated successfully', data: workOrder });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Patch work order (lightweight update)
export const patchWorkOrder = async (req, res) => {
    try {
        const workOrder = await WorkOrder.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        )
            .populate('customerId', 'companyName contacts businessInfo address')
            .populate('quoteId', 'quoteNumber status finalPrice')
            .populate('processAssignments.processId', 'name processType')
            .populate('processAssignments.assignedEmployeeId', 'name phoneNumbers');

        if (!workOrder) {
            return res.status(404).json({ success: false, message: 'Work order not found' });
        }

        res.json({ success: true, message: 'Work order updated successfully', data: workOrder });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Delete work order
export const deleteWorkOrder = async (req, res) => {
    try {
        const workOrder = await WorkOrder.findByIdAndDelete(req.params.id);
        if (!workOrder) {
            return res.status(404).json({ success: false, message: 'Work order not found' });
        }
        res.json({ success: true, message: 'Work order deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
