import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
        },
        designation: {
            type: String,
            trim: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            lowercase: true,
            trim: true,
        },
        isPrimary: {
            type: Boolean,
            default: false,
        },
    },
    { _id: false }
);

const addressSchema = new mongoose.Schema(
    {
        line1: {
            type: String,
            required: true,
            trim: true,
        },
        line2: {
            type: String,
            trim: true,
        },
        city: {
            type: String,
            required: true,
            trim: true,
        },
        state: {
            type: String,
            required: true,
            trim: true,
        },
        country: {
            type: String,
            default: "India",
            trim: true,
        },
        pincode: {
            type: String,
            required: true,
            trim: true,
        },
    },
    { _id: false }
);

/* ---------------- Business Info Schema ---------------- */
const businessInfoSchema = new mongoose.Schema(
    {
        gst: { type: String, trim: true, uppercase: true },
        pan: { type: String, trim: true, uppercase: true },
        phone: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
        addressLine1: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        pincode: { type: String, trim: true },
        country: { type: String, default: "India" },
        sameAsShipping: { type: Boolean, default: false },
    },
    { _id: false }
);

const customerSchema = new mongoose.Schema(
    {
        companyName: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },

        avatarUrl: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
        },
        address: addressSchema,
        businessInfo: businessInfoSchema,
        contacts: {
            type: [contactSchema],
            default: [],
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        notes: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Customer", customerSchema);
