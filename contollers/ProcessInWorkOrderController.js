import ProcessInWorkOrder from '../models/ProcessInWorkOrderModel.js';
import WorkOrder from '../models/WorkOrderModel.js';
import WIPInventory from '../models/WIPInventoryModel.js';
import FinishedGoodsModel from '../models/FinishedGoodsModel.js';

// Get all processes in work order
export const getAllProcessesInWorkOrder = async (req, res) => {
    try {
        const { workOrderId, status, assignedEmployeeId } = req.query;
        const filter = {};

        if (workOrderId) filter.workOrderId = workOrderId;
        if (status) filter.status = status;
        if (assignedEmployeeId) filter.assignedEmployeeId = assignedEmployeeId;

        const processes = await ProcessInWorkOrder.find(filter)
            .populate('workOrderId', 'workOrderNumber status')
            .populate('processId', 'name processType')
            .populate('assignedEmployeeId', 'name phoneNumbers')
            .populate('reportUploadedBy', 'name')
            .populate('reportReceivedBy', 'name')
            .sort({ sequence: 1, createdAt: 1 });

        res.json({ success: true, data: processes });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get single process in work order by ID
export const getProcessInWorkOrderById = async (req, res) => {
    try {
        const process = await ProcessInWorkOrder.findById(req.params.id)
            .populate('workOrderId', 'workOrderNumber status')
            .populate('processId', 'name processType')
            .populate('assignedEmployeeId', 'name phoneNumbers email')
            .populate('reportUploadedBy', 'name')
            .populate('reportReceivedBy', 'name')
            .populate('inputs.usedBy', 'name');

        if (!process) {
            return res.status(404).json({ success: false, message: 'Process not found' });
        }

        res.json({ success: true, data: process });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update process in work order
export const updateProcessInWorkOrder = async (req, res) => {
    try {
        const process = await ProcessInWorkOrder.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        )
            .populate('workOrderId', 'workOrderNumber status')
            .populate('processId', 'name processType')
            .populate('assignedEmployeeId', 'name phoneNumbers');

        if (!process) {
            return res.status(404).json({ success: false, message: 'Process not found' });
        }

        res.json({ success: true, message: 'Process updated successfully', data: process });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Add input to process
export const addInput = async (req, res) => {
    try {
        const { id } = req.params;
        const inputData = req.body;

        const process = await ProcessInWorkOrder.findById(id);
        if (!process) {
            return res.status(404).json({ success: false, message: 'Process not found' });
        }

        process.inputs.push({
            ...inputData,
            usedAt: new Date()
        });

        // Add activity log
        process.logs.push({
            timestamp: new Date(),
            action: 'input-consumed',
            userId: inputData.usedBy,
            details: inputData,
            description: `Consumed ${inputData.quantityUsed?.weight || 0} ${inputData.quantityUsed?.unit || 'kg'} of ${inputData.materialName || inputData.wipItemName || 'material'}`
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
};

// Update progress
export const updateProgress = async (req, res) => {
    try {
        const { id } = req.params;
        const { progressPercentage, producedOutputDetails, status, userId, userName } = req.body;

        const process = await ProcessInWorkOrder.findById(id);
        if (!process) {
            return res.status(404).json({ success: false, message: 'Process not found' });
        }

        console.log(producedOutputDetails, "ss");

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
                // Update WIP Inventory quantity
                await WIPInventory.findByIdAndUpdate(wipId, {
                    $set: {
                        'quantity.length': producedQty,
                        'quantity.weight': producedOutputDetails.producedWeight || 0
                    }
                });
            }

            if (finishedGoodId && producedQty !== undefined) {
                // Update Finished Good quantity
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
                    userId: userId,
                    userName: userName || '',
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
            userId: userId,
            userName: userName || '',
            details: { progressPercentage, producedOutputDetails },
            description: `Progress updated to ${progressPercentage}%`
        });

        await process.save();

        res.json({ success: true, message: 'Progress updated successfully', data: process });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Submit report
export const submitReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { reportUrl, reportUploadedBy } = req.body;

        const process = await ProcessInWorkOrder.findById(id);
        if (!process) {
            return res.status(404).json({ success: false, message: 'Process not found' });
        }

        process.reportUploaded = true;
        process.reportUrl = reportUrl;
        process.reportUploadedAt = new Date();
        process.reportUploadedBy = reportUploadedBy;

        await process.save();

        res.json({ success: true, message: 'Report submitted successfully', data: process });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Receive/approve report
export const receiveReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { reportReceivedBy } = req.body;

        const process = await ProcessInWorkOrder.findById(id);
        if (!process) {
            return res.status(404).json({ success: false, message: 'Process not found' });
        }

        if (!process.reportUploaded) {
            return res.status(400).json({ success: false, message: 'No report has been uploaded yet' });
        }

        process.reportReceived = true;
        process.reportReceivedAt = new Date();
        process.reportReceivedBy = reportReceivedBy;

        await process.save();

        res.json({ success: true, message: 'Report received successfully', data: process });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Check process dependencies
export const checkDependencies = async (req, res) => {
    try {
        const { workOrderId, processSequence, processId } = req.body;

        // If processId is provided, find the process and get its sequence
        let currentProcessSequence = processSequence;

        if (processId) {
            const currentProcess = await ProcessInWorkOrder.findById(processId);
            if (!currentProcess) {
                return res.status(404).json({ success: false, message: 'Process not found' });
            }

            // Find all processes for this work order to determine sequence
            const allProcesses = await ProcessInWorkOrder.find({ workOrderId })
                .sort({ createdAt: 1 });

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

            // Get previous process
            const previousProcess = allProcesses[currentIndex - 1];

            // Check if previous process is completed
            if (previousProcess.status !== 'completed') {
                return res.json({
                    success: true,
                    data: {
                        canStart: false,
                        message: `Previous process "${previousProcess.processName}" must be completed first`,
                        blockReason: 'Previous process not completed',
                        requiresReport: false,
                        previousProcessName: previousProcess.processName
                    }
                });
            }

            // Check if previous process requires report and if it's received
            if (previousProcess.addReportAfter) {
                if (!previousProcess.reportUploaded) {
                    return res.json({
                        success: true,
                        data: {
                            canStart: false,
                            message: `Report required for previous process "${previousProcess.processName}"`,
                            blockReason: 'Report not uploaded',
                            requiresReport: true,
                            previousProcessName: previousProcess.processName
                        }
                    });
                }

                if (!previousProcess.reportReceived) {
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

        // Original sequence-based logic
        if (currentProcessSequence === 0 || currentProcessSequence === undefined) {
            return res.json({
                success: true,
                data: {
                    canStart: true,
                    message: 'This is the first process, no dependencies',
                    requiresReport: false
                }
            });
        }

        // Find work order
        const workOrder = await WorkOrder.findById(workOrderId)
            .populate('processInWorkOrder.processId');

        if (!workOrder) {
            return res.status(404).json({ success: false, message: 'Work order not found' });
        }

        // Find previous process
        const previousProcessInWO = workOrder.processInWorkOrder
            .sort((a, b) => a.sequence - b.sequence)
            .find(pwo => pwo.sequence === currentProcessSequence - 1);

        if (!previousProcessInWO) {
            return res.json({
                success: true,
                data: {
                    canStart: true,
                    message: 'No previous process found',
                    requiresReport: false
                }
            });
        }

        const previousProcess = previousProcessInWO.processId;

        // Check if previous process is completed
        if (previousProcess.status !== 'completed') {
            return res.json({
                success: true,
                data: {
                    canStart: false,
                    message: `Previous process "${previousProcess.processName}" must be completed first`,
                    blockReason: 'Previous process not completed',
                    requiresReport: false,
                    previousProcessName: previousProcess.processName
                }
            });
        }

        // Check if previous process requires report and if it's received
        if (previousProcess.addReportAfter) {
            if (!previousProcess.reportUploaded) {
                return res.json({
                    success: true,
                    data: {
                        canStart: false,
                        message: `Report required for previous process "${previousProcess.processName}"`,
                        blockReason: 'Report not uploaded',
                        requiresReport: true,
                        previousProcessName: previousProcess.processName
                    }
                });
            }

            if (!previousProcess.reportReceived) {
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
        }

        return res.json({
            success: true,
            data: {
                canStart: true,
                message: 'All dependencies satisfied',
                requiresReport: false
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Create output product (WIP or Finished Good)
export const createOutputProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { itemName, specifications, storageLocation, quantity } = req.body;

        const process = await ProcessInWorkOrder.findById(id);
        if (!process) {
            return res.status(404).json({ success: false, message: 'Process not found' });
        }

        const outputType = process.output?.outputType || 'none';

        if (outputType === 'none') {
            return res.status(400).json({ success: false, message: 'This process does not produce output' });
        }

        let productId = null;

        if (outputType === 'intermediate') {
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
            // Create Finished Good
            const finishedGood = await FinishedGoodsModel.create({
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
};

// Update process status only
export const updateProcessStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, userId, userName } = req.body;

        if (!status) {
            return res.status(400).json({ success: false, message: 'Status is required' });
        }

        const process = await ProcessInWorkOrder.findById(id);
        if (!process) {
            return res.status(404).json({ success: false, message: 'Process not found' });
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
                userId: userId,
                userName: userName || '',
                details: { from: oldStatus, to: status },
                description: `Status changed from ${oldStatus} to ${status}`
            });
        }

        await process.save();

        res.json({ success: true, message: 'Process status updated successfully', data: process });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
