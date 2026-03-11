import Quotation from '../models/QuotationModel.js';
import Core from '../models/CoreModel.js';

// Helper function to transform frontend core data to Core model format
const transformCoreData = (frontendCore, coreNumber, quotationId = null) => {
    return {
        name: frontendCore.name || `Core ${coreNumber}`,
        coreNumber,
        quotationId,
        coreLength: frontendCore.coreLength || 0,

        conductor: {
            materialTypeId: frontendCore.materialTypeId,
            materialTypeName: frontendCore.selectedRod?.materialTypeName || '',
            materialId: frontendCore.materialId || frontendCore.selectedRod?._id,

            selectedRod: frontendCore.selectedRod ? {
                rodId: frontendCore.selectedRod._id,
                rodName: frontendCore.selectedRod.name || '',
                diameter: frontendCore.selectedRod.specifications?.dimensions || 0,
                density: frontendCore.materialDensity || 8.96
            } : undefined,

            totalCoreArea: frontendCore.totalCoreArea || 0,
            wireCount: frontendCore.wireCount || 1,
            wireDiameter: 0, // Will be calculated in Core model pre-save
            conductorDiameter: 0, // Will be calculated
            drawingLength: 0, // Will be calculated
            materialWeight: 0, // Will be calculated
            wastagePercent: frontendCore.wastagePercent || 0,
            hasAnnealing: frontendCore.hasAnnealing || false
        },

        insulation: {
            materialTypeId: frontendCore.insulation?.materialTypeId,
            materialTypeName: frontendCore.insulation?.materialTypeName || '',
            materialId: frontendCore.insulation?.materialId,
            reprocessMaterialId: frontendCore.insulation?.reprocessMaterialId,

            thickness: frontendCore.insulation?.thickness || 0,
            density: frontendCore.insulation?.density || 1.4,
            freshPercent: frontendCore.insulation?.freshPercent || 100,
            reprocessPercent: frontendCore.insulation?.reprocessPercent || 0,
            wastagePercent: frontendCore.insulation?.wastagePercent || 0,
            insulatedDiameter: 0, // Will be calculated
            insulationWeight: 0 // Will be calculated
        },

        processes: frontendCore.processes || [],
        materialRequired: frontendCore.materialRequired || [],

        costs: {
            totalMaterialCost: 0, // Will be calculated
            totalProcessCost: 0,
            grandTotal: 0
        },

        isActive: true
    };
};

export const createQuotation = async (req, res) => {
    try {
        const { cores: frontendCores, ...quotationData } = req.body;

        // Create Core documents first if provided
        let coreIds = [];
        if (frontendCores && Array.isArray(frontendCores) && frontendCores.length > 0) {
            const corePromises = frontendCores.map((frontendCore, index) => {
                const coreData = transformCoreData(frontendCore, index + 1);
                return Core.create(coreData);
            });
            const createdCores = await Promise.all(corePromises);
            coreIds = createdCores.map(core => core._id);
        }

        // Create quotation with core IDs
        const quotation = await Quotation.create({
            ...quotationData,
            cores: coreIds
        });

        // Update cores with quotationId
        if (coreIds.length > 0) {
            await Core.updateMany(
                { _id: { $in: coreIds } },
                { $set: { quotationId: quotation._id } }
            );
        }

        await quotation.populate('customerId', 'companyName address contacts');
        await quotation.populate('cores');
        res.status(201).json({ success: true, message: 'Quotation created', data: quotation });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

export const getAllQuotations = async (req, res) => {
    try {
        const { status, search } = req.query;
        const filter = {};
        if (status) filter.status = status;

        let quotations = await Quotation.find(filter)
            .populate('customerId', 'companyName address contacts')
            .populate('workOrderId', 'workOrderNumber status')
            .sort({ createdAt: -1 });

        if (search) {
            const s = search.toLowerCase();
            quotations = quotations.filter(q =>
                q.quoteNumber?.toLowerCase().includes(s) ||
                q.customerId?.companyName?.toLowerCase().includes(s)
            );
        }

        res.json({ success: true, data: quotations });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getQuotationById = async (req, res) => {
    try {
        const quotation = await Quotation.findById(req.params.id)
            .populate('customerId', 'companyName address contacts')
            .populate('cores');
        if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
        res.json({ success: true, data: quotation });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const updateQuotation = async (req, res) => {
    try {
        const { cores: frontendCores, ...quotationData } = req.body;

        // Find the quotation first
        const quotation = await Quotation.findById(req.params.id);
        if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });

        // Handle core updates
        let coreIds = [];
        if (frontendCores && Array.isArray(frontendCores)) {
            // Delete old cores
            if (quotation.cores && quotation.cores.length > 0) {
                await Core.deleteMany({ _id: { $in: quotation.cores } });
            }

            // Create new cores
            if (frontendCores.length > 0) {
                const corePromises = frontendCores.map((frontendCore, index) => {
                    const coreData = transformCoreData(frontendCore, index + 1, quotation._id);
                    return Core.create(coreData);
                });
                const createdCores = await Promise.all(corePromises);
                coreIds = createdCores.map(core => core._id);
            }
        } else {
            // Keep existing cores if not provided
            coreIds = quotation.cores;
        }

        // Update quotation properties
        Object.assign(quotation, quotationData);
        quotation.cores = coreIds;

        // Save to trigger pre-save hook (recalculates sheaths materialRequired)
        await quotation.save();

        // Populate after save
        await quotation.populate('customerId', 'companyName address contacts');
        await quotation.populate('cores');

        res.json({ success: true, message: 'Quotation updated', data: quotation });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Lightweight PATCH — for updating status, notes, delivery info from list page
export const patchQuotation = async (req, res) => {
    try {
        const quotation = await Quotation.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        ).populate('customerId', 'companyName address contacts');
        if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
        res.json({ success: true, data: quotation });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

export const deleteQuotation = async (req, res) => {
    try {
        const quotation = await Quotation.findById(req.params.id);
        if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });

        // Delete associated cores
        if (quotation.cores && quotation.cores.length > 0) {
            await Core.deleteMany({ _id: { $in: quotation.cores } });
        }

        // Delete quotation
        await quotation.deleteOne();

        res.json({ success: true, message: 'Quotation deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Add a single core to an existing quotation
export const addCoreToQuotation = async (req, res) => {
    try {
        const quotation = await Quotation.findById(req.params.id);
        if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });

        const frontendCore = req.body;

        // Get the next core number
        const coreNumber = quotation.cores.length + 1;

        // Transform and create the core
        const coreData = transformCoreData(frontendCore, coreNumber, quotation._id);
        const newCore = await Core.create(coreData);

        // Add core to quotation
        quotation.cores.push(newCore._id);
        await quotation.save();

        // Return the created core
        res.status(201).json({ success: true, message: 'Core added', data: newCore });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Update a specific core in a quotation
export const updateCoreInQuotation = async (req, res) => {
    try {
        const { id: quotationId, coreId } = req.params;
        const frontendCore = req.body;

        const quotation = await Quotation.findById(quotationId);
        if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });

        const core = await Core.findById(coreId);
        if (!core) return res.status(404).json({ success: false, message: 'Core not found' });

        // Update core with frontend data
        const coreData = transformCoreData(frontendCore, core.coreNumber, quotation._id);
        Object.assign(core, coreData);
        await core.save();

        res.json({ success: true, message: 'Core updated', data: core });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Delete a specific core from a quotation
export const deleteCoreFromQuotation = async (req, res) => {
    try {
        const { id: quotationId, coreId } = req.params;

        const quotation = await Quotation.findById(quotationId);
        if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });

        // Remove core reference from quotation
        quotation.cores = quotation.cores.filter(id => String(id) !== String(coreId));
        await quotation.save();

        // Delete the core
        await Core.findByIdAndDelete(coreId);

        // Renumber remaining cores
        const remainingCores = await Core.find({ _id: { $in: quotation.cores } }).sort({ coreNumber: 1 });
        for (let i = 0; i < remainingCores.length; i++) {
            remainingCores[i].coreNumber = i + 1;
            remainingCores[i].name = `Core ${i + 1}`;
            await remainingCores[i].save();
        }

        res.json({ success: true, message: 'Core deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
