import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import { getDashboard } from '../controllers/dashboardController.js'
const r = Router()
r.use(protect)
r.get('/', getDashboard)
export default r
