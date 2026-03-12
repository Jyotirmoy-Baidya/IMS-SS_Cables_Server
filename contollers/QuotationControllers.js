import Quotation from '../models/QuotationModel.js';
import Core from '../models/CoreModel.js';
import Sheath from '../models/SheathModel.js';

// Helper function to transform frontend core data to Core model format
const transformCoreData = (frontendCore, coreNumber, quotationId = null) => {
    // Check if conductor is already formatted (sent from new frontend) or needs transformation
    const conductorData = frontendCore.conductor ? frontendCore.conductor : {
        materialTypeId: frontendCore.materialTypeId,
        materialTypeName: frontendCore.materialTypeName || frontendCore.selectedRod?.materialTypeName || '',
        materialId: frontendCore.materialId || frontendCore.selectedRod?._id,

        selectedRod: frontendCore.selectedRod ? {
            rodId: frontendCore.selectedRod._id,
            rodName: frontendCore.selectedRod.name || '',
            diameter: frontendCore.selectedRod.specifications?.dimensionValue || 0,
            density: frontendCore.materialDensity || 8.96
        } : undefined,

        totalCoreArea: frontendCore.totalCoreArea || 0,
        wireCount: frontendCore.wireCount || 1,
        wireDiameter: 0,
        conductorDiameter: 0,
        drawingLength: 0,
        materialWeight: 0,
        wastagePercent: frontendCore.wastagePercent || 0,
        hasAnnealing: frontendCore.hasAnnealing || false
    };

    // Check if insulation is already formatted or needs transformation
    const insulationData = frontendCore.insulation && frontendCore.insulation.materialTypeId ? frontendCore.insulation :
        (frontendCore.hasInsulation !== false && frontendCore.insulation?.materialTypeId ? {
            materialTypeId: frontendCore.insulation.materialTypeId,
            materialTypeName: frontendCore.insulation.materialTypeName || '',
            materialId: frontendCore.insulation.materialId,
            reprocessMaterialId: frontendCore.insulation.reprocessMaterialId,

            thickness: frontendCore.insulation.thickness || 0,
            density: frontendCore.insulation.density || 1.4,
            freshPercent: frontendCore.insulation.freshPercent || 100,
            reprocessPercent: frontendCore.insulation.reprocessPercent || 0,
            wastagePercent: frontendCore.insulation.wastagePercent || 0,
            insulatedDiameter: 0,
            insulatedArea: 0,
            insulationWeight: 0
        } : undefined);

    return {
        name: frontendCore.name || `Core ${coreNumber}`,
        coreNumber,
        quotationId,
        coreLength: frontendCore.coreLength || 0,

        conductor: conductorData,
        insulation: insulationData,

        processes: (frontendCore.processes || []).map(p => ({
            ...p,
            output: p.output ? {
                ...p.output,
                outputType: (p.output.outputType || '').toLowerCase() === 'intermediateproduct' ? 'intermediate' :
                    (p.output.outputType || 'none').toLowerCase()
            } : { outputType: 'none' }
        })),
        materialRequired: frontendCore.materialRequired || [],

        costs: frontendCore.costs || {
            totalMaterialCost: 0,
            totalProcessCost: 0,
            grandTotal: 0
        },

        isActive: true
    };
};

export const createQuotation = async (req, res) => {
    try {
        const { cores: frontendCores, sheathGroups: frontendSheaths, ...quotationData } = req.body;

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

        // Create Sheath documents if provided
        let sheathIds = [];
        if (frontendSheaths && Array.isArray(frontendSheaths) && frontendSheaths.length > 0) {
            const sheathPromises = frontendSheaths.map((frontendSheath, index) => {
                const sheathData = transformSheathData(frontendSheath, index + 1);
                return Sheath.create(sheathData);
            });
            const createdSheaths = await Promise.all(sheathPromises);
            sheathIds = createdSheaths.map(sheath => sheath._id);
        }

        // Create quotation with core and sheath IDs
        const quotation = await Quotation.create({
            ...quotationData,
            cores: coreIds,
            sheathGroups: sheathIds
        });

        // Update cores with quotationId
        if (coreIds.length > 0) {
            await Core.updateMany(
                { _id: { $in: coreIds } },
                { $set: { quotationId: quotation._id } }
            );
        }

        // Update sheaths with quotationId
        if (sheathIds.length > 0) {
            await Sheath.updateMany(
                { _id: { $in: sheathIds } },
                { $set: { quotationId: quotation._id } }
            );
        }

        await quotation.populate('customerId', 'companyName address contacts');
        await quotation.populate('cores');
        await quotation.populate('sheathGroups');
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
            .populate('cores')
            .populate('sheathGroups');
        if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
        res.json({ success: true, data: quotation });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const updateQuotation = async (req, res) => {
    try {
        const { cores: frontendCores, sheathGroups: frontendSheaths, ...quotationData } = req.body;

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

        // Handle sheath updates
        let sheathIds = [];
        if (frontendSheaths && Array.isArray(frontendSheaths)) {
            // Delete old sheaths
            if (quotation.sheathGroups && quotation.sheathGroups.length > 0) {
                await Sheath.deleteMany({ _id: { $in: quotation.sheathGroups } });
            }

            // Create new sheaths
            if (frontendSheaths.length > 0) {
                const sheathPromises = frontendSheaths.map((frontendSheath, index) => {
                    const sheathData = transformSheathData(frontendSheath, index + 1, quotation._id);
                    return Sheath.create(sheathData);
                });
                const createdSheaths = await Promise.all(sheathPromises);
                sheathIds = createdSheaths.map(sheath => sheath._id);
            }
        } else {
            // Keep existing sheaths if not provided
            sheathIds = quotation.sheathGroups;
        }

        // Update quotation properties
        Object.assign(quotation, quotationData);
        quotation.cores = coreIds;
        quotation.sheathGroups = sheathIds;

        // Save
        await quotation.save();

        // Populate after save
        await quotation.populate('customerId', 'companyName address contacts');
        await quotation.populate('cores');
        await quotation.populate('sheathGroups');

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

        // Delete associated sheaths
        if (quotation.sheathGroups && quotation.sheathGroups.length > 0) {
            await Sheath.deleteMany({ _id: { $in: quotation.sheathGroups } });
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
        console.log(frontendCore);
        Object.assign(core, frontendCore);
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

// ═══════════════════════════════════════════════════════
// SHEATH MANAGEMENT
// ═══════════════════════════════════════════════════════

// Helper function to transform frontend sheath data to Sheath model format
const transformSheathData = (frontendSheath, sheathNumber, quotationId = null) => {
    return {
        name: frontendSheath.name || `Sheath ${sheathNumber}`,
        sheathNumber,
        quotationId,
        sheathLength: frontendSheath.sheathLength || 0,

        coreIds: frontendSheath.coreIds || [],
        sheathIds: frontendSheath.sheathIds || [],

        materialTypeId: frontendSheath.materialTypeId,
        materialTypeName: frontendSheath.materialTypeName || '',
        materialId: frontendSheath.materialId,
        reprocessMaterialId: frontendSheath.reprocessMaterialId,

        thickness: frontendSheath.thickness || 0,
        density: frontendSheath.density || 1.4,
        freshPercent: frontendSheath.freshPercent || 100,
        reprocessPercent: frontendSheath.reprocessPercent || 0,
        wastagePercent: frontendSheath.wastagePercent || 0,

        innerArea: 0, // Will be calculated in Sheath model pre-save
        innerDiameter: 0,
        outerArea: 0,
        outerDiameter: 0,
        sheathWeight: 0,

        processes: frontendSheath.processes || [],
        materialRequired: frontendSheath.materialRequired || [],

        costs: {
            totalMaterialCost: 0,
            totalProcessCost: 0,
            grandTotal: 0
        },

        isActive: true
    };
};

// Add a single sheath to an existing quotation
export const addSheathToQuotation = async (req, res) => {
    try {
        const quotation = await Quotation.findById(req.params.id);
        if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });

        const frontendSheath = req.body;

        // Get the next sheath number
        const sheathNumber = quotation.sheathGroups.length + 1;

        // Transform and create the sheath
        const sheathData = transformSheathData(frontendSheath, sheathNumber, quotation._id);
        const newSheath = await Sheath.create(sheathData);

        // Add sheath to quotation
        quotation.sheathGroups.push(newSheath._id);
        await quotation.save();

        // Return the created sheath
        res.status(201).json({ success: true, message: 'Sheath added', data: newSheath });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Update a specific sheath in a quotation
export const updateSheathInQuotation = async (req, res) => {
    try {
        const { id: quotationId, sheathId } = req.params;
        const frontendSheath = req.body;

        const quotation = await Quotation.findById(quotationId);
        if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });

        const sheath = await Sheath.findById(sheathId);
        if (!sheath) return res.status(404).json({ success: false, message: 'Sheath not found' });

        // Update sheath with frontend data
        const sheathData = transformSheathData(frontendSheath, sheath.sheathNumber, quotation._id);
        Object.assign(sheath, sheathData);
        await sheath.save();

        res.json({ success: true, message: 'Sheath updated', data: sheath });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Delete a specific sheath from a quotation
export const deleteSheathFromQuotation = async (req, res) => {
    try {
        const { id: quotationId, sheathId } = req.params;

        const quotation = await Quotation.findById(quotationId);
        if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });

        // Remove sheath reference from quotation
        quotation.sheathGroups = quotation.sheathGroups.filter(id => String(id) !== String(sheathId));
        await quotation.save();

        // Delete the sheath
        await Sheath.findByIdAndDelete(sheathId);

        // Renumber remaining sheaths
        const remainingSheaths = await Sheath.find({ _id: { $in: quotation.sheathGroups } }).sort({ sheathNumber: 1 });
        for (let i = 0; i < remainingSheaths.length; i++) {
            remainingSheaths[i].sheathNumber = i + 1;
            remainingSheaths[i].name = `Sheath ${i + 1}`;
            await remainingSheaths[i].save();
        }

        res.json({ success: true, message: 'Sheath deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
