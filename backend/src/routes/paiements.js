import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import { initierPaiement, webhookCinetPay, webhookWave, verifierPaiement } from '../controllers/paiementController.js'
const r = Router()
// Webhooks — pas de protect (appelés par CinetPay/Wave)
r.post('/webhook/cinetpay', webhookCinetPay)
r.post('/webhook/wave', webhookWave)
// Routes protégées
r.use(protect)
r.post('/initier', initierPaiement)
r.get('/verifier/:transaction_id', verifierPaiement)
export default r
