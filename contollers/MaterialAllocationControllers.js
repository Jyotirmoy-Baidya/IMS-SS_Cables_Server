import RawMaterialLot from '../models/RawMaterialLotModel.js';
import RawMaterial from '../models/RawMaterialModel.js';
import Process from '../models/ProcessModel.js';

// Check material availability for processes or direct material requirements
export const checkMaterialAvailability = async (req, res) => {
    try {
        const { processIds, cableLength, materialRequirements } = req.body;

        let materialsToCheck = [];

        // Mode 1: Process-based checking (existing functionality)
        if (processIds && Array.isArray(processIds) && processIds.length > 0) {
            // Fetch all processes with their input materials
            const processes = await Process.find({ _id: { $in: processIds } })
                .populate('inputMaterials', 'name category materialCode');

            // Collect unique material IDs
            const materialIds = new Set();
            processes.forEach(proc => {
                proc.inputMaterials?.forEach(mat => {
                    materialIds.add(mat._id.toString());
                });
            });

            materialsToCheck = Array.from(materialIds).map(id => ({ materialId: id, requiredWeight: 0 }));
        }

        // Mode 2: Direct material requirements (for quotations)
        if (materialRequirements && Array.isArray(materialRequirements) && materialRequirements.length > 0) {
            materialsToCheck = materialRequirements.map(req => ({
                materialId: req.materialId,
                requiredWeight: req.requiredWeight || 0
            }));
        }

        if (materialsToCheck.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Either processIds or materialRequirements array is required'
            });
        }

        // Get availability for each material
        const availability = [];

        for (const matReq of materialsToCheck) {
            const lots = await RawMaterialLot.find({
                materialId: matReq.materialId,
                isActive: true,
                isFullyConsumed: false,
            }).populate('materialId', 'name category');

            const totalRemaining = lots.reduce((sum, lot) => sum + (lot.remainingQuantity?.weight || 0), 0);
            const totalAllocated = lots.reduce((sum, lot) => sum + (lot.allocatedQuantity?.weight || 0), 0);
            const totalAvailable = totalRemaining - totalAllocated;

            const material = await RawMaterial.findById(matReq.materialId);

            availability.push({
                materialId: matReq.materialId,
                materialName: material?.name || 'Unknown',
                category: material?.category || '',
                requiredWeight: matReq.requiredWeight,
                totalRemaining,
                totalAllocated,
                totalAvailable,
                lotCount: lots.length,
                isAvailable: totalAvailable > 0,
                isSufficient: matReq.requiredWeight > 0 ? totalAvailable >= matReq.requiredWeight : totalAvailable > 0,
            });
        }

        res.json({
            success: true,
            data: {
                materialTypes: availability,
                allAvailable: availability.every(m => m.isAvailable),
                allSufficient: availability.every(m => m.isSufficient),
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Allocate materials for a work order (LIFO - Latest In First Out)
export const allocateMaterials = async (req, res) => {
    try {
        const { workOrderId, materialRequirements } = req.body;
        // materialRequirements: [{ materialId, requiredWeight }]

        if (!materialRequirements || !Array.isArray(materialRequirements)) {
            return res.status(400).json({ success: false, message: 'materialRequirements array is required' });
        }

        const allocations = [];

        for (const requirement of materialRequirements) {
            const { materialId, requiredWeight } = requirement;

            if (!requiredWeight || requiredWeight <= 0) continue;

            // Find all available lots for this material (LIFO - latest first)
            const lots = await RawMaterialLot.find({
                materialId: materialId,
                isActive: true,
                isFullyConsumed: false,
            })
                .sort({ purchaseDate: -1 }) // LIFO - latest purchases first
                .populate('materialId', 'name');

            let remainingToAllocate = requiredWeight;

            for (const lot of lots) {
                if (remainingToAllocate <= 0) break;

                const available = (lot.remainingQuantity?.weight || 0) - (lot.allocatedQuantity?.weight || 0);
                if (available <= 0) continue;

                const toAllocate = Math.min(available, remainingToAllocate);

                // Update lot allocation
                lot.allocatedQuantity.weight = (lot.allocatedQuantity?.weight || 0) + toAllocate;
                await lot.save();

                allocations.push({
                    materialLotId: lot._id,
                    materialTypeId: lot.materialId?._id,
                    materialName: lot.materialId?.name || '',
                    allocatedQuantity: toAllocate,
                    unit: 'kg',
                });

                remainingToAllocate -= toAllocate;
            }

            if (remainingToAllocate > 0) {
                // Not enough material available
                return res.status(400).json({
                    success: false,
                    message: `Insufficient material: ${remainingToAllocate}kg shortage for material ${materialId}`,
                });
            }
        }

        res.json({
            success: true,
            message: 'Materials allocated successfully',
            data: { allocations },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Deallocate materials (when work order is cancelled)
export const deallocateMaterials = async (req, res) => {
    try {
        const { allocations } = req.body;
        // allocations: [{ materialLotId, allocatedQuantity }]

        if (!allocations || !Array.isArray(allocations)) {
            return res.status(400).json({ success: false, message: 'allocations array is required' });
        }

        for (const allocation of allocations) {
            const lot = await RawMaterialLot.findById(allocation.materialLotId);
            if (!lot) continue;

            lot.allocatedQuantity.weight = Math.max(
                0,
                (lot.allocatedQuantity?.weight || 0) - allocation.allocatedQuantity
            );
            await lot.save();
        }

        res.json({ success: true, message: 'Materials deallocated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Convert allocated materials to used (when employee uses materials)
export const convertAllocationToUsage = async (req, res) => {
    try {
        const { materialLotId, quantityUsed } = req.body;

        const lot = await RawMaterialLot.findById(materialLotId);
        if (!lot) {
            return res.status(404).json({ success: false, message: 'Material lot not found' });
        }

        // Reduce allocated quantity
        lot.allocatedQuantity.weight = Math.max(0, (lot.allocatedQuantity?.weight || 0) - quantityUsed);

        // Reduce remaining quantity (actual consumption)
        lot.remainingQuantity.weight = Math.max(0, (lot.remainingQuantity?.weight || 0) - quantityUsed);

        await lot.save();

        res.json({ success: true, message: 'Material usage recorded', data: lot });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
