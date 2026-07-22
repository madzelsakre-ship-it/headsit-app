import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import { exporterExcel, exporterPDF } from '../controllers/exportController.js'
const r = Router()
r.use(protect)
r.get('/excel', exporterExcel)
r.get('/pdf', exporterPDF)
export default r
