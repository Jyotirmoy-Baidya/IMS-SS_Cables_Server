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
        coreOuterAreaWithInsulation: frontendCore.coreOuterAreaWithInsulation,
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
        // Create quotation with core and sheath IDs
        const quotation = await Quotation.create(req.body);

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
            .populate({
                path: 'cores',
                populate: {
                    path: 'processes',
                    model: 'ProcessEntry',
                    populate: {
                        path: 'processId',
                        model: 'Process'
                    }
                }
            })
            .populate({
                path: 'sheathGroups',
                populate: {
                    path: 'processes',
                    model: 'ProcessEntry',
                    populate: {
                        path: 'processId',
                        model: 'Process'
                    }
                }
            })
            .populate({
                path: 'quoteProcesses',
                model: 'ProcessEntry',
                populate: {
                    path: 'processId',
                    model: 'Process'
                }
            });
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


        // Save
        await quotation.save();

        // Populate after save
        await quotation.populate('customerId', 'companyName address contacts');
        await quotation.populate({
            path: 'cores',
            populate: {
                path: 'processes',
                model: 'ProcessEntry',
                populate: {
                    path: 'processId',
                    model: 'Process'
                }
            }
        });
        await quotation.populate({
            path: 'sheathGroups',
            populate: {
                path: 'processes',
                model: 'ProcessEntry',
                populate: {
                    path: 'processId',
                    model: 'Process'
                }
            }
        });
        await quotation.populate({
            path: 'quoteProcesses',
            model: 'ProcessEntry',
            populate: {
                path: 'processId',
                model: 'Process'
            }
        });

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
        )
            .populate('customerId', 'companyName address contacts')
            .populate({
                path: 'cores',
                populate: {
                    path: 'processes',
                    model: 'ProcessEntry',
                    populate: {
                        path: 'processId',
                        model: 'Process'
                    }
                }
            })
            .populate({
                path: 'sheathGroups',
                populate: {
                    path: 'processes',
                    model: 'ProcessEntry',
                    populate: {
                        path: 'processId',
                        model: 'Process'
                    }
                }
            })
            .populate({
                path: 'quoteProcesses',
                model: 'ProcessEntry',
                populate: {
                    path: 'processId',
                    model: 'Process'
                }
            });
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

        // Populate processes before returning
        await newCore.populate({
            path: 'processes',
            model: 'ProcessEntry',
            populate: {
                path: 'processId',
                model: 'Process'
            }
        });

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

        // Transform and update core with frontend data
        const coreData = transformCoreData(frontendCore, core.coreNumber, quotation._id);
        Object.assign(core, coreData);
        await core.save();

        // Populate processes before returning
        await core.populate({
            path: 'processes',
            model: 'ProcessEntry',
            populate: {
                path: 'processId',
                model: 'Process'
            }
        });

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
        sheathLength: frontendSheath.sheathLength || null,

        coreIds: frontendSheath.coreIds || [],
        sheathIds: frontendSheath.sheathIds || [],

        // Fresh material fields
        freshMaterialTypeId: frontendSheath.freshMaterialTypeId,
        freshMaterialId: frontendSheath.freshMaterialId,

        // Reprocess material fields
        reprocessMaterialTypeId: frontendSheath.reprocessMaterialTypeId,
        reprocessMaterialId: frontendSheath.reprocessMaterialId,

        // Dimensions and material properties
        thickness: frontendSheath.thickness || 0,
        freshSheathDensity: frontendSheath.freshSheathDensity || 1.4,
        freshSheathPercent: frontendSheath.freshSheathPercent || 100,
        freshSheathWeight: frontendSheath.freshSheathWeight || 0,
        reprocessSheathDensity: frontendSheath.reprocessSheathDensity || 1.4,
        reprocessSheathPercent: frontendSheath.reprocessSheathPercent || 0,
        reprocessSheathWeight: frontendSheath.reprocessSheathWeight || 0,
        wastageSheathPercent: frontendSheath.wastageSheathPercent || 0,

        innerArea: frontendSheath.innerArea || 0, // Calculated in frontend
        innerDiameter: frontendSheath.innerDiameter || 0,
        outerArea: frontendSheath.outerArea || 0,
        outerDiameter: frontendSheath.outerDiameter || 0,

        processes: (frontendSheath.processes || []).map(p =>
            typeof p === 'string' ? p : p._id
        ),
        materialRequired: frontendSheath.materialRequired || [],

        costs: frontendSheath.costs || {
            totalMaterialCost: 0,
            totalProcessCost: 0,
            grandTotal: 0
        },

        notes: frontendSheath.notes || '',
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

        // Populate processes before returning
        await newSheath.populate({
            path: 'processes',
            model: 'ProcessEntry',
            populate: {
                path: 'processId',
                model: 'Process'
            }
        });

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

        console.log(sheathData.materialRequired);
        Object.assign(sheath, sheathData);

        await sheath.save();

        // Populate processes before returning
        await sheath.populate({
            path: 'processes',
            model: 'ProcessEntry',
            populate: {
                path: 'processId',
                model: 'Process'
            }
        });

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
