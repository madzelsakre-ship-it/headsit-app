import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import { demarrerLive, terminerLive, statsLive, liveActif, historiqueLives } from '../controllers/liveController.js'

const r = Router()
r.use(protect)
r.get('/actif', liveActif)
r.get('/historique', historiqueLives)
r.post('/demarrer', demarrerLive)
r.post('/:id/terminer', terminerLive)
r.get('/:id/stats', statsLive)
export default r
