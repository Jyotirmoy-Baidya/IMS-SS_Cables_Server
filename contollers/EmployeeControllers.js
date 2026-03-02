import User from '../models/UserModel.js';
import WorkOrder from '../models/WorkOrderModel.js';
import ProcessTracking from '../models/ProcessTrackingModel.js';
import WIPInventory from '../models/WIPInventoryModel.js';

// Simple phone-based login for employees
export const employeeLogin = async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({ success: false, message: 'Phone number is required' });
        }
        console.log(phoneNumber)
        // Find employee by phone number
        const employee = await User.findOne({
            phoneNumbers: {
                $elemMatch: {
                    number: phoneNumber
                }
            },
            isActive: true
        }).select('name role phoneNumbers');

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
                phoneNumbers: employee.phoneNumbers,
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

        // Find all work orders where this employee is assigned to at least one process
        const workOrders = await WorkOrder.find({
            'processAssignments.assignedEmployeeId': employeeId
        })
            .populate('customerId', 'companyName')
            .populate('quoteId', 'quoteNumber')
            .populate('processAssignments.processId', 'name category')
            .sort({ createdAt: -1 });

        // For each work order, get process tracking data
        const workOrdersWithTracking = await Promise.all(
            workOrders.map(async (wo) => {
                const trackings = await ProcessTracking.find({
                    workOrderId: wo._id
                }).populate('assignedEmployeeId', 'name');

                // Map trackings by processAssignmentId
                const trackingMap = {};
                trackings.forEach(t => {
                    trackingMap[t.processAssignmentId.toString()] = t;
                });

                // Filter processes assigned to this employee and add tracking info
                const myProcesses = wo.processAssignments
                    .filter(pa => pa.assignedEmployeeId.toString() === employeeId)
                    .map(pa => {
                        const tracking = trackingMap[pa._id.toString()];

                        // Find previous process in the sequence
                        const processIndex = wo.processAssignments.findIndex(p => p._id.equals(pa._id));
                        const previousProcess = processIndex > 0 ? wo.processAssignments[processIndex - 1] : null;
                        const previousProcessTracking = previousProcess ? trackingMap[previousProcess._id.toString()] : null;

                        // Check if can start based on previous process
                        let canStart = true;
                        let blockReason = '';

                        if (previousProcess) {
                            if (previousProcessTracking) {
                                // If previous process is not completed, can't start
                                if (previousProcessTracking.status !== 'completed') {
                                    canStart = false;
                                    blockReason = `Previous process (${previousProcess.processName}) not completed yet. Current: ${previousProcessTracking.progressPercentage}%`;
                                }
                                // If previous process requires report and not received, can't start
                                else if (previousProcessTracking.addReportAfter && !previousProcessTracking.reportReceived) {
                                    canStart = false;
                                    blockReason = `Waiting for report from previous process (${previousProcess.processName}) to be received`;
                                }
                            } else {
                                // Previous process tracking not created
                                canStart = false;
                                blockReason = `Previous process (${previousProcess.processName}) not started yet`;
                            }
                        }

                        return {
                            ...pa.toObject(),
                            tracking: tracking || null,
                            previousProcess: previousProcess ? {
                                processName: previousProcess.processName,
                                status: previousProcessTracking?.status || 'pending',
                                progressPercentage: previousProcessTracking?.progressPercentage || 0,
                                requiresReport: previousProcessTracking?.addReportAfter || false,
                                reportReceived: previousProcessTracking?.reportReceived || false
                            } : null,
                            canStart,
                            blockReason
                        };
                    });

                return {
                    ...wo.toObject(),
                    myProcesses,
                    allProcessAssignments: wo.processAssignments
                };
            })
        );

        res.json({ success: true, data: workOrdersWithTracking });
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

// Update process status by employee
export const updateProcessStatus = async (req, res) => {
    try {
        const { trackingId } = req.params;
        const { status, progressPercentage, notes, employeeId } = req.body;

        const tracking = await ProcessTracking.findById(trackingId);
        if (!tracking) {
            return res.status(404).json({ success: false, message: 'Process tracking not found' });
        }

        // Verify employee is assigned to this process
        if (tracking.assignedEmployeeId.toString() !== employeeId) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this process' });
        }

        // Check if can start
        if (!tracking.canStart && status === 'in-progress') {
            return res.status(400).json({
                success: false,
                message: tracking.blockReason || 'Cannot start this process yet'
            });
        }

        // Update status
        tracking.status = status || tracking.status;
        tracking.progressPercentage = progressPercentage !== undefined ? progressPercentage : tracking.progressPercentage;

        if (status === 'in-progress' && !tracking.startedAt) {
            tracking.startedAt = new Date();
        }

        if (status === 'completed' && !tracking.completedAt) {
            tracking.completedAt = new Date();
            tracking.progressPercentage = 100;
        }

        if (notes) {
            tracking.notes = notes;
        }

        // Add log
        tracking.logs.push({
            action: 'status-changed',
            userId: employeeId,
            description: `Status changed to ${status}. Progress: ${tracking.progressPercentage}%`,
            details: { status, progressPercentage: tracking.progressPercentage }
        });

        await tracking.save();

        // Also update work order process assignment
        const workOrder = await WorkOrder.findById(tracking.workOrderId);
        if (workOrder) {
            const paIndex = workOrder.processAssignments.findIndex(
                pa => pa._id.toString() === tracking.processAssignmentId.toString()
            );
            if (paIndex !== -1) {
                workOrder.processAssignments[paIndex].status = tracking.status;
                workOrder.processAssignments[paIndex].progressPercentage = tracking.progressPercentage;
                if (tracking.startedAt) workOrder.processAssignments[paIndex].startedAt = tracking.startedAt;
                if (tracking.completedAt) workOrder.processAssignments[paIndex].completedAt = tracking.completedAt;
                await workOrder.save();
            }
        }

        res.json({
            success: true,
            message: 'Process status updated successfully',
            data: tracking
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Upload report (placeholder for now)
export const uploadReport = async (req, res) => {
    try {
        const { trackingId } = req.params;
        const { reportUrl, employeeId } = req.body;

        const tracking = await ProcessTracking.findById(trackingId);
        if (!tracking) {
            return res.status(404).json({ success: false, message: 'Process tracking not found' });
        }

        if (!tracking.addReportAfter) {
            return res.status(400).json({ success: false, message: 'This process does not require a report' });
        }

        tracking.reportUploaded = true;
        tracking.reportUrl = reportUrl || 'pending-upload';
        tracking.reportUploadedAt = new Date();
        tracking.reportUploadedBy = employeeId;

        tracking.logs.push({
            action: 'note-added',
            userId: employeeId,
            description: 'Report uploaded, awaiting admin review',
            details: { reportUrl }
        });

        await tracking.save();

        res.json({
            success: true,
            message: 'Report uploaded successfully. Waiting for admin approval.',
            data: tracking
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Admin: Receive/approve report
export const receiveReport = async (req, res) => {
    try {
        const { trackingId } = req.params;
        const { adminId } = req.body;

        const tracking = await ProcessTracking.findById(trackingId);
        if (!tracking) {
            return res.status(404).json({ success: false, message: 'Process tracking not found' });
        }

        if (!tracking.reportUploaded) {
            return res.status(400).json({ success: false, message: 'No report uploaded yet' });
        }

        tracking.reportReceived = true;
        tracking.reportReceivedAt = new Date();
        tracking.reportReceivedBy = adminId;

        tracking.logs.push({
            action: 'note-added',
            userId: adminId,
            description: 'Report received and approved by admin',
            details: { reportReceived: true }
        });

        await tracking.save();

        // Update next process canStart status
        const workOrder = await WorkOrder.findById(tracking.workOrderId);
        if (workOrder) {
            const currentProcessIndex = workOrder.processAssignments.findIndex(
                pa => pa._id.toString() === tracking.processAssignmentId.toString()
            );

            if (currentProcessIndex !== -1 && currentProcessIndex < workOrder.processAssignments.length - 1) {
                const nextProcess = workOrder.processAssignments[currentProcessIndex + 1];
                const nextTracking = await ProcessTracking.findOne({ processAssignmentId: nextProcess._id });

                if (nextTracking) {
                    nextTracking.canStart = true;
                    nextTracking.blockReason = '';
                    await nextTracking.save();
                }
            }
        }

        res.json({
            success: true,
            message: 'Report received and approved',
            data: tracking
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
