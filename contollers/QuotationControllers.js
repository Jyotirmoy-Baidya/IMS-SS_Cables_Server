import Quotation from '../models/QuotationModel.js';

export const createQuotation = async (req, res) => {
    try {
        const quotation = await Quotation.create(req.body);
        const populated = await quotation.populate('customerId', 'companyName address contacts');
        res.status(201).json({ success: true, message: 'Quotation created', data: populated });
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
            .populate('customerId', 'companyName address contacts');
        if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
        res.json({ success: true, data: quotation });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const updateQuotation = async (req, res) => {
    try {
        const quotation = await Quotation.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: false }
        ).populate('customerId', 'companyName address contacts');
        if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
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
        const quotation = await Quotation.findByIdAndDelete(req.params.id);
        if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
        res.json({ success: true, message: 'Quotation deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
