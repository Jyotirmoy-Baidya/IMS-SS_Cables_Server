import QuotationModel from '../models/QuotationModel.js';

// Calculate material weight for conductor
const calculateMaterialWeight = (crossSection, length, density, wastagePercent = 0) => {
    const lengthInMm = length * 1000;
    const volumeMm3 = crossSection * lengthInMm;
    const volumeM3 = volumeMm3 / 1000000000;
    const densityKgPerM3 = density * 1000;
    const weight = volumeM3 * densityKgPerM3;
    const wastageMultiplier = 1 + (wastagePercent / 100);
    return weight * wastageMultiplier;
};

// Calculate drawing length required for stranding
const calculateDrawingLength = (wireCount, coreLength) => {
    if (wireCount === 1) {
        return coreLength;
    }
    return wireCount * coreLength;
};

// Calculate core diameter after stranding
const calculateCoreDiameter = (wireDiameter, wireCount) => {
    if (wireCount === 1) {
        return wireDiameter;
    }
    return Math.sqrt(wireCount) * wireDiameter / 2;
};

// Calculate insulation weight
const calculateInsulation = (
    coreDiameter,
    insulationThickness,
    length,
    freshPercent,
    reprocessPercent,
    freshDensity,
    reprocessDensity
) => {
    const insulatedDiameter = coreDiameter + (2 * insulationThickness);
    const outerRadius = insulatedDiameter / 2;
    const innerRadius = coreDiameter / 2;
    const totalVolumeCm3 = Math.PI * (outerRadius ** 2 - innerRadius ** 2) * length * 1000 / 1000;

    const freshWeight = (totalVolumeCm3 * (freshPercent / 100) * freshDensity) / 1000;
    const reprocessWeight = (totalVolumeCm3 * (reprocessPercent / 100) * reprocessDensity) / 1000;

    return {
        insulatedDiameter,
        freshWeight,
        reprocessWeight,
        totalWeight: freshWeight + reprocessWeight
    };
};

// Calculate sheath weight for a group
const calculateSheathWeight = (
    innerDiameter,
    sheathThickness,
    length,
    freshPercent,
    reprocessPercent,
    freshDensity,
    reprocessDensity
) => {
    const sheathOuterDiameter = innerDiameter + (2 * sheathThickness);
    const outerRadius = sheathOuterDiameter / 2;
    const innerRadius = innerDiameter / 2;
    const volumeMm3 = Math.PI * (outerRadius ** 2 - innerRadius ** 2) * length * 1000;
    const volumeCm3 = volumeMm3 / 1000;

    const totalWeight = (volumeCm3 * freshDensity) / 1000;
    const freshWeight = totalWeight * (freshPercent / 100);
    const reprocessWeight = totalWeight * (reprocessPercent / 100);

    return {
        freshWeight,
        reprocessWeight,
        totalWeight: freshWeight + reprocessWeight
    };
};

// POST /quotation/calculate-material-requirements
export const calculateMaterialRequirements = async (req, res) => {
    try {
        const { quoteId } = req.body;

        if (!quoteId) {
            return res.status(400).json({ message: 'quoteId is required' });
        }

        const quotation = await QuotationModel.findById(quoteId);
        if (!quotation) {
            return res.status(404).json({ message: 'Quotation not found' });
        }

        const materials = [];
        const cableLength = quotation.cableLength || 100;

        // Process cores - conductor and insulation materials
        if (quotation.cores && Array.isArray(quotation.cores)) {
            for (const core of quotation.cores) {
                // Conductor material
                if (core.selectedRod?._id) {
                    const wireDiameter = Math.sqrt((core.totalCoreArea / core.wireCount * 4) / Math.PI);
                    const drawingLength = calculateDrawingLength(core.wireCount, cableLength);
                    const conductorWeight = calculateMaterialWeight(
                        core.totalCoreArea,
                        drawingLength,
                        core.materialDensity || 8.96,
                        core.wastagePercent || 0
                    );

                    materials.push({
                        materialId: core.selectedRod._id,
                        materialName: core.selectedRod.name || 'Unknown Conductor',
                        materialTypeId: core.materialTypeId,
                        category: core.selectedRod.category || 'metal',
                        requiredWeight: parseFloat(conductorWeight.toFixed(4)),
                        purpose: 'conductor',
                        coreIndex: core.id || core.coreIndex
                    });
                }

                // Insulation - fresh material
                if (core.insulation?.materialId && core.insulation?.freshPercent > 0) {
                    const wireDiameter = Math.sqrt((core.totalCoreArea / core.wireCount * 4) / Math.PI);
                    const coreDiameter = calculateCoreDiameter(wireDiameter, core.wireCount);

                    const insulationCalc = calculateInsulation(
                        coreDiameter,
                        core.insulation.thickness || 0,
                        cableLength,
                        core.insulation.freshPercent || 0,
                        0, // Only calculate fresh here
                        core.insulation.density || 1.4,
                        core.insulation.density || 1.4
                    );

                    if (insulationCalc.freshWeight > 0) {
                        materials.push({
                            materialId: core.insulation.materialId,
                            materialName: core.insulation.material?.name || core.insulation.materialTypeName || 'Unknown Insulation',
                            materialTypeId: core.insulation.materialTypeId,
                            category: 'insulation',
                            requiredWeight: parseFloat(insulationCalc.freshWeight.toFixed(4)),
                            purpose: 'insulation-fresh',
                            coreIndex: core.id || core.coreIndex
                        });
                    }
                }

                // Insulation - reprocess material
                if (core.insulation?.reprocessPercent > 0) {
                    const reprocessMaterialId = core.insulation.reprocessMaterialId || core.insulation.materialId;
                    const reprocessMaterialName = core.insulation.reprocessMaterial?.name
                        || core.insulation.reprocessMaterialTypeName
                        || core.insulation.material?.name
                        || 'Unknown Reprocess';

                    const wireDiameter = Math.sqrt((core.totalCoreArea / core.wireCount * 4) / Math.PI);
                    const coreDiameter = calculateCoreDiameter(wireDiameter, core.wireCount);

                    const insulationCalc = calculateInsulation(
                        coreDiameter,
                        core.insulation.thickness || 0,
                        cableLength,
                        0, // Only calculate reprocess here
                        core.insulation.reprocessPercent || 0,
                        core.insulation.reprocessDensity || core.insulation.density || 1.4,
                        core.insulation.reprocessDensity || core.insulation.density || 1.4
                    );

                    if (insulationCalc.reprocessWeight > 0) {
                        materials.push({
                            materialId: reprocessMaterialId,
                            materialName: reprocessMaterialName,
                            materialTypeId: core.insulation.reprocessMaterialTypeId || core.insulation.materialTypeId,
                            category: 'insulation',
                            requiredWeight: parseFloat(insulationCalc.reprocessWeight.toFixed(4)),
                            purpose: 'insulation-reprocess',
                            coreIndex: core.id || core.coreIndex
                        });
                    }
                }
            }
        }

        // Process sheaths
        if (quotation.sheathGroups && Array.isArray(quotation.sheathGroups)) {
            for (const sheath of quotation.sheathGroups) {
                // Calculate inner diameter based on wrapped cores/sheaths
                // Simplified: use a default or fetch from stored calculations
                const innerDiameter = sheath.innerDiameter || 10; // Fallback

                // Fresh sheath material
                if (sheath.materialId && sheath.freshPercent > 0) {
                    const sheathCalc = calculateSheathWeight(
                        innerDiameter,
                        sheath.thickness || 1,
                        cableLength,
                        sheath.freshPercent || 0,
                        0, // Only fresh here
                        sheath.density || 1.4,
                        sheath.density || 1.4
                    );

                    if (sheathCalc.freshWeight > 0) {
                        materials.push({
                            materialId: sheath.materialId,
                            materialName: sheath.materialObject?.name || sheath.material || 'Unknown Sheath',
                            materialTypeId: sheath.materialTypeId,
                            category: 'plastic',
                            requiredWeight: parseFloat(sheathCalc.freshWeight.toFixed(4)),
                            purpose: 'sheath-fresh',
                            sheathIndex: sheath.id || sheath.sheathIndex
                        });
                    }
                }

                // Reprocess sheath material
                if (sheath.reprocessPercent > 0) {
                    const reprocessMaterialId = sheath.reprocessMaterialId || sheath.materialId;
                    const reprocessMaterialName = sheath.reprocessMaterialObject?.name
                        || sheath.reprocessMaterialTypeName
                        || sheath.material
                        || 'Unknown Reprocess';

                    const sheathCalc = calculateSheathWeight(
                        innerDiameter,
                        sheath.thickness || 1,
                        cableLength,
                        0, // Only reprocess here
                        sheath.reprocessPercent || 0,
                        sheath.reprocessDensity || sheath.density || 1.4,
                        sheath.reprocessDensity || sheath.density || 1.4
                    );

                    if (sheathCalc.reprocessWeight > 0) {
                        materials.push({
                            materialId: reprocessMaterialId,
                            materialName: reprocessMaterialName,
                            materialTypeId: sheath.reprocessMaterialTypeId || sheath.materialTypeId,
                            category: 'plastic',
                            requiredWeight: parseFloat(sheathCalc.reprocessWeight.toFixed(4)),
                            purpose: 'sheath-reprocess',
                            sheathIndex: sheath.id || sheath.sheathIndex
                        });
                    }
                }
            }
        }

        // Aggregate materials by materialId
        const aggregated = {};
        for (const mat of materials) {
            const key = mat.materialId;
            if (!aggregated[key]) {
                aggregated[key] = {
                    materialId: mat.materialId,
                    materialName: mat.materialName,
                    materialTypeId: mat.materialTypeId,
                    category: mat.category,
                    requiredWeight: 0,
                    purposes: []
                };
            }
            aggregated[key].requiredWeight += mat.requiredWeight;
            aggregated[key].purposes.push({
                purpose: mat.purpose,
                weight: mat.requiredWeight,
                coreIndex: mat.coreIndex,
                sheathIndex: mat.sheathIndex
            });
        }

        const aggregatedMaterials = Object.values(aggregated).map(mat => ({
            ...mat,
            requiredWeight: parseFloat(mat.requiredWeight.toFixed(4))
        }));

        res.status(200).json({
            quoteId: quotation._id,
            quoteNumber: quotation.quoteNumber,
            cableLength,
            materials: aggregatedMaterials
        });

    } catch (error) {
        console.error('Error calculating material requirements:', error);
        res.status(500).json({ message: error.message || 'Failed to calculate material requirements' });
    }
};
