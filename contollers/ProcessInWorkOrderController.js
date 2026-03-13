import ProcessInWorkOrder from '../models/ProcessInWorkOrderModel.js';
import WorkOrder from '../models/WorkOrderModel.js';

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
