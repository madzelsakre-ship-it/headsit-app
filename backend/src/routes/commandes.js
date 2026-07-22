import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import { listerCommandes, creerCommande, changerStatut, assignerLivraison } from '../controllers/commandesController.js'
const r = Router()
r.use(protect)
r.get('/', listerCommandes)
r.post('/', creerCommande)
r.patch('/:id/statut', changerStatut)
r.patch('/:id/livraison', assignerLivraison)
export default r
