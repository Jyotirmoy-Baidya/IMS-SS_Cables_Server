import express from 'express';
import ProcessInWorkOrder from '../models/ProcessInWorkOrderModel.js';
import WorkOrder from '../models/WorkOrderModel.js';
import { authenticate, isEmployee } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all processes assigned to logged-in employee
router.get('/processInWorkOrder', authenticate, async (req, res) => {
    try {
        const employeeId = req.user._id;

        const processes = await ProcessInWorkOrder.find({
            assignedEmployeeId: employeeId
        })
            .populate('processId', 'name category')
            .populate('workOrderId', 'workOrderNumber status targetQuantity')
            .populate('inputs.materialId', 'name category')
            .populate('inputs.lotId', 'lotNumber')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: processes });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get single process by ID (only if assigned to logged-in employee)
router.get('/processInWorkOrderById/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const employeeId = req.user._id;

        const process = await ProcessInWorkOrder.findOne({
            _id: id,
            assignedEmployeeId: employeeId
        })
            .populate('processId', 'name category')
            .populate('workOrderId', 'workOrderNumber status targetQuantity extraMaterialRequests')
            .populate('inputs.materialId', 'name category')
            .populate('inputs.lotId', 'lotNumber')
            .populate('inputs.usedBy', 'name');

        if (!process) {
            return res.status(404).json({ success: false, message: 'Process not found or you are not assigned to it' });
        }

        res.json({ success: true, data: process });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Update process progress (uses req.user)
router.post('/updateProcessInWorkOrderProgress/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { progressPercentage, producedOutputDetails, status } = req.body;

        const process = await ProcessInWorkOrder.findById(id);
        if (!process) {
            return res.status(404).json({ success: false, message: 'Process not found' });
        }

        // Verify employee is assigned to this process
        if (process.assignedEmployeeId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this process' });
        }

        if (producedOutputDetails) {
            process.producedOutputDetails = {
                ...process.producedOutputDetails,
                ...producedOutputDetails
            };

            // Update WIP Inventory or Finished Good quantity if item exists
            const wipId = process.producedOutputDetails.wipInventoryItemId;
            const finishedGoodId = process.producedOutputDetails.finishedGoodId;
            const producedQty = producedOutputDetails.producedQuantity;

            if (wipId && producedQty !== undefined) {
                const WIPInventory = (await import('../models/WIPInventoryModel.js')).default;
                await WIPInventory.findByIdAndUpdate(wipId, {
                    $set: {
                        'quantity.length': producedQty,
                        'quantity.weight': producedOutputDetails.producedWeight || 0
                    }
                });
            }

            if (finishedGoodId && producedQty !== undefined) {
                const FinishedGood = (await import('../models/FinishedGoodsModel.js')).default;
                await FinishedGood.findByIdAndUpdate(finishedGoodId, {
                    $set: {
                        'quantity.produced': producedQty
                    }
                });
            }
        }

        if (status) {
            const oldStatus = process.status;
            process.status = status;

            if (oldStatus !== status) {
                process.logs.push({
                    timestamp: new Date(),
                    action: 'status-changed',
                    userId: req.user._id,
                    userName: req.user.name || '',
                    details: { from: oldStatus, to: status },
                    description: `Status changed from ${oldStatus} to ${status}`
                });
            }

            if (status === 'in-progress' && !process.startedAt) {
                process.startedAt = new Date();
            }

            if (status === 'completed' && !process.completedAt) {
                process.completedAt = new Date();
            }
        }

        // Add progress update log
        process.logs.push({
            timestamp: new Date(),
            action: 'progress-updated',
            userId: req.user._id,
            userName: req.user.name || '',
            details: { progressPercentage, producedOutputDetails },
            description: `Progress updated to ${progressPercentage}%`
        });

        await process.save();

        res.json({ success: true, message: 'Progress updated successfully', data: process });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// Update process status only (uses req.user)
router.patch('/updateProcessStatus/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ success: false, message: 'Status is required' });
        }

        const process = await ProcessInWorkOrder.findById(id);
        if (!process) {
            return res.status(404).json({ success: false, message: 'Process not found' });
        }

        // Verify employee is assigned to this process
        if (process.assignedEmployeeId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this process' });
        }

        const oldStatus = process.status;
        process.status = status;

        // Set timestamps based on status
        if (status === 'in-progress' && !process.startedAt) {
            process.startedAt = new Date();
        }

        if (status === 'completed' && !process.completedAt) {
            process.completedAt = new Date();
        }

        // Add status change log
        if (oldStatus !== status) {
            process.logs.push({
                timestamp: new Date(),
                action: 'status-changed',
                userId: req.user._id,
                userName: req.user.name || '',
                details: { from: oldStatus, to: status },
                description: `Status changed from ${oldStatus} to ${status}`
            });
        }

        await process.save();

        res.json({ success: true, message: 'Process status updated successfully', data: process });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// Check dependencies for a process
router.post('/checkDependencies', authenticate, async (req, res) => {
    try {
        const { processId, workOrderId, processSequence } = req.body;

        if (processId) {
            const currentProcess = await ProcessInWorkOrder.findById(processId);
            if (!currentProcess) {
                return res.status(404).json({ success: false, message: 'Process not found' });
            }

            const allProcesses = await ProcessInWorkOrder.find({
                workOrderId: currentProcess.workOrderId
            }).sort({ createdAt: 1 });

            const currentIndex = allProcesses.findIndex(p => p._id.toString() === processId);

            if (currentIndex === 0) {
                return res.json({
                    success: true,
                    data: {
                        canStart: true,
                        message: 'This is the first process, no dependencies',
                        requiresReport: false
                    }
                });
            }

            const previousProcess = allProcesses[currentIndex - 1];

            if (previousProcess.status !== 'completed') {
                return res.json({
                    success: true,
                    data: {
                        canStart: false,
                        message: `Previous process "${previousProcess.processName}" not yet completed`,
                        blockReason: 'Previous process incomplete',
                        requiresReport: false,
                        previousProcessName: previousProcess.processName
                    }
                });
            }

            if (previousProcess.addReportAfter && !previousProcess.reportReceived) {
                return res.json({
                    success: true,
                    data: {
                        canStart: false,
                        message: `Report for previous process "${previousProcess.processName}" not yet approved`,
                        blockReason: 'Report not approved',
                        requiresReport: true,
                        previousProcessName: previousProcess.processName
                    }
                });
            }

            return res.json({
                success: true,
                data: {
                    canStart: true,
                    message: 'All dependencies satisfied',
                    requiresReport: false
                }
            });
        }

        res.status(400).json({ success: false, message: 'processId is required' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get allocated materials for work order of a process
router.get('/workOrderMaterials/:processInWorkOrderId', authenticate, async (req, res) => {
    try {
        const { processInWorkOrderId } = req.params;

        const process = await ProcessInWorkOrder.findById(processInWorkOrderId);
        if (!process) {
            return res.status(404).json({ success: false, message: 'Process not found' });
        }

        // Verify employee is assigned to this process
        if (process.assignedEmployeeId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to view this work order' });
        }

        const workOrder = await WorkOrder.findById(process.workOrderId)
            .populate('allocatedMaterials.materialId', 'name category')
            .populate('allocatedMaterials.materialLotId', 'lotNumber remainingQuantity purchaseDate');

        if (!workOrder) {
            return res.status(404).json({ success: false, message: 'Work order not found' });
        }

        res.json({
            success: true,
            data: {
                workOrderNumber: workOrder.workOrderNumber,
                allocatedMaterials: workOrder.allocatedMaterials
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Add input to process
router.post('/addInput/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const inputData = req.body;

        const process = await ProcessInWorkOrder.findById(id);
        if (!process) {
            return res.status(404).json({ success: false, message: 'Process not found' });
        }

        // Verify employee is assigned to this process
        if (process.assignedEmployeeId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this process' });
        }

        // Add user info to input data
        inputData.usedBy = req.user._id;
        inputData.usedAt = new Date();

        process.inputs.push(inputData);

        // Add log
        process.logs.push({
            timestamp: new Date(),
            action: 'input-consumed',
            userId: req.user._id,
            userName: req.user.name || '',
            details: inputData,
            description: `Input added: ${inputData.materialName || inputData.wipItemName || 'Material'}`
        });

        await process.save();

        // Update work order allocated materials if this is a raw material consumption
        if (inputData.sourceType === 'raw-material' && inputData.allocatedMaterialId) {
            const workOrder = await WorkOrder.findById(process.workOrderId);
            if (workOrder) {
                const allocatedMaterial = workOrder.allocatedMaterials.id(inputData.allocatedMaterialId);
                if (allocatedMaterial) {
                    // Update consumed quantity
                    if (!allocatedMaterial.consumedQuantity) {
                        allocatedMaterial.consumedQuantity = { weight: 0, length: 0 };
                    }
                    allocatedMaterial.consumedQuantity.weight += inputData.quantityUsed?.weight || 0;
                    allocatedMaterial.consumedQuantity.length += inputData.quantityUsed?.length || 0;

                    // Reduce allocated weight
                    allocatedMaterial.allocatedWeight -= inputData.quantityUsed?.weight || 0;
                    if (allocatedMaterial.allocatedWeight < 0) {
                        allocatedMaterial.allocatedWeight = 0;
                    }

                    // Mark as consumed if all allocated material is used
                    if (allocatedMaterial.allocatedWeight <= 0.01) {
                        allocatedMaterial.isConsumed = true;
                    }

                    await workOrder.save();
                }
            }
        }

        res.json({ success: true, message: 'Input added successfully', data: process });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// Create output product (WIP or Finished Good)
router.post('/create-output-product/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { itemName, specifications, storageLocation } = req.body;

        const process = await ProcessInWorkOrder.findById(id);
        if (!process) {
            return res.status(404).json({ success: false, message: 'Process not found' });
        }

        // Verify employee is assigned to this process
        if (process.assignedEmployeeId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this process' });
        }

        const outputType = process.output?.outputType || 'none';

        if (outputType === 'none') {
            return res.status(400).json({ success: false, message: 'This process does not produce output' });
        }

        let productId = null;

        if (outputType === 'intermediate') {
            const WIPInventory = (await import('../models/WIPInventoryModel.js')).default;

            // Create WIP Inventory
            const wipItem = await WIPInventory.create({
                itemName: itemName,
                workOrderId: process.workOrderId,
                workOrderNumber: process.workOrderNumber,
                processId: process.processId,
                processName: process.processName,
                quantity: {
                    weight: 0,
                    length: 0,
                    unit: process.output?.unit || 'm'
                },
                specifications: specifications || '',
                storageLocation: storageLocation || '',
                notes: `Created from process: ${process.processName}`,
                isActive: true
            });

            productId = wipItem._id;

            // Update process with WIP inventory ID
            if (!process.producedOutputDetails) {
                process.producedOutputDetails = {};
            }
            process.producedOutputDetails.wipInventoryItemId = productId;

        } else if (outputType === 'final') {
            const FinishedGood = (await import('../models/FinishedGoodsModel.js')).default;

            // Create Finished Good
            const finishedGood = await FinishedGood.create({
                productName: itemName,
                workOrderId: process.workOrderId,
                workOrderNumber: process.workOrderNumber,
                specifications: specifications || '',
                quantity: {
                    produced: 0,
                    unit: process.output?.unit || 'm'
                },
                storageLocation: storageLocation || '',
                status: 'in-stock',
                notes: `Created from process: ${process.processName}`
            });

            productId = finishedGood._id;

            // Update process with finished good ID
            if (!process.producedOutputDetails) {
                process.producedOutputDetails = {};
            }
            process.producedOutputDetails.finishedGoodId = productId;
        }

        // Add log
        process.logs.push({
            timestamp: new Date(),
            action: 'output-created',
            userId: req.user._id,
            userName: req.user.name || '',
            details: { itemName, specifications, storageLocation, outputType },
            description: `Created ${outputType === 'intermediate' ? 'WIP Inventory' : 'Finished Good'}: ${itemName}`
        });

        await process.save();

        res.json({
            success: true,
            message: `${outputType === 'intermediate' ? 'WIP Inventory' : 'Finished Good'} created successfully`,
            data: {
                process,
                productId,
                outputType
            }
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

export default router;
