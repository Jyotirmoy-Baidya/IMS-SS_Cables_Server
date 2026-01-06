import express from 'express'
import cors from 'cors'
import customerRoutes from "./routes/CustomerRoutes.js"
const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Backend is running 🚀')
})

app.use("/api/customers", customerRoutes);

export default app
