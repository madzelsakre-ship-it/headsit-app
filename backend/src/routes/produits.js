import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import { listerProduits, creerProduit, modifierProduit, supprimerProduit, alertesStock } from '../controllers/produitsController.js'
const r = Router()
r.use(protect)
r.get('/', listerProduits)
r.get('/alertes', alertesStock)
r.post('/', creerProduit)
r.put('/:id', modifierProduit)
r.delete('/:id', supprimerProduit)
export default r
