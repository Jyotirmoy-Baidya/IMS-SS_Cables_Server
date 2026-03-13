import mongoose from 'mongoose';
import WorkOrder from '../models/WorkOrderModel.js';
import Quotation from '../models/QuotationModel.js';
import RawMaterialLot from '../models/RawMaterialLotModel.js';
import RawMaterial from '../models/RawMaterialModel.js';
import ProcessInWorkOrder from '../models/ProcessInWorkOrderModel.js';

// Convert quotation to work order
export const createWorkOrder = async (req, res) => {
    let workOrder = null;

    try {
        const { quoteId, processAssignments, materialRequirements, processCosts, notes, finalQuotePriceId } = req.body;

        // Fetch quotation
        const quotation = await Quotation.findById(quoteId);
        if (!quotation) {
            return res.status(404).json({ success: false, message: 'Quotation not found' });
        }

        // Use material requirements from request (calculated from materialRequired arrays)
        const materialCostsBreakdown = (materialRequirements || []).map(req => ({
            materialId: req.materialId,
            materialName: req.materialName,
            quantity: req.weight,
            unit: 'kg',
            pricePerUnit: req.pricePerKg || 0,
            totalCost: req.totalCost || 0
        }));

        // Use process costs from request
        const processCostsBreakdown = processCosts || [];

        const totalProcessCost = processCostsBreakdown.reduce((sum, p) => sum + (p.cost || 0), 0);
        const totalMaterialCost = materialCostsBreakdown.reduce((sum, m) => sum + (m.totalCost || 0), 0);

        // Create work order with costing
        workOrder = await WorkOrder.create({
            quoteId: quotation._id,
            quoteNumber: quotation.quoteNumber,
            customerId: quotation.customerId,
            cableLength: quotation.cableLength,
            notes: notes || '',
            allocatedMaterials: [],
            finalQuotePriceId: finalQuotePriceId || null,
            materialCosts: {
                totalCost: totalMaterialCost,
                breakdown: materialCostsBreakdown
            },
            processCosts: {
                totalCost: totalProcessCost,
                breakdown: processCostsBreakdown
            },
            finalCost: {
                materialCost: totalMaterialCost,
                processCost: totalProcessCost,
            },
            extra: {
                extraAllocatedMaterials: [],
                extraCostBear: 0,
                miscellaneousCost: 0
            },
            relatedWorkOrders: [] // Empty for now, can be populated later
        });

        // Use material requirements from request body
        // Allocate materials (LIFO strategy)
        if (materialRequirements && materialRequirements.length > 0) {
            const allocatedMaterials = [];

            for (const requirement of materialRequirements) {
                const { materialId, weight, materialName, pricePerKg, totalCost } = requirement;

                if (!weight || weight <= 0) continue;

                // Use price from requirement (already calculated in quotation)
                const reqPricePerKg = pricePerKg || 0;
                const reqTotalCost = totalCost || 0;

                // Find available lots for this material (LIFO - latest first)
                const lots = await RawMaterialLot.find({
                    materialId: materialId,
                    isActive: true,
                    isFullyConsumed: false,
                }).sort({ purchaseDate: -1 });

                let remainingToAllocate = weight;
                let remainingCost = reqTotalCost;

                for (const lot of lots) {
                    if (remainingToAllocate <= 0) break;

                    const available = (lot.remainingQuantity?.weight || 0) - (lot.allocatedQuantity?.weight || 0);
                    if (available <= 0) continue;

                    const toAllocate = Math.min(available, remainingToAllocate);

                    // Calculate proportional cost based on requirement's price
                    const costForThis = (toAllocate / weight) * reqTotalCost;

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
                        pricePerKg: reqPricePerKg,
                        totalCost: costForThis,
                        allocatedAt: new Date(),
                        isConsumed: false,
                        isExtraRequest: false
                    });

                    remainingToAllocate -= toAllocate;
                    remainingCost -= costForThis;
                }

                if (remainingToAllocate > 0) {
                    // Log warning but don't fail - allow partial allocation
                    console.warn(`Insufficient material: ${remainingToAllocate}kg shortage for ${materialName}`);
                }
            }

            // Update work order with allocated materials
            workOrder.allocatedMaterials = allocatedMaterials;

            // Calculate total material cost from allocated materials
            const totalMaterialCost = allocatedMaterials.reduce((sum, mat) => sum + (mat.totalCost || 0), 0);

            // Update material costs (using costs from requirements)
            workOrder.materialCosts.totalCost = totalMaterialCost;


            workOrder.finalCost = {
                materialCost: totalMaterialCost,
                processCost: workOrder.processCosts.totalCost,
            };

            await workOrder.save();
        }

        // Create ProcessInWorkOrder documents for each process assignment
        const processInWorkOrderDocs = [];
        for (const assignment of processAssignments) {
            const processDoc = await ProcessInWorkOrder.create({
                workOrderId: workOrder._id,
                workOrderNumber: workOrder.workOrderNumber,
                processAssignmentId: assignment._id || new mongoose.Types.ObjectId(),
                processId: assignment.processId,
                processName: assignment.processName,
                assignedEmployeeId: assignment.assignedEmployeeId,
                status: 'pending',
                progressPercentage: 0,
                output: {
                    outputType: assignment.expectedOutput?.outputType || 'none',
                    calculatedQuantity: assignment.expectedOutput?.calculatedQuantity || 0,
                    calculatedItemName: assignment.expectedOutput?.calculatedItemName || '',
                    calculatedSpecification: assignment.expectedOutput?.calculatedSpecification || '',
                    unit: assignment.expectedOutput?.unit || 'm'
                },
                producedOutput: 0,
                inputs: [],
                logs: [],
                notes: '',
                addReportAfter: assignment.addReportAfter || false,
                reportUploaded: false,
                reportReceived: false,
                canStart: true,
                blockReason: ''
            });

            processInWorkOrderDocs.push({
                processId: processDoc._id,
                sequence: assignment.sequence || 0
            });
        }

        // Update work order with processInWorkOrder references
        workOrder.processInWorkOrder = processInWorkOrderDocs;
        await workOrder.save();

        // Update quotation with work order reference
        await Quotation.findByIdAndUpdate(quoteId, { workOrderId: workOrder._id });

        // Populate references
        await workOrder.populate([
            { path: 'customerId', select: 'companyName contacts businessInfo address' },
            { path: 'quoteId', select: 'quoteNumber status finalPrice' },
            { path: 'allocatedMaterials.materialId', select: 'name category' },
            { path: 'allocatedMaterials.materialLotId', select: 'lotNumber purchaseDate' },
            { path: 'processInWorkOrder.processId' },
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
            .populate('processInWorkOrder.processId')
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
            .populate('processInWorkOrder.processId');

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
            .populate('processInWorkOrder.processId');

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
            .populate('processInWorkOrder.processId');

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
                    // Deallocate from lot
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

        // Deallocate extra materials before deleting
        if (workOrder.extra?.extraAllocatedMaterials && workOrder.extra.extraAllocatedMaterials.length > 0) {
            for (const allocated of workOrder.extra.extraAllocatedMaterials) {
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

        // Delete all ProcessInWorkOrder documents associated with this work order
        await ProcessInWorkOrder.deleteMany({ workOrderId: req.params.id });

        // Now delete the work order
        await WorkOrder.findByIdAndDelete(req.params.id);

        res.json({ success: true, message: 'Work order deleted, materials deallocated, and processes removed successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Request extra material during production
export const requestExtraMaterial = async (req, res) => {
    try {
        const { workOrderId } = req.params;
        const { materialId, materialName, requestedQuantity, reason, requestedBy } = req.body;

        const workOrder = await WorkOrder.findById(workOrderId);
        if (!workOrder) {
            return res.status(404).json({ success: false, message: 'Work order not found' });
        }

        // Add extra material request
        workOrder.extraMaterialRequests.push({
            materialId,
            materialName,
            requestedQuantity,
            reason,
            requestedBy,
            requestedAt: new Date(),
            status: 'pending'
        });

        await workOrder.save();

        res.json({
            success: true,
            message: 'Extra material request submitted successfully',
            data: workOrder
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Approve extra material request
export const approveExtraMaterialRequest = async (req, res) => {
    try {
        const { workOrderId, requestId } = req.params;
        const { approvedBy } = req.body;

        const workOrder = await WorkOrder.findById(workOrderId);
        if (!workOrder) {
            return res.status(404).json({ success: false, message: 'Work order not found' });
        }

        const request = workOrder.extraMaterialRequests.id(requestId);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Request already processed' });
        }

        // Find available lots for allocation (LIFO)
        const lots = await RawMaterialLot.find({
            materialId: request.materialId,
            isActive: true,
            isFullyConsumed: false
        }).sort({ purchaseDate: -1 });

        let remainingToAllocate = request.requestedQuantity.weight || 0;
        const extraAllocatedMaterials = [];
        let totalExtraCost = 0;

        for (const lot of lots) {
            if (remainingToAllocate <= 0) break;

            const available = (lot.remainingQuantity?.weight || 0) - (lot.allocatedQuantity?.weight || 0);
            if (available <= 0) continue;

            const toAllocate = Math.min(available, remainingToAllocate);
            const pricePerKg = lot.pricePerKg || lot.avgPricePerKg || 0;
            const costForThis = toAllocate * pricePerKg;

            // Update lot allocation
            lot.allocatedQuantity = lot.allocatedQuantity || { weight: 0, length: 0 };
            lot.allocatedQuantity.weight = (lot.allocatedQuantity.weight || 0) + toAllocate;
            await lot.save();

            // Add to work order's extra allocated materials
            const allocatedMat = {
                materialId: request.materialId,
                materialName: request.materialName,
                materialLotId: lot._id,
                lotNumber: lot.lotNumber,
                allocatedWeight: toAllocate,
                allocatedLength: 0,
                pricePerKg: pricePerKg,
                totalCost: costForThis,
                allocatedAt: new Date(),
                requestId: requestId
            };

            extraAllocatedMaterials.push(allocatedMat);
            totalExtraCost += costForThis;

            remainingToAllocate -= toAllocate;
        }

        if (remainingToAllocate > 0) {
            return res.status(400).json({
                success: false,
                message: `Insufficient material: ${remainingToAllocate}kg shortage`
            });
        }

        // Initialize extra object if it doesn't exist
        if (!workOrder.extra) {
            workOrder.extra = {
                extraAllocatedMaterials: [],
                extraCostBear: 0,
                miscellaneousCost: 0
            };
        }

        // Add to extra allocated materials
        workOrder.extra.extraAllocatedMaterials.push(...extraAllocatedMaterials);
        workOrder.extra.extraCostBear = (workOrder.extra.extraCostBear || 0) + totalExtraCost;

        // Update request status
        request.status = 'approved';
        request.approvedBy = approvedBy;
        request.approvedAt = new Date();

        await workOrder.save();

        res.json({
            success: true,
            message: 'Extra material request approved and allocated',
            data: workOrder
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Reject extra material request
export const rejectExtraMaterialRequest = async (req, res) => {
    try {
        const { workOrderId, requestId } = req.params;
        const { approvedBy, notes } = req.body;

        const workOrder = await WorkOrder.findById(workOrderId);
        if (!workOrder) {
            return res.status(404).json({ success: false, message: 'Work order not found' });
        }

        const request = workOrder.extraMaterialRequests.id(requestId);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Request already processed' });
        }

        request.status = 'rejected';
        request.approvedBy = approvedBy;
        request.approvedAt = new Date();
        request.notes = notes || 'Rejected';

        await workOrder.save();

        res.json({
            success: true,
            message: 'Extra material request rejected',
            data: workOrder
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
