import ProcessEntry from '../models/ProcessEntryModel.js';
import Core from '../models/CoreModel.js';
import Sheath from '../models/SheathModel.js';
import Quotation from '../models/QuotationModel.js';

/**
 * Add process entry to a core
 * POST /api/process-entry/add-to-core/:coreId
 * Frontend sends complete process entry data
 */
export const addProcessToCore = async (req, res) => {
    try {
        const { coreId } = req.params;
        const processEntryData = req.body;

        // Validate core exists
        const core = await Core.findById(coreId);
        if (!core) {
            return res.status(404).json({ success: false, message: 'Core not found' });
        }

        // Get the next sequence number
        const existingEntries = await ProcessEntry.find({ coreId }).sort({ sequence: -1 }).limit(1);
        const sequence = existingEntries.length > 0 ? existingEntries[0].sequence + 1 : 1;

        // Create process entry with data from frontend
        const processEntry = new ProcessEntry({
            ...processEntryData,
            coreId,
            sequence
        });

        await processEntry.save();

        res.status(201).json({
            success: true,
            message: 'Process added to core successfully',
            data: processEntry
        });
    } catch (error) {
        console.error('Error adding process to core:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Add process entry to a sheath
 * POST /api/process-entry/add-to-sheath/:sheathId
 * Frontend sends complete process entry data
 */
export const addProcessToSheath = async (req, res) => {
    try {
        const { sheathId } = req.params;
        const processEntryData = req.body;

        // Validate sheath exists
        const sheath = await Sheath.findById(sheathId);
        if (!sheath) {
            return res.status(404).json({ success: false, message: 'Sheath not found' });
        }

        // Get the next sequence number
        const existingEntries = await ProcessEntry.find({ sheathId }).sort({ sequence: -1 }).limit(1);
        const sequence = existingEntries.length > 0 ? existingEntries[0].sequence + 1 : 1;

        // Create process entry with data from frontend
        const processEntry = new ProcessEntry({
            ...processEntryData,
            sheathId,
            sequence
        });

        await processEntry.save();

        res.status(201).json({
            success: true,
            message: 'Process added to sheath successfully',
            data: processEntry
        });
    } catch (error) {
        console.error('Error adding process to sheath:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Add process entry to a quotation
 * POST /api/process-entry/add-to-quote/:quotationId
 * Frontend sends complete process entry data
 */
export const addProcessToQuotation = async (req, res) => {
    try {
        const { quotationId } = req.params;
        const processEntryData = req.body;

        // Validate quotation exists
        const quotation = await Quotation.findById(quotationId);
        if (!quotation) {
            return res.status(404).json({ success: false, message: 'Quotation not found' });
        }

        // Get the next sequence number
        const existingEntries = await ProcessEntry.find({ quotationId }).sort({ sequence: -1 }).limit(1);
        const sequence = existingEntries.length > 0 ? existingEntries[0].sequence + 1 : 1;

        // Create process entry with data from frontend
        const processEntry = new ProcessEntry({
            ...processEntryData,
            quotationId,
            sequence
        });

        await processEntry.save();

        res.status(201).json({
            success: true,
            message: 'Process added to quotation successfully',
            data: processEntry
        });
    } catch (error) {
        console.error('Error adding process to quotation:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Update process entry
 * PUT /api/process-entry/edit-process-entry/:id
 * Frontend sends complete updated data
 */
export const updateProcessEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const processEntry = await ProcessEntry.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!processEntry) {
            return res.status(404).json({ success: false, message: 'Process entry not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Process entry updated successfully',
            data: processEntry
        });
    } catch (error) {
        console.error('Error updating process entry:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Delete process entry
 * DELETE /api/process-entry/delete-process-entry/:id
 */
export const deleteProcessEntry = async (req, res) => {
    try {
        const { id } = req.params;

        const processEntry = await ProcessEntry.findByIdAndDelete(id);
        if (!processEntry) {
            return res.status(404).json({ success: false, message: 'Process entry not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Process entry deleted successfully',
            data: processEntry
        });
    } catch (error) {
        console.error('Error deleting process entry:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get process entry by ID
 * GET /api/process-entry/get-process-entry/:id
 */
export const getProcessEntry = async (req, res) => {
    try {
        const { id } = req.params;

        const processEntry = await ProcessEntry.findById(id)
            .populate('processId')
            .populate('coreId')
            .populate('sheathId')
            .populate('quotationId');

        if (!processEntry) {
            return res.status(404).json({ success: false, message: 'Process entry not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Process entry retrieved successfully',
            data: processEntry
        });
    } catch (error) {
        console.error('Error getting process entry:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get all process entries for a parent (core/sheath/quotation)
 * GET /api/process-entry/get-by-parent?coreId=xxx OR ?sheathId=xxx OR ?quotationId=xxx
 */
export const getProcessEntriesByParent = async (req, res) => {
    try {
        const { coreId, sheathId, quotationId } = req.query;

        const filter = {};
        if (coreId) filter.coreId = coreId;
        if (sheathId) filter.sheathId = sheathId;
        if (quotationId) filter.quotationId = quotationId;

        if (Object.keys(filter).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide coreId, sheathId, or quotationId'
            });
        }

        const entries = await ProcessEntry.find(filter)
            .populate('processId')
            .sort({ sequence: 1 });

        res.status(200).json({
            success: true,
            message: 'Process entries retrieved successfully',
            data: entries,
            count: entries.length
        });
    } catch (error) {
        console.error('Error getting process entries:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
