import User from '../models/UserModel.js';
import WorkOrder from '../models/WorkOrderModel.js';
import ProcessInWorkOrder from '../models/ProcessInWorkOrderModel.js';
import WIPInventory from '../models/WIPInventoryModel.js';

// Simple phone-based login for employees
export const employeeLogin = async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({ success: false, message: 'Phone number is required' });
        }

        // Find employee by phone number
        const employee = await User.findOne({
            phoneNumber: phoneNumber,
            isActive: true
        }).select('name role phoneNumber email');

        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee not found with this phone number' });
        }

        // Return employee data (simple auth, no JWT for now)
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                employeeId: employee._id,
                name: employee.name,
                email: employee.email,
                phoneNumber: employee.phoneNumber,
                role: employee.role
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get all work orders and processes assigned to an employee
export const getEmployeeWorkOrders = async (req, res) => {
    try {
        const { employeeId } = req.params;

        // Find all processes assigned to this employee
        const myProcesses = await ProcessInWorkOrder.find({
            assignedEmployeeId: employeeId
        })
            .populate('processId', 'name category')
            .populate('workOrderId', 'workOrderNumber status targetQuantity customerId quoteId')
            .sort({ createdAt: -1 });

        // Group processes by work order
        const workOrderMap = new Map();

        for (const process of myProcesses) {
            const woId = process.workOrderId._id.toString();

            if (!workOrderMap.has(woId)) {
                // Populate customer and quote data
                await process.workOrderId.populate([
                    { path: 'customerId', select: 'companyName' },
                    { path: 'quoteId', select: 'quoteNumber' }
                ]);

                workOrderMap.set(woId, {
                    workOrder: process.workOrderId,
                    processes: []
                });
            }

            workOrderMap.get(woId).processes.push(process);
        }

        // Convert map to array
        const workOrdersWithProcesses = Array.from(workOrderMap.values()).map(item => ({
            ...item.workOrder.toObject(),
            myProcesses: item.processes
        }));

        res.json({ success: true, data: workOrdersWithProcesses });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get WIP inventory for a specific work order
export const getWorkOrderWIP = async (req, res) => {
    try {
        const { workOrderId } = req.params;

        const wipItems = await WIPInventory.find({
            workOrderId,
            isActive: true
        })
            .populate('processId', 'name category')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: wipItems });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get single process details for employee
export const getProcessDetails = async (req, res) => {
    try {
        const { processId } = req.params;
        const { employeeId } = req.query;

        const process = await ProcessInWorkOrder.findById(processId)
            .populate('processId', 'name category')
            .populate('workOrderId', 'workOrderNumber status targetQuantity')
            .populate('assignedEmployeeId', 'name')
            .populate('inputs.materialId', 'name category')
            .populate('inputs.lotId', 'lotNumber')
            .populate('inputs.wipInventoryId', 'itemName');

        if (!process) {
            return res.status(404).json({ success: false, message: 'Process not found' });
        }

        // Verify employee is assigned to this process
        if (employeeId && process.assignedEmployeeId._id.toString() !== employeeId) {
            return res.status(403).json({ success: false, message: 'Not authorized to view this process' });
        }

        res.json({ success: true, data: process });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update process status by employee
export const updateProcessStatus = async (req, res) => {
    try {
        const { processId } = req.params;
        const { status, progressPercentage, notes, employeeId, employeeName } = req.body;

        const process = await ProcessInWorkOrder.findById(processId);
        if (!process) {
            return res.status(404).json({ success: false, message: 'Process not found' });
        }

        // Verify employee is assigned to this process
        if (process.assignedEmployeeId.toString() !== employeeId) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this process' });
        }

        // Check if can start
        if (!process.canStart && status === 'in-progress') {
            return res.status(400).json({
                success: false,
                message: process.blockReason || 'Cannot start this process yet'
            });
        }

        const oldStatus = process.status;

        // Update status
        process.status = status || process.status;
        if (progressPercentage !== undefined) {
            process.progressPercentage = progressPercentage;
        }

        if (status === 'in-progress' && !process.startedAt) {
            process.startedAt = new Date();
        }

        if (status === 'completed' && !process.completedAt) {
            process.completedAt = new Date();
            process.progressPercentage = 100;
        }

        if (notes) {
            process.notes = notes;
        }

        // Add log
        if (oldStatus !== status) {
            process.logs.push({
                timestamp: new Date(),
                action: 'status-changed',
                userId: employeeId,
                userName: employeeName || '',
                description: `Status changed from ${oldStatus} to ${status}`,
                details: { from: oldStatus, to: status, progressPercentage: process.progressPercentage }
            });
        } else {
            process.logs.push({
                timestamp: new Date(),
                action: 'progress-updated',
                userId: employeeId,
                userName: employeeName || '',
                description: `Progress updated to ${process.progressPercentage}%`,
                details: { progressPercentage: process.progressPercentage }
            });
        }

        await process.save();

        res.json({
            success: true,
            message: 'Process status updated successfully',
            data: process
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Upload report (placeholder for now)
export const uploadReport = async (req, res) => {
    try {
        const { processId } = req.params;
        const { reportUrl, employeeId, employeeName } = req.body;

        const process = await ProcessInWorkOrder.findById(processId);
        if (!process) {
            return res.status(404).json({ success: false, message: 'Process not found' });
        }

        if (!process.addReportAfter) {
            return res.status(400).json({ success: false, message: 'This process does not require a report' });
        }

        process.reportUploaded = true;
        process.reportUrl = reportUrl || 'pending-upload';
        process.reportUploadedAt = new Date();
        process.reportUploadedBy = employeeId;

        process.logs.push({
            timestamp: new Date(),
            action: 'note-added',
            userId: employeeId,
            userName: employeeName || '',
            description: 'Report uploaded, awaiting admin review',
            details: { reportUrl }
        });

        await process.save();

        res.json({
            success: true,
            message: 'Report uploaded successfully. Waiting for admin approval.',
            data: process
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
