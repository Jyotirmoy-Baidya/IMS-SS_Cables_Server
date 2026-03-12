import Core from '../models/CoreModel.js';
import RawMaterial from '../models/RawMaterialModel.js';

// Helper to evaluate formula
const evalFormula = (formula, variables) => {
    try {
        const scope = {};
        (variables || []).forEach(v => { scope[v.name] = parseFloat(v.value) || 0; });
        if (!formula || !formula.trim()) return 0;
        const fn = new Function(...Object.keys(scope), `return (${formula})`);
        const result = fn(...Object.values(scope));
        return typeof result === 'number' && isFinite(result) ? result : 0;
    } catch { return 0; }
};

// Helper to interpolate template
const interpolateTemplate = (template, variables) => {
    if (!template) return '';
    try {
        const scope = {};
        (variables || []).forEach(v => { scope[v.name] = parseFloat(v.value) || 0; });
        return template.replace(/\$\{(\w+)\}/g, (match, varName) => {
            return scope[varName] !== undefined ? scope[varName] : match;
        });
    } catch {
        return template;
    }
};

// Create core
export const createCore = async (req, res) => {
    try {
        const coreData = req.body;

        // Fetch material pricing for cost snapshot
        const materialIds = [];

        if (coreData.conductor?.materialId) materialIds.push(coreData.conductor.materialId);
        if (coreData.insulation?.freshMaterialId) materialIds.push(coreData.insulation.freshMaterialId);
        if (coreData.insulation?.reprocessMaterialId) materialIds.push(coreData.insulation.reprocessMaterialId);

        const materials = await RawMaterial.find({ _id: { $in: materialIds } })
            .select('_id name inventory reprocessInventory specifications');

        const pricingMap = {};
        materials.forEach(mat => {
            pricingMap[mat._id.toString()] = {
                avgPricePerKg: mat.inventory?.avgPricePerKg || 0,
                reprocessPricePerKg: mat.reprocessInventory?.avgPricePerKg || 0
            };
        });

        // Update material requirements with pricing
        if (coreData.materialRequired && Array.isArray(coreData.materialRequired)) {
            coreData.materialRequired = coreData.materialRequired.map(req => {
                const pricing = pricingMap[req.materialId?.toString()];
                if (pricing) {
                    const pricePerKg = req.type === 'reprocess'
                        ? pricing.reprocessPricePerKg
                        : pricing.avgPricePerKg;
                    return {
                        ...req,
                        pricePerKg,
                        totalCost: parseFloat((req.weight * pricePerKg).toFixed(2))
                    };
                }
                return req;
            });
        }

        // Calculate process outputs and costs
        if (coreData.processes && Array.isArray(coreData.processes)) {
            coreData.processes = coreData.processes.map(proc => {
                // Calculate process cost
                const processCost = proc.costFormula
                    ? evalFormula(proc.costFormula, proc.variables || [])
                    : 0;

                // Calculate output if configured
                let calculatedOutput = {
                    outputType: proc.output?.outputType || 'none',
                    calculatedQuantity: 0,
                    calculatedItemName: '',
                    calculatedSpecification: '',
                    unit: proc.output?.unit || 'm',
                    quantityFormula: proc.output?.quantityFormula || '',
                    itemNameTemplate: proc.output?.itemNameTemplate || '',
                    specificationTemplate: proc.output?.specificationTemplate || ''
                };

                if (proc.output && proc.output.outputType !== 'none') {
                    calculatedOutput.calculatedQuantity = proc.output.quantityFormula
                        ? evalFormula(proc.output.quantityFormula, proc.variables || [])
                        : 0;
                    calculatedOutput.calculatedItemName = proc.output.itemNameTemplate
                        ? interpolateTemplate(proc.output.itemNameTemplate, proc.variables || [])
                        : '';
                    calculatedOutput.calculatedSpecification = proc.output.specificationTemplate
                        ? interpolateTemplate(proc.output.specificationTemplate, proc.variables || [])
                        : '';
                }

                return {
                    ...proc,
                    processCost,
                    output: calculatedOutput
                };
            });
        }

        // Calculate total costs
        const totalMaterialCost = (coreData.materialRequired || [])
            .reduce((sum, req) => sum + (req.totalCost || 0), 0);
        const totalProcessCost = (coreData.processes || [])
            .reduce((sum, proc) => sum + (proc.processCost || 0), 0);

        coreData.costs = {
            totalMaterialCost,
            totalProcessCost,
            grandTotal: totalMaterialCost + totalProcessCost
        };

        const core = await Core.create(coreData);

        await core.populate([
            { path: 'conductor.materialTypeId', select: 'name category' },
            { path: 'conductor.materialId', select: 'name materialCode' },
            { path: 'insulation.freshMaterialTypeId', select: 'name category' },
            { path: 'insulation.freshMaterialId', select: 'name materialCode' },
            { path: 'insulation.reprocessMaterialTypeId', select: 'name category' },
            { path: 'insulation.reprocessMaterialId', select: 'name materialCode' }
        ]);

        res.status(201).json({
            success: true,
            message: 'Core created successfully',
            data: core
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Get all cores (with optional quotationId filter)
export const getAllCores = async (req, res) => {
    try {
        const { quotationId, isActive } = req.query;
        const filter = {};

        if (quotationId) filter.quotationId = quotationId;
        if (isActive !== undefined) filter.isActive = isActive === 'true';

        const cores = await Core.find(filter)
            .populate('conductor.materialTypeId', 'name category')
            .populate('conductor.materialId', 'name materialCode')
            .populate('insulation.freshMaterialTypeId', 'name category')
            .populate('insulation.freshMaterialId', 'name materialCode')
            .populate('insulation.reprocessMaterialTypeId', 'name category')
            .populate('insulation.reprocessMaterialId', 'name materialCode')
            .sort({ coreNumber: 1, createdAt: -1 });

        res.json({ success: true, data: cores });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Get core by ID
export const getCoreById = async (req, res) => {
    try {
        const core = await Core.findById(req.params.id)
            .populate('conductor.materialTypeId', 'name category')
            .populate('conductor.materialId', 'name materialCode inventory')
            .populate('insulation.freshMaterialTypeId', 'name category')
            .populate('insulation.freshMaterialId', 'name materialCode inventory')
            .populate('insulation.reprocessMaterialTypeId', 'name category')
            .populate('insulation.reprocessMaterialId', 'name materialCode reprocessInventory');

        if (!core) {
            return res.status(404).json({ success: false, message: 'Core not found' });
        }

        res.json({ success: true, data: core });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update core
export const updateCore = async (req, res) => {
    try {
        const coreData = req.body;

        // Fetch material pricing for cost snapshot
        const materialIds = [];
        console.log(coreData);
        if (coreData.conductor?.materialId) materialIds.push(coreData.conductor.materialId);
        if (coreData.insulation?.freshMaterialId) materialIds.push(coreData.insulation.freshMaterialId);
        if (coreData.insulation?.reprocessMaterialId) materialIds.push(coreData.insulation.reprocessMaterialId);

        if (materialIds.length > 0) {
            const materials = await RawMaterial.find({ _id: { $in: materialIds } })
                .select('_id name inventory reprocessInventory specifications');

            const pricingMap = {};
            materials.forEach(mat => {
                pricingMap[mat._id.toString()] = {
                    avgPricePerKg: mat.inventory?.avgPricePerKg || 0,
                    reprocessPricePerKg: mat.reprocessInventory?.avgPricePerKg || 0
                };
            });

            // Update material requirements with pricing
            if (coreData.materialRequired && Array.isArray(coreData.materialRequired)) {
                coreData.materialRequired = coreData.materialRequired.map(req => {
                    const pricing = pricingMap[req.materialId?.toString()];
                    if (pricing) {
                        const pricePerKg = req.type === 'reprocess'
                            ? pricing.reprocessPricePerKg
                            : pricing.avgPricePerKg;
                        return {
                            ...req,
                            pricePerKg,
                            totalCost: parseFloat((req.weight * pricePerKg).toFixed(2))
                        };
                    }
                    return req;
                });
            }
        }

        // Calculate process outputs and costs
        if (coreData.processes && Array.isArray(coreData.processes)) {
            coreData.processes = coreData.processes.map(proc => {
                const processCost = proc.costFormula
                    ? evalFormula(proc.costFormula, proc.variables || [])
                    : 0;

                let calculatedOutput = {
                    outputType: proc.output?.outputType || 'none',
                    calculatedQuantity: 0,
                    calculatedItemName: '',
                    calculatedSpecification: '',
                    unit: proc.output?.unit || 'm',
                    quantityFormula: proc.output?.quantityFormula || '',
                    itemNameTemplate: proc.output?.itemNameTemplate || '',
                    specificationTemplate: proc.output?.specificationTemplate || ''
                };

                if (proc.output && proc.output.outputType !== 'none') {
                    calculatedOutput.calculatedQuantity = proc.output.quantityFormula
                        ? evalFormula(proc.output.quantityFormula, proc.variables || [])
                        : 0;
                    calculatedOutput.calculatedItemName = proc.output.itemNameTemplate
                        ? interpolateTemplate(proc.output.itemNameTemplate, proc.variables || [])
                        : '';
                    calculatedOutput.calculatedSpecification = proc.output.specificationTemplate
                        ? interpolateTemplate(proc.output.specificationTemplate, proc.variables || [])
                        : '';
                }

                return {
                    ...proc,
                    processCost,
                    output: calculatedOutput
                };
            });
        }

        // Calculate total costs
        const totalMaterialCost = (coreData.materialRequired || [])
            .reduce((sum, req) => sum + (req.totalCost || 0), 0);
        const totalProcessCost = (coreData.processes || [])
            .reduce((sum, proc) => sum + (proc.processCost || 0), 0);

        coreData.costs = {
            totalMaterialCost,
            totalProcessCost,
            grandTotal: totalMaterialCost + totalProcessCost
        };

        // Use $set to ensure nested objects are properly updated
        const updateData = { $set: coreData };
        console.log(coreData);
        const core = await Core.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate([
            { path: 'conductor.materialTypeId', select: 'name category' },
            { path: 'conductor.materialId', select: 'name materialCode' },
            { path: 'insulation.freshMaterialTypeId', select: 'name category' },
            { path: 'insulation.freshMaterialId', select: 'name materialCode' },
            { path: 'insulation.reprocessMaterialTypeId', select: 'name category' },
            { path: 'insulation.reprocessMaterialId', select: 'name materialCode' }
        ]);

        if (!core) {
            return res.status(404).json({ success: false, message: 'Core not found' });
        }

        res.json({
            success: true,
            message: 'Core updated successfully',
            data: core
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// Delete core
export const deleteCore = async (req, res) => {
    try {
        const core = await Core.findByIdAndDelete(req.params.id);

        if (!core) {
            return res.status(404).json({ success: false, message: 'Core not found' });
        }

        res.json({ success: true, message: 'Core deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Soft delete (set isActive to false)
export const deactivateCore = async (req, res) => {
    try {
        const core = await Core.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );

        if (!core) {
            return res.status(404).json({ success: false, message: 'Core not found' });
        }

        res.json({ success: true, message: 'Core deactivated successfully', data: core });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
