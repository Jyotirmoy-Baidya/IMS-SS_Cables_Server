import WorkOrder from '../models/WorkOrderModel.js';
import Quotation from '../models/QuotationModel.js';
import RawMaterialLot from '../models/RawMaterialLotModel.js';

// Convert quotation to work order
export const createWorkOrder = async (req, res) => {
    let workOrder = null;

    try {
        const { quoteId, processAssignments, notes } = req.body;

        // Fetch quotation
        const quotation = await Quotation.findById(quoteId);
        if (!quotation) {
            return res.status(404).json({ success: false, message: 'Quotation not found' });
        }

        // Create work order
        workOrder = await WorkOrder.create({
            quoteId: quotation._id,
            quoteNumber: quotation.quoteNumber,
            customerId: quotation.customerId,
            cableLength: quotation.cableLength,
            processAssignments,
            notes: notes || '',
            allocatedMaterials: [] // Initialize empty
        });

        // Use stored material requirements from quotation
        const materialRequirements = quotation.requiredMaterialsQuantity || [];

        // Allocate materials (LIFO strategy)
        if (materialRequirements.length > 0) {
            const allocatedMaterials = [];

            for (const requirement of materialRequirements) {
                const { materialId, requiredWeight, materialName } = requirement;

                if (!requiredWeight || requiredWeight <= 0) continue;

                // Find available lots for this material (LIFO - latest first)
                const lots = await RawMaterialLot.find({
                    materialId: materialId,
                    isActive: true,
                    isFullyConsumed: false,
                }).sort({ purchaseDate: -1 });

                let remainingToAllocate = requiredWeight;

                for (const lot of lots) {
                    if (remainingToAllocate <= 0) break;

                    const available = (lot.remainingQuantity?.weight || 0) - (lot.allocatedQuantity?.weight || 0);
                    if (available <= 0) continue;

                    const toAllocate = Math.min(available, remainingToAllocate);

                    // Update lot allocation
                    lot.allocatedQuantity = lot.allocatedQuantity || { weight: 0, length: 0 };
                    lot.allocatedQuantity.weight = (lot.allocatedQuantity.weight || 0) + toAllocate;
                    await lot.save();

                    // Add to work order's allocated materials
                    allocatedMaterials.push({
                        materialId: materialId,
                        materialName: materialName || 'Unknown',
                        materialLotId: lot._id,
                        lotNumber: lot.lotNumber,
                        allocatedWeight: toAllocate,
                        allocatedLength: 0,
                        allocatedAt: new Date(),
                        isConsumed: false
                    });

                    remainingToAllocate -= toAllocate;
                }

                if (remainingToAllocate > 0) {
                    // Log warning but don't fail - allow partial allocation
                    console.warn(`Insufficient material: ${remainingToAllocate}kg shortage for ${materialName}`);
                }
            }

            // Update work order with allocated materials
            workOrder.allocatedMaterials = allocatedMaterials;
            await workOrder.save();
        }

        // Update quotation with work order reference
        await Quotation.findByIdAndUpdate(quoteId, { workOrderId: workOrder._id });

        // Populate references
        await workOrder.populate([
            { path: 'customerId', select: 'companyName contacts businessInfo address' },
            { path: 'quoteId', select: 'quoteNumber status finalPrice' },
            { path: 'processAssignments.processId', select: 'name processType' },
            { path: 'processAssignments.assignedEmployeeId', select: 'name phoneNumbers' },
            { path: 'allocatedMaterials.materialId', select: 'name category' },
            { path: 'allocatedMaterials.materialLotId', select: 'lotNumber purchaseDate' },
        ]);

        res.status(201).json({
            success: true,
            message: 'Work order created successfully with material allocation',
            data: workOrder,
        });
    } catch (err) {
        // If work order was created but allocation failed, clean up
        if (workOrder && workOrder._id) {
            try {
                await WorkOrder.findByIdAndDelete(workOrder._id);
            } catch (cleanupErr) {
                console.error('Failed to clean up work order:', cleanupErr);
            }
        }
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
        const workOrder = await WorkOrder.findById(req.params.id);
        if (!workOrder) {
            return res.status(404).json({ success: false, message: 'Work order not found' });
        }

        // Deallocate materials before deleting
        if (workOrder.allocatedMaterials && workOrder.allocatedMaterials.length > 0) {
            for (const allocated of workOrder.allocatedMaterials) {
                if (!allocated.isConsumed) {
                    const lot = await RawMaterialLot.findById(allocated.materialLotId);
                    if (lot) {
                        lot.allocatedQuantity = lot.allocatedQuantity || { weight: 0, length: 0 };
                        lot.allocatedQuantity.weight = Math.max(
                            0,
                            (lot.allocatedQuantity.weight || 0) - (allocated.allocatedWeight || 0)
                        );
                        lot.allocatedQuantity.length = Math.max(
                            0,
                            (lot.allocatedQuantity.length || 0) - (allocated.allocatedLength || 0)
                        );
                        await lot.save();
                    }
                }
            }
        }

        // Now delete the work order
        await WorkOrder.findByIdAndDelete(req.params.id);

        res.json({ success: true, message: 'Work order deleted and materials deallocated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
