import mongoose from 'mongoose';
import ProcessTracking from '../models/ProcessTrackingModel.js';
import WorkOrder from '../models/WorkOrderModel.js';
import RawMaterialLot from '../models/RawMaterialLotModel.js';
import WIPInventory from '../models/WIPInventoryModel.js';
import FinishedGoods from '../models/FinishedGoodsModel.js';

// Create process tracking for a work order process assignment
export const createProcessTracking = async (req, res) => {
    try {
        const { workOrderId, processAssignmentId } = req.body;

        // Fetch work order and verify process assignment exists
        const workOrder = await WorkOrder.findById(workOrderId)
            .populate('processAssignments.processId', 'name')
            .populate('processAssignments.assignedEmployeeId', 'name');

        if (!workOrder) {
            return res.status(404).json({ success: false, message: 'Work order not found' });
        }

        const assignment = workOrder.processAssignments.id(processAssignmentId);
        if (!assignment) {
            return res.status(404).json({ success: false, message: 'Process assignment not found' });
        }

        // Check if tracking already exists
        const existingTracking = await ProcessTracking.findOne({ processAssignmentId });
        if (existingTracking) {
            return res.status(400).json({ success: false, message: 'Process tracking already exists for this assignment' });
        }

        // Create tracking
        const tracking = await ProcessTracking.create({
            workOrderId: workOrder._id,
            workOrderNumber: workOrder.workOrderNumber,
            processAssignmentId: assignment._id,
            processId: assignment.processId._id || assignment.processId,
            processName: assignment.processName,
            assignedEmployeeId: assignment.assignedEmployeeId._id || assignment.assignedEmployeeId,
            status: assignment.status || 'pending',
            progressPercentage: assignment.progressPercentage || 0,
            logs: [{
                action: 'status-changed',
                description: 'Process tracking initialized',
                details: { status: 'pending' }
            }]
        });

        await tracking.populate([
            { path: 'processId', select: 'name category' },
            { path: 'assignedEmployeeId', select: 'name email' }
        ]);

        res.status(201).json({
            success: true,
            message: 'Process tracking created successfully',
            data: tracking
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Get all process tracking records
export const getAllProcessTracking = async (req, res) => {
    try {
        const { workOrderId, status, assignedEmployeeId } = req.query;
        const filter = {};

        if (workOrderId) filter.workOrderId = workOrderId;
        if (status) filter.status = status;
        if (assignedEmployeeId) filter.assignedEmployeeId = assignedEmployeeId;

        const trackings = await ProcessTracking.find(filter)
            .populate('workOrderId', 'workOrderNumber customerId cableLength')
            .populate('processId', 'name category')
            .populate('assignedEmployeeId', 'name email')
            .populate('inputs.materialId', 'name category')
            .populate('inputs.wipInventoryId', 'itemName specifications')
            .populate('outputs.wipInventoryId', 'itemName specifications')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: trackings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get single process tracking by ID
export const getProcessTrackingById = async (req, res) => {
    try {
        const tracking = await ProcessTracking.findById(req.params.id)
            .populate('workOrderId')
            .populate('processId', 'name category')
            .populate('assignedEmployeeId', 'name email')
            .populate('inputs.materialId', 'name category')
            .populate('inputs.lotId', 'lotNumber purchaseDate')
            .populate('inputs.wipInventoryId', 'itemName specifications quantity remainingQuantity')
            .populate('outputs.wipInventoryId', 'itemName specifications quantity remainingQuantity')
            .populate('inputs.usedBy', 'name')
            .populate('outputs.producedBy', 'name');

        if (!tracking) {
            return res.status(404).json({ success: false, message: 'Process tracking not found' });
        }

        res.json({ success: true, data: tracking });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Add input (consume material or WIP)
export const addInput = async (req, res) => {
    try {
        const { id } = req.params;
        const { sourceType, quantityUsed, usedBy, notes, ...sourceData } = req.body;

        const tracking = await ProcessTracking.findById(id);
        if (!tracking) {
            return res.status(404).json({ success: false, message: 'Process tracking not found' });
        }

        const inputItem = {
            sourceType,
            quantityUsed,
            usedBy,
            notes: notes || '',
            usedAt: new Date()
        };

        if (sourceType === 'raw-material') {
            const { allocatedMaterialId, materialId, materialName, lotId, lotNumber } = sourceData;

            // Verify material is allocated to this work order
            const workOrder = await WorkOrder.findById(tracking.workOrderId);
            const allocatedMat = workOrder.allocatedMaterials.id(allocatedMaterialId);

            if (!allocatedMat) {
                return res.status(404).json({ success: false, message: 'Allocated material not found in work order' });
            }

            // Update work order allocated materials - reduce allocated amount
            const usedWeight = quantityUsed.weight || 0;
            allocatedMat.allocatedWeight = Math.max(0, (allocatedMat.allocatedWeight || 0) - usedWeight);
            allocatedMat.allocatedLength = Math.max(0, (allocatedMat.allocatedLength || 0) - (quantityUsed.length || 0));

            // Mark as consumed if fully used
            if (allocatedMat.allocatedWeight === 0 && allocatedMat.allocatedLength === 0) {
                allocatedMat.isConsumed = true;
            }

            await workOrder.save();

            // Update lot quantities - reduce stock, increase consumed, reduce allocated
            const lot = await RawMaterialLot.findById(lotId);
            if (lot) {
                // Reduce remaining stock (actual inventory depletion)
                lot.remainingQuantity = lot.remainingQuantity || { weight: 0, length: 0 };
                lot.remainingQuantity.weight = Math.max(0, (lot.remainingQuantity.weight || 0) - usedWeight);
                lot.remainingQuantity.length = Math.max(0, (lot.remainingQuantity.length || 0) - (quantityUsed.length || 0));

                // Increase consumed quantity (tracking)
                lot.consumedQuantity = lot.consumedQuantity || { weight: 0, length: 0 };
                lot.consumedQuantity.weight = (lot.consumedQuantity.weight || 0) + usedWeight;
                lot.consumedQuantity.length = (lot.consumedQuantity.length || 0) + (quantityUsed.length || 0);

                // Reduce allocated (moving from allocated to consumed)
                lot.allocatedQuantity = lot.allocatedQuantity || { weight: 0, length: 0 };
                lot.allocatedQuantity.weight = Math.max(0, (lot.allocatedQuantity.weight || 0) - usedWeight);
                lot.allocatedQuantity.length = Math.max(0, (lot.allocatedQuantity.length || 0) - (quantityUsed.length || 0));

                // Check if lot is fully consumed
                if (lot.remainingQuantity.weight === 0 && lot.remainingQuantity.length === 0) {
                    lot.isFullyConsumed = true;
                }

                await lot.save();
            }

            // Update material inventory - reduce total stock
            const RawMaterial = mongoose.model('RawMaterial');
            await RawMaterial.findByIdAndUpdate(
                materialId,
                {
                    $inc: {
                        'inventory.totalWeight': -usedWeight,
                        'inventory.totalLength': -(quantityUsed.length || 0)
                    }
                }
            );

            inputItem.allocatedMaterialId = allocatedMaterialId;
            inputItem.materialId = materialId;
            inputItem.materialName = materialName;
            inputItem.lotId = lotId;
            inputItem.lotNumber = lotNumber;

        } else if (sourceType === 'wip-inventory') {
            const { wipInventoryId, wipItemName } = sourceData;

            // Update WIP inventory
            const wipItem = await WIPInventory.findById(wipInventoryId);
            if (!wipItem) {
                return res.status(404).json({ success: false, message: 'WIP inventory item not found' });
            }

            // Reduce remaining quantity
            wipItem.remainingQuantity.weight = Math.max(0, (wipItem.remainingQuantity.weight || 0) - (quantityUsed.weight || 0));
            wipItem.remainingQuantity.length = Math.max(0, (wipItem.remainingQuantity.length || 0) - (quantityUsed.length || 0));

            // Check if fully consumed
            if (wipItem.remainingQuantity.weight === 0 && wipItem.remainingQuantity.length === 0) {
                wipItem.isFullyConsumed = true;
            }

            await wipItem.save();

            inputItem.wipInventoryId = wipInventoryId;
            inputItem.wipItemName = wipItemName;
        }

        tracking.inputs.push(inputItem);

        // Add log entry
        tracking.logs.push({
            action: 'input-consumed',
            userId: usedBy,
            description: `Consumed ${quantityUsed.weight || 0}${quantityUsed.unit} of ${sourceType === 'raw-material' ? inputItem.materialName : inputItem.wipItemName}`,
            details: { inputItem }
        });

        await tracking.save();

        await tracking.populate([
            { path: 'inputs.materialId', select: 'name category' },
            { path: 'inputs.lotId', select: 'lotNumber' },
            { path: 'inputs.wipInventoryId', select: 'itemName specifications' },
            { path: 'inputs.usedBy', select: 'name' }
        ]);

        res.json({
            success: true,
            message: 'Input added successfully',
            data: tracking
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Add output (produce WIP or finished product)
export const addOutput = async (req, res) => {
    try {
        const { id } = req.params;
        const { outputType, itemName, quantity, specifications, storageLocation, producedBy, notes } = req.body;

        const tracking = await ProcessTracking.findById(id);
        if (!tracking) {
            return res.status(404).json({ success: false, message: 'Process tracking not found' });
        }

        const outputItem = {
            outputType,
            itemName,
            quantity,
            specifications: specifications || '',
            storageLocation: storageLocation || '',
            producedBy,
            notes: notes || '',
            producedAt: new Date()
        };

        // If output is WIP, create WIP inventory item
        if (outputType === 'wip-inventory') {
            console.log('Creating WIP inventory item...');
            console.log('Tracking data:', {
                workOrderId: tracking.workOrderId,
                workOrderNumber: tracking.workOrderNumber,
                processId: tracking.processId,
                processName: tracking.processName
            });
            console.log('Quantity:', quantity);

            const wipItem = await WIPInventory.create({
                itemName,
                workOrderId: tracking.workOrderId,
                workOrderNumber: tracking.workOrderNumber,
                processId: tracking.processId,
                processName: tracking.processName,
                quantity,
                specifications: specifications || '',
                storageLocation: storageLocation || '',
                notes: notes || ''
            });

            console.log('WIP item created successfully:', wipItem._id);
            outputItem.wipInventoryId = wipItem._id;
        }

        // If output is finished product, create finished goods item
        if (outputType === 'finished-product') {
            console.log('Creating finished goods item...');

            // Get work order to extract customer info
            const workOrder = await WorkOrder.findById(tracking.workOrderId)
                .populate('customerId', 'name');

            console.log('Tracking data:', {
                workOrderId: tracking.workOrderId,
                workOrderNumber: tracking.workOrderNumber,
                processId: tracking.processId,
                processName: tracking.processName,
                customerId: workOrder?.customerId?._id,
                customerName: workOrder?.customerId?.name
            });
            console.log('Quantity:', quantity);

            const finishedGoods = await FinishedGoods.create({
                itemName,
                workOrderId: tracking.workOrderId,
                workOrderNumber: tracking.workOrderNumber,
                processId: tracking.processId,
                processName: tracking.processName,
                quantity,
                specifications: specifications || '',
                storageLocation: storageLocation || '',
                notes: notes || '',
                customerId: workOrder?.customerId?._id,
                customerName: workOrder?.customerId?.name,
                deliveryStatus: 'ready'
            });

            console.log('Finished goods item created successfully:', finishedGoods._id);
            outputItem.finishedGoodsId = finishedGoods._id;
        }

        tracking.outputs.push(outputItem);

        // Add log entry
        tracking.logs.push({
            action: 'output-produced',
            userId: producedBy,
            description: `Produced ${quantity.weight || quantity.length || 0}${quantity.unit} of ${itemName}`,
            details: { outputItem }
        });

        await tracking.save();

        await tracking.populate([
            { path: 'outputs.wipInventoryId', select: 'itemName specifications quantity' },
            { path: 'outputs.producedBy', select: 'name' }
        ]);

        res.json({
            success: true,
            message: 'Output added successfully',
            data: tracking
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Update progress
export const updateProgress = async (req, res) => {
    try {
        const { id } = req.params;
        const { progressPercentage, status, userId } = req.body;

        const tracking = await ProcessTracking.findById(id);
        if (!tracking) {
            return res.status(404).json({ success: false, message: 'Process tracking not found' });
        }

        const updates = {};
        if (progressPercentage !== undefined) {
            updates.progressPercentage = Math.max(0, Math.min(100, progressPercentage));
        }

        if (status !== undefined) {
            updates.status = status;

            if (status === 'in-progress' && !tracking.startedAt) {
                updates.startedAt = new Date();
            }

            if (status === 'completed' && !tracking.completedAt) {
                updates.completedAt = new Date();
                updates.progressPercentage = 100;
            }

            // Add log for status change
            tracking.logs.push({
                action: 'status-changed',
                userId,
                description: `Status changed to ${status}`,
                details: { oldStatus: tracking.status, newStatus: status }
            });
        }

        if (progressPercentage !== undefined && progressPercentage !== tracking.progressPercentage) {
            tracking.logs.push({
                action: 'progress-updated',
                userId,
                description: `Progress updated to ${progressPercentage}%`,
                details: { oldProgress: tracking.progressPercentage, newProgress: progressPercentage }
            });
        }

        Object.assign(tracking, updates);
        await tracking.save();

        // Sync back to work order's process assignment
        const workOrder = await WorkOrder.findById(tracking.workOrderId);
        if (workOrder) {
            const processAssignment = workOrder.processAssignments.id(tracking.processAssignmentId);
            if (processAssignment) {
                if (status !== undefined) {
                    processAssignment.status = status;
                }
                if (progressPercentage !== undefined) {
                    processAssignment.progressPercentage = updates.progressPercentage;
                }
                await workOrder.save();
                console.log('Synced progress to work order process assignment:', {
                    workOrderId: workOrder._id,
                    processAssignmentId: processAssignment._id,
                    status: processAssignment.status,
                    progressPercentage: processAssignment.progressPercentage
                });
            }
        }

        res.json({
            success: true,
            message: 'Progress updated successfully',
            data: tracking
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Delete process tracking
export const deleteProcessTracking = async (req, res) => {
    try {
        const tracking = await ProcessTracking.findByIdAndDelete(req.params.id);
        if (!tracking) {
            return res.status(404).json({ success: false, message: 'Process tracking not found' });
        }

        res.json({ success: true, message: 'Process tracking deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Submit/upload report after process completion
export const submitReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { reportUrl, reportNotes, userId } = req.body;

        const tracking = await ProcessTracking.findById(id);
        if (!tracking) {
            return res.status(404).json({ success: false, message: 'Process tracking not found' });
        }

        if (tracking.status !== 'completed') {
            return res.status(400).json({ success: false, message: 'Cannot submit report for incomplete process' });
        }

        tracking.reportUploaded = true;
        tracking.reportUrl = reportUrl || '';
        tracking.reportUploadedAt = new Date();
        tracking.reportUploadedBy = userId;

        // Add log entry
        tracking.logs.push({
            action: 'note-added',
            userId,
            description: 'Process report submitted',
            details: { reportUrl, reportNotes }
        });

        await tracking.save();

        // Update work order process assignment
        const workOrder = await WorkOrder.findById(tracking.workOrderId);
        if (workOrder) {
            const processAssignment = workOrder.processAssignments.id(tracking.processAssignmentId);
            if (processAssignment) {
                processAssignment.reportUploaded = true;
                await workOrder.save();
            }
        }

        res.json({
            success: true,
            message: 'Report submitted successfully',
            data: tracking
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Approve/receive report (admin action)
export const approveReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        const tracking = await ProcessTracking.findById(id);
        if (!tracking) {
            return res.status(404).json({ success: false, message: 'Process tracking not found' });
        }

        if (!tracking.reportUploaded) {
            return res.status(400).json({ success: false, message: 'No report has been uploaded yet' });
        }

        tracking.reportReceived = true;
        tracking.reportReceivedAt = new Date();
        tracking.reportReceivedBy = userId;

        // Add log entry
        tracking.logs.push({
            action: 'note-added',
            userId,
            description: 'Process report approved',
            details: { reportReceived: true }
        });

        await tracking.save();

        res.json({
            success: true,
            message: 'Report approved successfully',
            data: tracking
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Check if process can start based on dependencies
export const checkProcessDependencies = async (req, res) => {
    try {
        const { workOrderId, processSequence } = req.body;

        if (processSequence === 0 || processSequence === 1) {
            // First process can always start
            return res.json({
                success: true,
                canStart: true,
                message: 'First process can start'
            });
        }

        // Get work order with all process trackings
        const workOrder = await WorkOrder.findById(workOrderId)
            .populate('processAssignments.processId');

        if (!workOrder) {
            return res.status(404).json({ success: false, message: 'Work order not found' });
        }

        // Find previous process assignment
        const previousProcess = workOrder.processAssignments.find(
            pa => pa.sequence === processSequence - 1
        );

        if (!previousProcess) {
            return res.json({
                success: true,
                canStart: true,
                message: 'No previous process found'
            });
        }

        // Get previous process tracking
        const previousTracking = await ProcessTracking.findOne({
            processAssignmentId: previousProcess._id
        });

        if (!previousTracking) {
            return res.json({
                success: true,
                canStart: false,
                blockReason: 'Previous process tracking not initialized',
                message: `Waiting for ${previousProcess.processName} to be initialized`,
                previousProcessName: previousProcess.processName
            });
        }

        // Check if previous process is completed
        if (previousTracking.status !== 'completed') {
            return res.json({
                success: true,
                canStart: false,
                blockReason: 'Previous process not completed',
                message: `Waiting for ${previousTracking.processName} to complete`,
                previousProcessName: previousTracking.processName,
                previousProcessStatus: previousTracking.status,
                previousProcessProgress: previousTracking.progressPercentage
            });
        }

        // Check if report is required and uploaded
        const reportRequired = previousProcess.requiresReport || previousProcess.addReportAfter;
        if (reportRequired && !previousTracking.reportUploaded) {
            return res.json({
                success: true,
                canStart: false,
                blockReason: 'Waiting for previous process report',
                message: `Waiting for report from ${previousTracking.processName}`,
                previousProcessName: previousTracking.processName,
                reportRequired: true,
                reportUploaded: false
            });
        }

        // All checks passed
        return res.json({
            success: true,
            canStart: true,
            message: 'Process can start',
            previousProcessName: previousTracking.processName,
            previousProcessCompleted: true,
            reportStatus: previousTracking.reportUploaded ? 'uploaded' : 'not-required'
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
