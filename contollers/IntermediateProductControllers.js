import IntermediateProduct from '../models/IntermediateProduct.js';

const addIntermediateProduct = async (req, res) => {
    try {
        const product = new IntermediateProduct(req.body);
        await product.save();
        res.status(201).json({ success: true, message: 'Intermediate product created', data: product });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const getAllIntermediateProducts = async (req, res) => {
    try {
        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.category) filter.category = req.query.category;

        const products = await IntermediateProduct.find(filter).sort({ category: 1, name: 1 });
        res.status(200).json({ success: true, data: products, count: products.length });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getOneIntermediateProduct = async (req, res) => {
    try {
        const product = await IntermediateProduct.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: 'Intermediate product not found' });
        res.status(200).json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateIntermediateProduct = async (req, res) => {
    try {
        const product = await IntermediateProduct.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!product) return res.status(404).json({ success: false, message: 'Intermediate product not found' });
        res.status(200).json({ success: true, message: 'Intermediate product updated', data: product });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const deleteIntermediateProduct = async (req, res) => {
    try {
        const product = await IntermediateProduct.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: 'Intermediate product not found' });
        res.status(200).json({ success: true, message: 'Intermediate product deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export {
    addIntermediateProduct,
    getAllIntermediateProducts,
    getOneIntermediateProduct,
    updateIntermediateProduct,
    deleteIntermediateProduct
};
