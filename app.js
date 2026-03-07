import express from 'express'
import cors from 'cors'
import customerRoutes from "./routes/CustomerRoutes.js"
import supplierRoutes from "./routes/SupplierRoutes.js"
import rawMaterialTypeRoutes from "./routes/RawMaterialTypeRoutes.js"
import rawMaterialRoutes from "./routes/RawMaterialRoutes.js"
import rawMaterialLotRoutes from "./routes/RawMaterialLotRoutes.js"
import purchaseOrderRoutes from "./routes/PurchaseOrderRoutes.js"
import processRoutes from "./routes/ProcessRoutes.js"
import quotationRoutes from "./routes/QuotationRoutes.js"
import userRoutes from "./routes/UserRoutes.js"
import workOrderRoutes from "./routes/WorkOrderRoutes.js"
import locationRoutes from "./routes/LocationRoutes.js"
import materialAllocationRoutes from "./routes/MaterialAllocationRoutes.js"
import processTrackingRoutes from "./routes/ProcessTrackingRoutes.js"
import wipInventoryRoutes from "./routes/WIPInventoryRoutes.js"
import finishedGoodsRoutes from "./routes/FinishedGoodsRoutes.js"
import employeeRoutes from "./routes/EmployeeRoutes.js"
import intermediateProductRoutes from "./routes/IntermediateProductRoutes.js"
const app = express()

app.use(
    cors({
        origin: ["*", "http://localhost:5173", "https://ss-cables.vercel.app"], // allow all origins
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.use(express.json())

app.get('/', (req, res) => {
    res.send('Backend is running 🚀')
})

app.use("/api/customer", customerRoutes);
app.use("/api/supplier", supplierRoutes);
app.use("/api/material-type", rawMaterialTypeRoutes);
app.use("/api/raw-material", rawMaterialRoutes);
app.use("/api/material-lot", rawMaterialLotRoutes);
app.use("/api/purchase-order", purchaseOrderRoutes);
app.use("/api/process", processRoutes);
app.use("/api/quotation", quotationRoutes);
app.use("/api/user", userRoutes);
app.use("/api/work-order", workOrderRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/material-allocation", materialAllocationRoutes);
app.use("/api/process-tracking", processTrackingRoutes);
app.use("/api/wip-inventory", wipInventoryRoutes);
app.use("/api/finished-goods", finishedGoodsRoutes);
app.use("/api/employee", employeeRoutes);
app.use("/api/intermediate-product", intermediateProductRoutes);

export default app
